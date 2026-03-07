from src.detectors.base_detector import BaseDetector

class RuleDDetector(BaseDetector):

    def detect(self, landmarks):

        index_up = landmarks[8].y < landmarks[6].y

        others_down = (
            landmarks[12].y > landmarks[10].y and
            landmarks[16].y > landmarks[14].y and
            landmarks[20].y > landmarks[18].y
        )

        is_d = index_up and others_down

        return ("D", 0.9) if is_d else (None, 0.0)