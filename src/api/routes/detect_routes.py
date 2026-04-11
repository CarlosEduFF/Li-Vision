import traceback

from fastapi import APIRouter, UploadFile, File, Query

from src.api.app_state import state
from src.api.user_session import UserSession
from src.services.detection_service import DetectionService

router = APIRouter(prefix="/detect", tags=["Detection"])


@router.post("/")
async def detect(file: UploadFile = File(...), mode: str = Query(default=None)):
    """
    Detecta gestos em uma imagem enviada via upload.
    
    Query params:
      mode: modo de detecção (rules/ml/dynamic_ml/hybrid). Se não especificado, usa o padrão do config.
    """
    try:
        contents = await file.read()

        with state.lock:
            pipeline = state.pipeline

        if pipeline is None:
            return {"error": "Pipeline not initialized", "gesture": None, "confidence": 0.0}

        # Cria uma sessão temporária para este request
        session = UserSession(detection_mode=mode)

        if session.detector_manager is None:
            return {"error": "Detectores não inicializados", "gesture": None, "confidence": 0.0}

        service = DetectionService(pipeline, session.detector_manager)
        label, score = service.detect(contents)

        return {
            "gesture": label,
            "confidence": score,
            "mode": session.detection_mode
        }

    except Exception as e:
        return {
            "error": str(e),
            "trace": traceback.format_exc()
        }