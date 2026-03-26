import traceback

from fastapi import APIRouter, UploadFile, File

from src.api.app_state import state
from src.services.detection_service import DetectionService

router = APIRouter(prefix="/detect", tags=["Detection"])

# DetectionService é recriado a cada request para usar os detectores atuais
# Isso garante que mudanças de modo via /admin/detection sejam refletidas

@router.post("/")
async def detect(file: UploadFile = File(...)):

    try:
        contents = await file.read()

        with state.lock:
            pipeline = state.pipeline
            manager = state.detector_manager

        if pipeline is None or manager is None:
            return {"error": "Pipeline not initialized", "gesture": None, "confidence": 0.0}

        service = DetectionService(pipeline, manager)
        label, score = service.detect(contents)

        return {
            "gesture": label,
            "confidence": score
        }

    except Exception as e:
        return {
            "error": str(e),
            "trace": traceback.format_exc()
        }