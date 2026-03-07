from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import Optional

from src.api.app_state import state

class ModePayload(BaseModel):
    run_mode: str  # "collect" | "train" | "inference"

class DetectionPayload(BaseModel):
    mode: str = None           # "rules" | "ml" | "dynamic_ml" | "hybrid"
    ml_model_path: str = None
    dynamic_model_path: str = None
    confidence_threshold: float = None
    window_size: int = None

router = APIRouter(prefix="/admin", tags=["admin"])

@router.get("/state")
def get_state():
    return {
        "run_mode": state.run_mode,
        "detection": state.config["detection"],
    }

@router.post("/mode")
def set_mode(payload: ModePayload):
    with state.lock:
        # validar
        if payload.run_mode not in ("collect","train","inference"):
            raise HTTPException(400, "run_mode inválido")
        # aplicar mudança simples
        state.set_run_mode(payload.run_mode)
        # se entrar em inference, garante pipeline e detectores rodando
        if payload.run_mode == "inference":
            state.start_pipeline()
            state.build_detectors()
        # se entrar em collect ou train talvez queira parar pipeline (opcional)
        else:
            state.stop_pipeline()
        return {"ok": True, "run_mode": state.run_mode}

@router.post("/detection")
def set_detection(payload: DetectionPayload):
    # aplica valores se fornecidos
    with state.lock:
        if payload.mode:
            state.config["detection"]["mode"] = payload.mode
        if payload.ml_model_path:
            state.config["ml"]["model_path"] = payload.ml_model_path
        if payload.dynamic_model_path:
            state.config["dynamic_ml"]["model_path"] = payload.dynamic_model_path
        if payload.confidence_threshold is not None:
            state.config["detection"]["confidence_threshold"] = payload.confidence_threshold
        if payload.window_size:
            state.config["dynamic_ml"]["window_size"] = payload.window_size

        # reconstruir detectores com nova configuração
        try:
            state.build_detectors()
        except Exception as e:
            raise HTTPException(500, f"Falha ao rebuild detectors: {e}")

        return {"ok": True, "detection": state.config["detection"]}
    
@router.post("/train")
def train_background(background_tasks: BackgroundTasks):
    # valida se já existe dataset
    def background_train():
        import src.training.sequence_trainer as trainer
        trainer.main()   # ajuste seu trainer para aceitar paths/params
    background_tasks.add_task(background_train)
    return {"ok": True, "status": "training_started"}