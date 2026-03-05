import csv
import numpy as np
import cv2
from collections import deque

from src.pipeline import HandPipeline
from src.core.config_loader import Config

CONFIG_PATH = "config.yaml"
OUT_CSV = "src/data/collected/sequences.csv"

WINDOW_SIZE = 15


def landmarks_to_vector(hands):

    vec = []

    # garante que hands é lista de mãos
    if len(hands) > 0 and hasattr(hands[0], "__len__") and not hasattr(hands[0], "x"):
        hands_list = hands
    else:
        hands_list = [hands]

    for i in range(2):

        if i < len(hands_list):

            hand = hands_list[i]

            base_x = hand[0].x
            base_y = hand[0].y

            for lm in hand:
                vec.append(lm.x - base_x)
                vec.append(lm.y - base_y)
                vec.append(getattr(lm, "z", 0.0))

        else:
            vec.extend([0.0] * 63)

    return vec

def main(config):

    # ----------------------------
    # Palavra do gesto
    # ----------------------------
    label = input("Digite o nome do gesto (ex: OI): ").upper()

    config = Config(CONFIG_PATH)

    model_path = config["pipeline"]["model_path"]
    num_hands = config["pipeline"]["num_hands"]
    cam_index = config["app"]["camera_index"]

    cap = cv2.VideoCapture(cam_index)

    buffer = deque(maxlen=WINDOW_SIZE)

    sequence_count = 0
    recording = False

    with HandPipeline(
        model_path=model_path,
        num_hands=num_hands
    ) as pipeline, open(OUT_CSV, "a", newline="") as f:

        writer = csv.writer(f)

        ts = 0

        print("SPACE = iniciar gravação")
        print("ESC = sair")
        try:
            frame_count = 0
            FRAME_STEP = 2

            while True:

                ret, frame = cap.read()
                if not ret:
                    break

                frame_count += 1

                if frame_count % FRAME_STEP != 0:
                    continue

                frame = cv2.flip(frame, 1)

                hands = pipeline.process_frame(frame, ts)
                ts += 1

                if hands:

                    vec = landmarks_to_vector(hands)

                    if recording:

                        buffer.append(vec)

                        cv2.putText(
                            frame,
                            f"Gravando {label} {len(buffer)}/{WINDOW_SIZE}",
                            (10, 40),
                            cv2.FONT_HERSHEY_SIMPLEX,
                            0.8,
                            (0, 0, 255),
                            2
                        )

                        if len(buffer) == WINDOW_SIZE:

                            sequence = np.array(buffer).flatten()

                            writer.writerow([label] + sequence.tolist())

                            sequence_count += 1

                            print(f"Sequência {sequence_count} salva")

                            buffer.clear()
                            recording = False

                # ----------------------------
                # Informações na tela
                # ----------------------------

                cv2.putText(
                    frame,
                    f"Gesto: {label}",
                    (10, 80),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.9,
                    (255, 255, 0),
                    2
                )

                cv2.putText(
                    frame,
                    f"Sequencias: {sequence_count}",
                    (10, 120),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.9,
                    (0, 255, 255),
                    2
                )

                cv2.imshow("Sequence Collector", frame)

                key = cv2.waitKey(1) & 0xFF

                if key == 27:  # ESC
                    print("Encerrando coleta...")
                    break
                
                if key == 32 and not recording:  # SPACE
                    print("Gravando sequência...")
                    buffer.clear()
                    recording = True

            cap.release()
            cv2.destroyAllWindows()
            
        except KeyboardInterrupt:
            print("Coleta interrompida pelo usuário.")
            cap.release()
            cv2.destroyAllWindows()

if __name__ == "__main__":
    main()