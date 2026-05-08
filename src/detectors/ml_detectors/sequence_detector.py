import numpy as np
import joblib
from collections import deque


class SequenceGestureDetector:

    def __init__(self, model_path, window_size, threshold):

        self.model = joblib.load(model_path)
        # Modelos antigos foram treinados com formatos diferentes por frame:
        # 63/126 = xyz relativo sem posicao absoluta; 42/84 = xy normalizado;
        # 65/130 = formato atual com pulso absoluto + xyz relativo.
        self.expected_features = getattr(self.model, "n_features_in_", 130 * window_size)
        self.features_per_frame = (
            self.expected_features // window_size
            if self.expected_features % window_size == 0
            else 130
        )
        self.window_size = window_size
        self.threshold = threshold
        self.buffer = deque(maxlen=self.window_size)

    def _hand_to_vector(self, hand, hand_size):
        if hand_size == 42:
            xs = [lm.x for lm in hand]
            ys = [lm.y for lm in hand]
            x_min, x_max = min(xs), max(xs)
            y_min, y_max = min(ys), max(ys)
            width = x_max - x_min
            height = y_max - y_min

            vec = []
            for lm in hand:
                rel_x = (lm.x - x_min) / width if width > 0 else 0.0
                rel_y = (lm.y - y_min) / height if height > 0 else 0.0
                vec.extend([rel_x, rel_y])
            return vec

        base_x = hand[0].x
        base_y = hand[0].y
        vec = []

        if hand_size == 65:
            vec.extend([base_x, base_y])

        for lm in hand:
            vec.append(lm.x - base_x)
            vec.append(lm.y - base_y)
            vec.append(getattr(lm, "z", 0.0))

        if len(vec) < hand_size:
            vec.extend([0.0] * (hand_size - len(vec)))
        return vec[:hand_size]

    def landmarks_to_vector(self, hands):

        if len(hands) > 0 and hasattr(hands[0], "__len__") and not hasattr(hands[0], "x"):
            hands_list = hands
        else:
            hands_list = [hands]

        if self.features_per_frame in (42, 63, 65):
            max_hands = 1
            hand_size = self.features_per_frame
        elif self.features_per_frame % 2 == 0 and self.features_per_frame // 2 in (42, 63, 65):
            max_hands = 2
            hand_size = self.features_per_frame // 2
        else:
            max_hands = 2
            hand_size = 65

        vec = []
        for i in range(max_hands):
            if i < len(hands_list):
                vec.extend(self._hand_to_vector(hands_list[i], hand_size))
            else:
                vec.extend([0.0] * hand_size)

        if len(vec) < self.features_per_frame:
            vec.extend([0.0] * (self.features_per_frame - len(vec)))

        return vec[:self.features_per_frame]

    def detect(self, hands):

        if not hands:
            self.buffer.clear()
            return None, 0.0

        vec = self.landmarks_to_vector(hands)
        self.buffer.append(vec)

        if len(self.buffer) < self.window_size:
            return None, 0.0

        sequence = np.array(self.buffer).flatten().reshape(1, -1)

        if sequence.shape[1] != self.expected_features:
            return None, 0.0

        probs = self.model.predict_proba(sequence)[0]
        idx = np.argmax(probs)
        score = probs[idx]

        if score < self.threshold:
            return None, 0.0

        label = self.model.classes_[idx]

        return label, score 
