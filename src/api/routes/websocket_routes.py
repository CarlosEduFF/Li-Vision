"""
WebSocket endpoint para detecção de gestos em tempo real com Edge Computing.
MULTI-TENANT: cada conexão possui sua própria UserSession isolada.

Protocolo:
  - Landmarks (inferência):
    Cliente envia: [[{"x": 0.1, "y": 0.2, "z": 0.0}, ... (21 pontos)]]
    Servidor responde: {"gesture": "A", "confidence": 0.92, "mode": "hybrid"}

  - Ações de controle (coleta / modo):
    Cliente envia: {"action": "set_mode", "mode": "hybrid"}
    Cliente envia: {"action": "start_collect", "label": "A", "dataset_name": "LIBRAS", "user_id": "..."}
    Cliente envia: {"action": "stop_collect"}

Erros retornados como:
  {"gesture": null, "confidence": 0.0, "error": "mensagem"}
"""

import json
import traceback
import numpy as np
import cv2

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from src.api.app_state import state
from src.api.user_session import UserSession
from src.api.holistic import MockLandmark, HolisticFrame, parse_input

router = APIRouter(tags=["WebSocket"])


async def handle_action(websocket: WebSocket, session: UserSession, payload: dict):
    """
    Processa mensagens de controle (actions) recebidas pelo WebSocket.
    Permite que cada sessão mude de modo ou inicie/pare coleta independentemente.
    """
    action = payload.get("action")

    # ---- Trocar modo de detecção ----
    if action == "set_mode":
        new_mode = payload.get("mode", "hybrid")
        use_rules = payload.get("use_rules") # Pode vir nulo
        session.set_mode(new_mode, use_rules=use_rules)
        await websocket.send_json({
            "ok": True,
            "action": "set_mode",
            "mode": session.detection_mode,
            "detectors": len(session.detector_manager.detectors) if session.detector_manager else 0,
        })

    # ---- Iniciar coleta dinâmica (por sessão) ----
    elif action == "start_collect":
        label = payload.get("label", "")
        dataset_name = payload.get("dataset_name", "")
        user_id = payload.get("user_id")
        if not label or not dataset_name:
            await websocket.send_json({"ok": False, "error": "label e dataset_name são obrigatórios"})
            return
        res = session.collection_service.collect_dynamic_start(label, dataset_name, user_id)
        session.collecting = True
        await websocket.send_json(res)

    # ---- Parar coleta dinâmica ----
    elif action == "stop_collect":
        res = session.collection_service.collect_dynamic_stop()
        session.collecting = False
        await websocket.send_json(res)

    else:
        await websocket.send_json({"ok": False, "error": f"Ação desconhecida: {action}"})


@router.websocket("/ws/detect")
async def websocket_detect(websocket: WebSocket):
    await websocket.accept()

    # Extrai modo de conexão do query param (ex: ws://host/ws/detect?mode=hybrid&model=LIBRAS_BR&use_rules=true)
    detection_mode = websocket.query_params.get("mode", None)
    active_model = websocket.query_params.get("model", None)
    use_rules_str = websocket.query_params.get("use_rules", "true").lower()
    use_rules = use_rules_str == "true"
    
    session = UserSession(detection_mode=detection_mode, active_model_name=active_model, use_rules=use_rules)

    print(f"[WS] Cliente conectado (modo: {session.detection_mode}, modelo: {active_model})")

    try:
        timestamp = 0
        while True:
            message = await websocket.receive()

            if "bytes" in message:
                data = message["bytes"]
                try:
                    # Decodifica frame de imagem binário
                    if len(data) == 256 * 256 * 3:
                        npimg = np.frombuffer(data, dtype=np.uint8).reshape((256, 256, 3))
                        bgr_frame = cv2.cvtColor(npimg, cv2.COLOR_RGB2BGR)
                    else:
                        npimg = np.frombuffer(data, np.uint8)
                        bgr_frame = cv2.imdecode(npimg, cv2.IMREAD_COLOR)
                        if bgr_frame is None:
                            raise ValueError(f"Falha ao decodificar imagem. Tamanho: {len(data)}")

                    # Pipeline compartilhada (read-only, thread-safe para process_frame)
                    with state.lock:
                        pipeline = state.pipeline

                    if pipeline is None:
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
                            "mode": session.detection_mode,
                            "landmarks": []
                        })
                        continue

                    manager = session.detector_manager
                    if not manager or not manager.detectors:
                         await websocket.send_json({
                            "gesture": None,
                            "confidence": 0.0,
                            "mode": session.detection_mode,
                            "landmarks": [
                                [{"x": lm.x, "y": lm.y, "z": lm.z} for lm in hand]
                                for hand in hands
                            ],
                            "error": f"Nenhum detector carregado (modo: {session.detection_mode})."
                        })
                         continue
                    
                    # Pipeline server-side só extrai mãos; envolve em HolisticFrame
                    label, score = manager.detect(HolisticFrame(hands=hands))

                    await websocket.send_json({
                        "gesture": label,
                        "confidence": round(float(score), 4) if score else 0.0,
                        "mode": session.detection_mode,
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
                    parsed = json.loads(data)

                    # ----- Mensagem de CONTROLE (tem campo "action") -----
                    if isinstance(parsed, dict) and "action" in parsed:
                        await handle_action(websocket, session, parsed)
                        continue

                    # ----- Mensagem de LANDMARKS (legado: array de mãos | v2: objeto holístico) -----
                    try:
                        frame = parse_input(parsed)
                    except ValueError as ve:
                        await websocket.send_json({
                            "gesture": None,
                            "confidence": 0.0,
                            "landmarks": [],
                            "error": str(ve),
                        })
                        continue

                    if not frame.hands:
                        # Sem mãos não há o que detectar (pose/face sozinhos não inferem sinal)
                        continue

                    # Echo dos landmarks de mão (mantém o contrato de resposta atual)
                    hands_echo = [
                        [{"x": lm.x, "y": lm.y, "z": lm.z} for lm in hand]
                        for hand in frame.hands
                    ]

                    # ----- COLETA DINÂMICA (se a sessão está coletando) -----
                    if session.collecting and session.collection_service.dynamic_session:
                        res = session.collection_service.collect_dynamic_frame(frame)
                        await websocket.send_json(res)
                        continue

                    # ----- INFERÊNCIA NORMAL -----
                    manager = session.detector_manager

                    if manager is None:
                        await websocket.send_json({
                            "gesture": None,
                            "confidence": 0.0,
                            "landmarks": hands_echo,
                            "error": "Detectores não inicializados.",
                        })
                        continue

                    if not manager.detectors:
                        await websocket.send_json({
                            "gesture": None,
                            "confidence": 0.0,
                            "mode": session.detection_mode,
                            "landmarks": hands_echo,
                            "error": f"Nenhum detector carregado para o modo '{session.detection_mode}'."
                        })
                        continue

                    label, score = manager.detect(frame)
                    await websocket.send_json({
                        "gesture": label,
                        "confidence": round(float(score), 4) if score else 0.0,
                        "mode": session.detection_mode,
                        "landmarks": hands_echo,
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
        print(f"[WS] Cliente desconectou (modo: {session.detection_mode})")
    except Exception as e:
        print(f"[WS] Erro inesperado na conexão: {e}")
        traceback.print_exc()
