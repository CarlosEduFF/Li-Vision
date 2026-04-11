from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any
from src.api.routes.auth_routes import verify_token

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
async def collect_static(payload: StaticPayload, user: dict = Depends(verify_token)):
    # Here we can pass user_id into the collection step later
    return get_service().collect_static(payload.label, payload.landmarks, payload.dataset_name, user.get("user_id"))

@router.post("/dynamic/start")
async def collect_dynamic_start(payload: DynamicStartPayload, user: dict = Depends(verify_token)):
    return get_service().collect_dynamic_start(payload.label, payload.dataset_name, user.get("user_id"))

@router.post("/dynamic/stop")
async def collect_dynamic_stop():
    return get_service().collect_dynamic_stop()

@router.get("/datasets")
async def get_datasets():
    return get_service().get_datasets()

@router.get("/datasets/{dataset_id}/stats")
async def get_dataset_stats(dataset_id: str):
    return get_service().get_dataset_info(dataset_id)

@router.get("/ranking")
async def get_ranking():
    return get_service().get_ranking()

class RenameDatasetPayload(BaseModel):
    new_name: str

class RenameLabelPayload(BaseModel):
    new_label: str

def require_admin(user: dict = Depends(verify_token)):
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Permissão negada. Apenas admins podem realizar esta ação.")
    return user

@router.delete("/datasets/{dataset_id}")
async def delete_dataset(dataset_id: str, admin: dict = Depends(require_admin)):
    return get_service().delete_dataset(dataset_id)

@router.put("/datasets/{dataset_id}")
async def rename_dataset(dataset_id: str, payload: RenameDatasetPayload, admin: dict = Depends(require_admin)):
    return get_service().rename_dataset(dataset_id, payload.new_name)

@router.delete("/datasets/{dataset_id}/labels/{label}")
async def delete_label(dataset_id: str, label: str, admin: dict = Depends(require_admin)):
    return get_service().delete_label(dataset_id, label)

@router.put("/datasets/{dataset_id}/labels/{label}")
async def rename_label(dataset_id: str, label: str, payload: RenameLabelPayload, admin: dict = Depends(require_admin)):
    return get_service().rename_label(dataset_id, label, payload.new_label)