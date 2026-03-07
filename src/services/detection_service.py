import numpy as np
import cv2

class DetectionService:

    def __init__(self, pipeline, detector_manager):
        self.pipeline = pipeline
        self.manager = detector_manager

    def detect(self, image_bytes):

        npimg = np.frombuffer(image_bytes, np.uint8)
        if frame is None:
            raise ValueError("Image decode failed")
        frame = cv2.imdecode(npimg, cv2.IMREAD_COLOR)

        hands = self.pipeline.process_frame(frame, 0)

        label, score = self.manager.detect(hands)

        return label, score