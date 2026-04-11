from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import Optional

from src.api.app_state import state
from src.core.model_cache import ModelCache

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
    """Retorna configuração padrão do servidor (não reflete sessões individuais)."""
    return {
        "default_detection_mode": state.config["detection"].get("mode", "hybrid"),
        "detection": state.config["detection"],
        "info": "Cada sessão WebSocket possui seu próprio modo. Este é apenas o padrão."
    }

@router.post("/mode")
def set_mode(payload: ModePayload):
    """
    Altera o modo padrão de operação do servidor.
    NOTA: Isso NÃO afeta sessões WebSocket já conectadas.
    Novas conexões usarão este modo como padrão.
    """
    with state.lock:
        if payload.run_mode not in ("collect","train","inference"):
            raise HTTPException(400, "run_mode inválido")
        state.run_mode = payload.run_mode
        # Se entrar em inference, garante pipeline rodando
        if payload.run_mode == "inference":
            state.start_pipeline()
        return {
            "ok": True, 
            "run_mode": state.run_mode,
            "info": "Modo padrão alterado. Sessões ativas não foram afetadas."
        }

@router.post("/detection")
def set_detection(payload: DetectionPayload):
    """
    Altera o modo de detecção padrão e recarrega o cache de modelos.
    NOTA: Novas sessões WebSocket usarão este modo.
    Sessões já conectadas mantêm seu modo atual.
    """
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

        # Recarrega o cache de modelos com a nova configuração
        try:
            ModelCache.reload(state.config)
        except Exception as e:
            raise HTTPException(500, f"Falha ao recarregar modelos: {e}")

        return {
            "ok": True, 
            "detection": state.config["detection"],
            "info": "Cache de modelos recarregado. Novas sessões usarão esta configuração."
        }
    
@router.post("/train")
def train_background(background_tasks: BackgroundTasks):
    # valida se já existe dataset
    def background_train():
        import src.training.sequence_trainer as trainer
        trainer.main()   # ajuste seu trainer para aceitar paths/params
    background_tasks.add_task(background_train)
    return {"ok": True, "status": "training_started"}