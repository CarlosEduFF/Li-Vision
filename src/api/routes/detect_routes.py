from fastapi import APIRouter, UploadFile, File

from src.api.dependencies import pipeline, detector_manager
from src.services.detection_service import DetectionService

router = APIRouter()

service = DetectionService(pipeline, detector_manager)

import traceback

@router.post("/detect")
async def detect(file: UploadFile = File(...)):

    try:
        contents = await file.read()
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