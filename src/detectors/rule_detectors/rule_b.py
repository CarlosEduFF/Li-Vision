from .base_detector import BaseDetector

class RuleBDetector(BaseDetector):

    def detect(self, landmarks):

        extended = (
            landmarks[8].y < landmarks[6].y and
            landmarks[12].y < landmarks[10].y and
            landmarks[16].y < landmarks[14].y and
            landmarks[20].y < landmarks[18].y
        )

        thumb_folded = landmarks[4].x > landmarks[3].x

        is_b = extended and thumb_folded

        return ("B", 0.9) if is_b else (None, 0.0)