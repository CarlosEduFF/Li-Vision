class DetectorManager:
    """
    Orquestra múltiplos detectores.
    Decide qual resultado usar.
    """

    def __init__(self, detectors, min_score=0.6):
        self.detectors = detectors
        self.min_score = min_score

    def detect(self, landmarks):
        best_label = None
        best_score = 0.0

        for det in self.detectors:
            label, score = det.detect(landmarks)

            if label and score > best_score:
                best_label = label
                best_score = score

        if best_score >= self.min_score:
            return best_label, best_score

        return None, 0.0