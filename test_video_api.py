import cv2
import requests
import time

API_URL = "https://li-visionv2.onrender.com/detect"

cap = cv2.VideoCapture("video.mp4")

frame_count = 0

while True:

    ret, frame = cap.read()

    if not ret:
        break

    frame_count += 1

    # enviar apenas 1 frame a cada 5
    if frame_count % 5 != 0:
        continue

    # codificar imagem na memória
    _, buffer = cv2.imencode(".jpg", frame)

    files = {
        "file": ("frame.jpg", buffer.tobytes(), "image/jpeg")
    }

    try:
        r = requests.post(API_URL, files=files, timeout=10)

        print("Resposta:", r.json())

    except Exception as e:
        print("Erro:", e)

    time.sleep(0.3)

cap.release()