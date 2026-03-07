import numpy as np
import joblib
from collections import deque


class SequenceGestureDetector:

    def __init__(self, model_path, threshold):

        self.model = joblib.load(model_path)

        self.threshold = threshold
        self.buffer = deque(maxlen=self.window_size)

    def landmarks_to_vector(self, hand):

        base_x = hand[0].x
        base_y = hand[0].y

        vec = []

        for lm in hand:
            vec.append(lm.x - base_x)
            vec.append(lm.y - base_y)
            vec.append(getattr(lm, "z", 0.0))

        return vec

    def detect(self, hand):

        if not hand:
            self.buffer.clear()
            return None, 0.0

        vec = self.landmarks_to_vector(hand)
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