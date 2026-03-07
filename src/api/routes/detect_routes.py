from fastapi import APIRouter, UploadFile, File

from src.api.dependencies import pipeline, detector_manager
from src.services.detection_service import DetectionService

router = APIRouter()

service = DetectionService(pipeline, detector_manager)

@router.post("/detect")
async def detect(file: UploadFile = File(...)):

    contents = await file.read()

    label, score = service.detect(contents)

    return {
        "gesture": label,
        "confidence": score
    }