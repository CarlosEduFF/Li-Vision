import numpy as np
import joblib
from collections import deque


class SequenceGestureDetector:

    def __init__(self, model_path, window_size, threshold):

        self.model = joblib.load(model_path)
        # O Feature Size agora eh 130 por frame (65 * 2)
        expected_features = getattr(self.model, "n_features_in_", 130 * window_size)
        self.window_size = window_size
        self.threshold = threshold
        self.buffer = deque(maxlen=self.window_size)

    def landmarks_to_vector(self, hands):

        vec = []

        if len(hands) > 0 and hasattr(hands[0], "__len__") and not hasattr(hands[0], "x"):
            hands_list = hands
        else:
            hands_list = [hands]

        for i in range(2):
            if i < len(hands_list):
                hand = hands_list[i]
                base_x = hand[0].x
                base_y = hand[0].y

                # Track global placement to interpret temporal movement direction
                vec.append(base_x)
                vec.append(base_y)

                for lm in hand:
                    vec.append(lm.x - base_x)
                    vec.append(lm.y - base_y)
                    vec.append(getattr(lm, "z", 0.0))
            else:
                vec.extend([0.0] * 65)

        return vec

    def detect(self, hands):

        if not hands:
            self.buffer.clear()
            return None, 0.0

        vec = self.landmarks_to_vector(hands)
        self.buffer.append(vec)

        if len(self.buffer) < self.window_size:
            return None, 0.0

        sequence = np.array(self.buffer).flatten().reshape(1, -1)

        probs = self.model.predict_proba(sequence)[0]
        idx = np.argmax(probs)
        score = probs[idx]

        if score < self.threshold:
            return None, 0.0

        label = self.model.classes_[idx]

        return label, score 