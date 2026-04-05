from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(prefix="/train", tags=["Training"])

class TrainStartPayload(BaseModel):
    dataset_id: str
    model_name: str
    model_type: str

class ActivatePayload(BaseModel):
    model_id: str

def get_service():
    from src.api.app_state import state
    return state.training_service

@router.post("/start")
async def start_training(payload: TrainStartPayload):
    return get_service().train_model(payload.dataset_id, payload.model_name, payload.model_type)

@router.get("/status/{job_id}")
async def get_training_status(job_id: str):
    return get_service().get_job_status(job_id)

@router.get("/models")
async def list_models():
    return get_service().list_models()

@router.post("/activate")
async def activate_model(payload: ActivatePayload):
    from src.api.app_state import state
    res = get_service().activate_model(payload.model_id)
    if res.get("ok"):
        # Rebuild detectors globally
        state.build_detectors()
    return res
