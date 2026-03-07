import cv2

from src.vision.pipeline import HandPipeline
from detectors import RuleADetector, RuleBDetector, RuleCDetector, RuleDDetector, RuleEDetector
from recognition.detector_manager import DetectorManager


DETECTORS = [
    RuleADetector(),
    RuleBDetector(),
    RuleCDetector(),
    RuleDDetector(),
    RuleEDetector(),
]


def main():
    cap = cv2.VideoCapture(0)

    if not cap.isOpened():
        raise RuntimeError("Erro ao abrir webcam")

    detector_manager = DetectorManager(DETECTORS)

    with HandPipeline(
        model_path="hand_landmarker.task",
        num_hands=1
    ) as pipeline:

        ts = 0

        while True:
            ret, frame = cap.read()
            if not ret:
                break

            frame = cv2.flip(frame, 1)

            hands = pipeline.process_frame(frame, ts)
            ts += 1

            h, w, _ = frame.shape

            for hand in hands:

                # desenhar landmarks
                for lm in hand:
                    cx, cy = int(lm.x * w), int(lm.y * h)
                    cv2.circle(frame, (cx, cy), 4, (0,255,0), -1)

                # ===== DETECÇÃO CENTRALIZADA =====
                label, score = detector_manager.detect(hand)

                if label:
                    cv2.putText(
                        frame,
                        f"{label} ({score:.2f})",
                        (10,100),
                        cv2.FONT_HERSHEY_SIMPLEX,
                        1.2,
                        (255,0,0),
                        3
                    )

            cv2.imshow("Li-Vision", frame)

            if cv2.waitKey(1) & 0xFF == 27:
                break

    cap.release()
    cv2.destroyAllWindows()


if __name__ == "__main__":
    main()