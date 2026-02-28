from .base import BaseDetector
import math


def distance(a, b):
    return math.hypot(a.x - b.x, a.y - b.y)


class RuleEDetector(BaseDetector):

    def detect(self, landmarks):

        wrist = landmarks[0]

        tips = [4, 8, 12, 16, 20]

        # média distância dedos → palma
        avg_dist = sum(distance(landmarks[t], wrist) for t in tips) / 5

        # mão pequena = dedos fechados
        is_e = avg_dist < 0.25

        return ("E", 0.85) if is_e else (None, 0.0)