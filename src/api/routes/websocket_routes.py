"""
WebSocket endpoint para detecção de gestos em tempo real com Edge Computing.

Protocolo Padrão-Ouro:
  - Cliente envia: JSON com landmarks. Formato:
    [
      [{"x": 0.1, "y": 0.2, "z": 0.0}, ... (21 pontos)]
    ]
  - Servidor responde: JSON {"gesture": "A", "confidence": 0.92, "mode": "rules"}

Erros retornados como:
  {"gesture": null, "confidence": 0.0, "error": "mensagem"}
"""

import json
import traceback
import numpy as np
import cv2

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from src.api.app_state import state

router = APIRouter(tags=["WebSocket"])


class MockLandmark:
    """Wrapper leve que imita o objeto landmark do MediaPipe."""
    __slots__ = ("x", "y", "z")

    def __init__(self, x: float, y: float, z: float):
        self.x = x
        self.y = y
        self.z = z


@router.websocket("/ws/detect")
async def websocket_detect(websocket: WebSocket):
    await websocket.accept()
    print("[WS] Cliente conectado")

    try:
        timestamp = 0
        while True:
            message = await websocket.receive()

            if "bytes" in message:
                data = message["bytes"]
                try:
                    # Tenta decodificar o frame bruto. Usaremos 256x256x3 por padrao,
                    # mas se por acaso for JPEG, tentamos decodificar dinamicamente.
                    if len(data) == 256 * 256 * 3:
                        npimg = np.frombuffer(data, dtype=np.uint8).reshape((256, 256, 3))
                        bgr_frame = cv2.cvtColor(npimg, cv2.COLOR_RGB2BGR)
                    else:
                        # Se enviarem jpeg ou outro formato suportado por imdecode
                        npimg = np.frombuffer(data, np.uint8)
                        bgr_frame = cv2.imdecode(npimg, cv2.IMREAD_COLOR)
                        if bgr_frame is None:
                            raise ValueError(f"Falha ao decodificar imagem. Tamanho: {len(data)}")

                    with state.lock:
                        pipeline = state.pipeline
                        manager = state.detector_manager
                        current_mode = state.config["detection"].get("mode", "unknown")

                    if pipeline is None or manager is None:
                        await websocket.send_json({
                            "gesture": None,
                            "confidence": 0.0,
                            "landmarks": [],
                            "error": "Pipeline não inicializada."
                        })
                        continue

                    timestamp += 1
                    hands = pipeline.process_frame(bgr_frame, timestamp)

                    if not hands:
                        await websocket.send_json({
                            "gesture": None,
                            "confidence": 0.0,
                            "mode": current_mode,
                            "landmarks": []
                        })
                        continue

                    # Caso o modo ML não tenha detectores válidos
                    if not manager.detectors:
                         await websocket.send_json({
                            "gesture": None,
                            "confidence": 0.0,
                            "mode": current_mode,
                            "landmarks": [
                                [{"x": lm.x, "y": lm.y, "z": lm.z} for lm in hand]
                                for hand in hands
                            ],
                            "error": f"Nenhum detector carregado (modo: {current_mode})."
                        })
                         continue
                    
                    label, score = manager.detect(hands)

                    await websocket.send_json({
                        "gesture": label,
                        "confidence": round(float(score), 4) if score else 0.0,
                        "mode": current_mode,
                        "landmarks": [
                            [{"x": lm.x, "y": lm.y, "z": lm.z} for lm in hand]
                            for hand in hands
                        ]
                    })

                except Exception as e:
                    traceback.print_exc()
                    await websocket.send_json({
                        "gesture": None,
                        "confidence": 0.0,
                        "error": f"Erro no frame binário: {str(e)}"
                    })

            elif "text" in message:
                data = message["text"]
                try:
                    hands_data = json.loads(data)

                    if not isinstance(hands_data, list) or len(hands_data) == 0:
                        await websocket.send_json({
                            "gesture": None,
                            "confidence": 0.0,
                            "landmarks": [],
                            "error": "Formato inválido: esperado array de mãos não vazio.",
                        })
                        continue

                    hands = []
                    for hand_points in hands_data:
                        if not isinstance(hand_points, list) or len(hand_points) < 21:
                            await websocket.send_json({
                                "gesture": None,
                                "confidence": 0.0,
                                "landmarks": [],
                                "error": f"Mão com {len(hand_points)} pontos (mínimo 21).",
                            })
                            break
                        hand = [
                            MockLandmark(
                                float(lm.get("x", 0.0)),
                                float(lm.get("y", 0.0)),
                                float(lm.get("z", 0.0)),
                            )
                            for lm in hand_points
                        ]
                        hands.append(hand)
                    else:
                        pass # loop sem break

                    if not hands:
                        continue

                    with state.lock:
                        run_mode = state.run_mode
                        service = getattr(state, "collection_service", None)
                        manager = state.detector_manager
                        current_mode = state.config["detection"].get("mode", "unknown")
                    
                    if run_mode == "collect" and service:
                        res = service.collect_dynamic_frame(hands[0])
                        await websocket.send_json(res)
                        continue

                    if manager is None:
                        await websocket.send_json({
                            "gesture": None,
                            "confidence": 0.0,
                            "landmarks": hands_data,
                            "error": "Pipeline não inicializada.",
                        })
                        continue

                    if not manager.detectors:
                        await websocket.send_json({
                            "gesture": None,
                            "confidence": 0.0,
                            "mode": current_mode,
                            "landmarks": hands_data,
                            "error": f"Nenhum detector carregado para o modo '{current_mode}'."
                        })
                        continue

                    label, score = manager.detect(hands)
                    await websocket.send_json({
                        "gesture": label,
                        "confidence": round(float(score), 4) if score else 0.0,
                        "mode": current_mode,
                        "landmarks": hands_data,
                    })

                except json.JSONDecodeError:
                    await websocket.send_json({
                        "gesture": None,
                        "confidence": 0.0,
                        "landmarks": [],
                        "error": "JSON inválido recebido.",
                    })
                except Exception as e:
                    traceback.print_exc()
                    await websocket.send_json({
                        "gesture": None,
                        "confidence": 0.0,
                        "landmarks": [],
                        "error": f"Erro interno: {str(e)}",
                    })

    except WebSocketDisconnect:
        print("[WS] Cliente desconectou normalmente")
    except Exception as e:
        print(f"[WS] Erro inesperado na conexão: {e}")
        traceback.print_exc()
