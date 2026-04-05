from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Dict, Any

class PointModel(BaseModel):
    x: float
    y: float
    z: float

class HandModel(BaseModel):
    landmark: List[PointModel]

class StaticPayload(BaseModel):
    label: str
    dataset_name: str
    landmarks: HandModel

class DynamicStartPayload(BaseModel):
    label: str
    dataset_name: str

router = APIRouter(prefix="/collect", tags=["Collection"])

def get_service():
    from src.api.app_state import state
    return state.collection_service

@router.post("/static")
async def collect_static(payload: StaticPayload):
    # Pass hand landmarks object correctly formatted
    return get_service().collect_static(payload.label, payload.landmarks, payload.dataset_name)

@router.post("/dynamic/start")
async def collect_dynamic_start(payload: DynamicStartPayload):
    from src.api.app_state import state
    # Change mode just to be sure
    state.run_mode = "collect"
    return get_service().collect_dynamic_start(payload.label, payload.dataset_name)

@router.post("/dynamic/stop")
async def collect_dynamic_stop():
    return get_service().collect_dynamic_stop()

@router.get("/datasets")
async def get_datasets():
    return get_service().get_datasets()

@router.get("/datasets/{dataset_id}/stats")
async def get_dataset_stats(dataset_id: str):
    return get_service().get_dataset_info(dataset_id)