"""
WebSocket endpoint para detecção de gestos em tempo real com Edge Computing.

Protocolo Padrão-Ouro (Opção B):
  - Cliente envia: JSON com landmarks. Formato:
    [
      [{"x": 0.1, "y": 0.2, "z": 0.0}, ... (21 pontos)]
    ]
  - Servidor responde: JSON {"gesture": "A", "confidence": 0.92}
"""

import json
import traceback

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from src.api.app_state import state

router = APIRouter(tags=["WebSocket"])

class MockLandmark:
    def __init__(self, x, y, z):
        self.x = x
        self.y = y
        self.z = z

@router.websocket("/ws/detect")
async def websocket_detect(websocket: WebSocket):
    await websocket.accept()

    try:
        while True:
            # Recebe o JSON cru
            data = await websocket.receive_text()

            try:
                hands_data = json.loads(data)
                
                hands = []
                # Formata JSON para mock de objetos MediaPipe compatíveis
                for hand_points in hands_data:
                    hand = [MockLandmark(lm.get('x', 0.0), lm.get('y', 0.0), lm.get('z', 0.0)) for lm in hand_points]
                    hands.append(hand)

                with state.lock:
                    manager = state.detector_manager

                if manager is None:
                    await websocket.send_json({
                        "gesture": None,
                        "confidence": 0.0,
                        "error": "Pipeline not initialized",
                    })
                    continue

                # Passa as mãos nativamente para o manager
                label, score = manager.detect(hands)

                await websocket.send_json({
                    "gesture": label,
                    "confidence": round(score, 4) if score else 0.0,
                })

            except json.JSONDecodeError:
                await websocket.send_json({
                    "gesture": None,
                    "confidence": 0.0,
                    "error": "Invalid format. Expected JSON Landmarks.",
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

