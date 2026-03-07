from src.detectors.base_detector import BaseDetector
import math

def distance(a, b):
    return math.hypot(a.x - b.x, a.y - b.y)

class RuleCDetector(BaseDetector):
    def __init__(self, min_ratio=0.25, max_ratio=0.55):
        self.min_ratio = min_ratio
        self.max_ratio = max_ratio

    def detect(self, landmarks):
        # landmarks: sequence with landmark objects (x,y,z)
        wrist = landmarks[0]
        thumb_tip = landmarks[4]
        index_tip = landmarks[8]
        middle_tip = landmarks[12]

        hand_size = distance(wrist, middle_tip)
        if hand_size == 0:
            return None, 0.0

        d_thumb_index = distance(thumb_tip, index_tip)
        ratio = d_thumb_index / hand_size

        curved_index = landmarks[8].y > landmarks[6].y
        curved_middle = landmarks[12].y > landmarks[10].y

        is_c = (self.min_ratio < ratio < self.max_ratio) and curved_index and curved_middle
        return ("C", float(is_c)) if is_c else (None, 0.0)