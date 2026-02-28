from abc import ABC, abstractmethod

class BaseDetector(ABC):
    """
    Interface para detectors. Implementações retornam (label, score)
    """
    @abstractmethod
    def detect(self, landmarks):
        # landmarks: lista/array de pontos normalizados (21 x 3)
        return None, 0.0