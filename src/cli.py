import argparse
from pipeline import HandPipeline
from core.config_loader import Config
from recognition.detector_factory import create_detectors
from recognition.detector_manager import DetectorManager


import cv2


def run_app(config_path):

    config = Config(config_path)

    detectors = create_detectors(config)
    manager = DetectorManager(detectors)

    cap = cv2.VideoCapture(config["app"]["camera_index"])

    with HandPipeline(
        model_path=config["pipeline"]["model_path"],
        num_hands=config["pipeline"]["num_hands"],
    ) as pipeline:

        ts = 0

        while True:
            ret, frame = cap.read()
            if not ret:
                break

            frame = cv2.flip(frame, 1)

            hands = pipeline.process_frame(frame, ts)
            ts += 1

            label, score = manager.detect(hands)

            if label:
                cv2.putText(
                    frame,
                    f"{label} ({score:.2f})",
                    (10, 80),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    1.2,
                    (255, 0, 0),
                    3,
                )

            cv2.imshow(config["app"]["window_name"], frame)

            if cv2.waitKey(1) & 0xFF == 27:
                break

    cap.release()
    cv2.destroyAllWindows()


def main():
    parser = argparse.ArgumentParser(description="Li-Vision CLI")

    parser.add_argument(
        "--config",
        default="config.yaml",
        help="Arquivo de configuração",
    )

    args = parser.parse_args()

    run_app(args.config)


if __name__ == "__main__":
    main()
