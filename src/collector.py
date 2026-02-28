import csv
import numpy as np
import cv2
from pipeline import HandPipeline

OUT_CSV = "data/collected/landmarks.csv"
LABEL = "C"  # exemplo: altere conforme tecla

def landmarks_to_vector(hand_landmarks):
    # retorna vetor 63 floats
    vec = []
    for lm in hand_landmarks:
        vec += [lm.x, lm.y, getattr(lm, "z", 0.0)]
    return vec

def main():
    cap = cv2.VideoCapture(0)
    with HandPipeline() as pipeline, open(OUT_CSV, "a", newline="") as f:
        writer = csv.writer(f)
        ts = 0
        print("Press SPACE to save a sample with label=C, ESC to exit")
        while True:
            ret, frame = cap.read()
            if not ret:
                break
            frame = cv2.flip(frame, 1)
            hands = pipeline.process_frame(frame, ts)
            ts += 1
            if hands:
                vec = landmarks_to_vector(hands[0])
                cv2.putText(frame, "Hand detected - press SPACE to save", (10,30), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0,255,0), 2)
            cv2.imshow("Collector", frame)
            k = cv2.waitKey(1)
            if k == 27:
                break
            if k == 32 and hands: # SPACE
                writer.writerow([LABEL] + vec)
                print("Saved sample")
    cap.release()
    cv2.destroyAllWindows()