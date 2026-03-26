"""
WebSocket endpoint para detecção de gestos em tempo real.

Cada conexão WebSocket mantém seu próprio timestamp/contador,
mas usa o pipeline e detector_manager do estado global (state),
garantindo que mudanças de modo de detecção feitas via /admin/detection
sejam refletidas imediatamente nas conexões ativas.

Protocolo:
  - Cliente envia: string base64 do JPEG (texto puro, sem JSON)
  - Servidor responde: JSON {"gesture": "A", "confidence": 0.92}
  - Em caso de erro interno: JSON {"gesture": null, "confidence": 0.0, "error": "..."}
"""

import base64
import traceback

import numpy as np
import cv2

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from src.api.app_state import state

router = APIRouter(tags=["WebSocket"])


@router.websocket("/ws/detect")
async def websocket_detect(websocket: WebSocket):
    await websocket.accept()

    # Cada conexão tem seu próprio timestamp (necessário para o modo VIDEO do MediaPipe)
    timestamp = 0

    try:
        while True:
            # Recebe frame como base64 (texto)
            data = await websocket.receive_text()

            try:
                image_bytes = base64.b64decode(data)

                # Decodifica imagem
                npimg = np.frombuffer(image_bytes, np.uint8)
                frame = cv2.imdecode(npimg, cv2.IMREAD_COLOR)

                if frame is None:
                    await websocket.send_json({
                        "gesture": None,
                        "confidence": 0.0,
                        "error": "Image decode failed",
                    })
                    continue

                timestamp += 1

                # Usa pipeline e detector_manager do estado global
                # Assim, mudanças de modo via /admin/detection são refletidas
                with state.lock:
                    pipeline = state.pipeline
                    manager = state.detector_manager

                if pipeline is None or manager is None:
                    await websocket.send_json({
                        "gesture": None,
                        "confidence": 0.0,
                        "error": "Pipeline not initialized",
                    })
                    continue

                hands = pipeline.process_frame(frame, timestamp)
                label, score = manager.detect(hands)

                await websocket.send_json({
                    "gesture": label,
                    "confidence": round(score, 4) if score else 0.0,
                })

            except Exception as e:
                await websocket.send_json({
                    "gesture": None,
                    "confidence": 0.0,
                    "error": str(e),
                })

    except WebSocketDisconnect:
        print("[WS] Cliente desconectou")
    except Exception as e:
        print(f"[WS] Erro inesperado: {e}")
        traceback.print_exc()
