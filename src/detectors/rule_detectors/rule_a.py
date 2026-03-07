from src.detectors.base_detector import BaseDetector

class RuleADetector(BaseDetector):

    def detect(self, landmarks):

        # dedos dobrados (tip abaixo do pip)
        folded = (
            landmarks[8].y > landmarks[6].y and
            landmarks[12].y > landmarks[10].y and
            landmarks[16].y > landmarks[14].y and
            landmarks[20].y > landmarks[18].y
        )

        # polegar lateral (não cruzado)
        thumb_side = abs(landmarks[4].x - landmarks[3].x) > 0.02

        is_a = folded and thumb_side

        return ("A", 0.9) if is_a else (None, 0.0)