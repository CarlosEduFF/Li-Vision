import logging

logger = logging.getLogger(__name__)

class StaticCollector:
    def __init__(self, target_samples: int = 1):
        self.target_samples = target_samples

    def landmarks_to_features(self, hand) -> list:
        """
        Converts mediapipe hand landmarks to a flattened list of 42 features
        (21 points x 2 relative coordinates).
        The coordinates are relative to the bounding box of the hand.
        """
        landmarks = hand.landmark if hasattr(hand, "landmark") else hand
        
        x_calc = []
        y_calc = []
        for landmark in landmarks:
            x_calc.append(landmark.x)
            y_calc.append(landmark.y)

        x_min, x_max = min(x_calc), max(x_calc)
        y_min, y_max = min(y_calc), max(y_calc)
        width, height = x_max - x_min, y_max - y_min

        features = []
        for landmark in landmarks:
            # relative x and y
            rel_x = (landmark.x - x_min) / width if width > 0 else 0
            rel_y = (landmark.y - y_min) / height if height > 0 else 0
            features.extend([rel_x, rel_y])

        return features
