from abc import ABC, abstractmethod

class BaseDetector(ABC):
    """
    Interface base para todos os detectores.
    """

    @abstractmethod
    def detect(self, landmarks):
        """
        Retorna:
            (label, score)
        """
        pass