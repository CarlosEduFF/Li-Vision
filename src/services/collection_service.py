import numpy as np
import cv2
class CollectionService:

    def __init__(self, pipeline):
        self.pipeline = pipeline

    def process(self, image_bytes):

        npimg = np.frombuffer(image_bytes, np.uint8)
        frame = cv2.imdecode(npimg, cv2.IMREAD_COLOR)

        hands = self.pipeline.process_frame(frame, 0)

        if not hands:
            return None

        return hands