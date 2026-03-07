from fastapi import APIRouter, UploadFile, File
from src.services import collection_service

router = APIRouter(prefix="/collect", tags=["Collection"])

@router.post("/")
async def collect(label: str, file: UploadFile = File(...)):

    contents = await file.read()

    result = collection_service.process(label, contents)

    return result