import numpy as np
import cv2

class DetectionService:

    def __init__(self, pipeline, detector_manager):
        self.pipeline = pipeline
        self.manager = detector_manager
        self.timestamp = 0   # contador para VIDEO mode

    def detect(self, image_bytes):

        npimg = np.frombuffer(image_bytes, np.uint8)

        frame = cv2.imdecode(npimg, cv2.IMREAD_COLOR)

        if frame is None:
            raise ValueError("Image decode failed")

        # incrementa timestamp a cada chamada
        self.timestamp += 1

        hands = self.pipeline.process_frame(
            frame,
            self.timestamp
        )

        label, score = self.manager.detect(hands)

        return label, score