from fastapi import APIRouter, HTTPException, BackgroundTasks, Depends
from pydantic import BaseModel
from typing import Optional

from src.api.app_state import state
from src.core.model_cache import ModelCache
from src.core.supabase_client import supabase
from src.api.routes.learning_routes import require_admin

class ModePayload(BaseModel):
    run_mode: str  # "collect" | "train" | "inference"

class DetectionPayload(BaseModel):
    mode: Optional[str] = None
    confidence_threshold: Optional[float] = None
    window_size: Optional[int] = None
    ml_model_path: Optional[str] = None
    dynamic_model_path: Optional[str] = None

class RulesPayload(BaseModel):
    enabled: bool

class ImportPayload(BaseModel):
    datasets: list
    samples: list

router = APIRouter(prefix="/admin", tags=["admin"])

@router.get("/state")
def get_state():
    """Retorna configuração padrão do servidor (não reflete sessões individuais)."""
    return {
        "default_detection_mode": state.config["detection"].get("mode", "hybrid"),
        "detection": state.config["detection"],
        "rules_enabled": state.rules_enabled,
        "info": "Cada sessão WebSocket possui seu próprio modo. Este é apenas o padrão."
    }

@router.post("/rules")
def set_rules(payload: RulesPayload, admin: dict = Depends(require_admin)):
    """
    Habilita ou desabilita as regras lógicas globalmente.
    Salva no banco de dados e atualiza o estado em memória.
    """
    with state.lock:
        state.set_rules_enabled(payload.enabled)
        return {
            "ok": True,
            "rules_enabled": state.rules_enabled
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

@router.get("/export-samples")
def export_samples():
    """Retorna todas as amostras do banco de dados para backup."""
    try:
        # Busca todas as amostras com label, features e timestamp
        res = supabase.table("samples").select("id, dataset_id, label, features, created_at").execute()
        
        # Busca também os nomes dos datasets para contextualizar o backup
        ds_res = supabase.table("datasets").select("id, name, type").execute()
        
        return {
            "ok": True,
            "samples_count": len(res.data),
            "datasets": ds_res.data,
            "samples": res.data
        }
    except Exception as e:
        raise HTTPException(500, f"Falha ao exportar dados: {e}")

@router.post("/import-samples")
def import_samples(payload: ImportPayload):
    """Importa amostras e datasets de um arquivo de backup."""
    try:
        # 1. Mapeia IDs antigos para novos IDs para manter integridade
        id_map = {}
        
        # 2. Restaura Datasets
        for ds in payload.datasets:
            old_id = ds["id"]
            # Tenta encontrar dataset existente com mesmo nome ou cria novo
            existing = supabase.table("datasets").select("id").eq("name", ds["name"]).execute()
            
            if existing.data:
                id_map[old_id] = existing.data[0]["id"]
            else:
                new_ds = supabase.table("datasets").insert({
                    "name": ds["name"],
                    "type": ds["type"]
                }).execute()
                id_map[old_id] = new_ds.data[0]["id"]

        # 3. Restaura Samples (em lotes de 100 para não estourar payload)
        total_imported = 0
        batch = []
        for s in payload.samples:
            new_dataset_id = id_map.get(s["dataset_id"])
            if not new_dataset_id:
                continue
                
            batch.append({
                "dataset_id": new_dataset_id,
                "label": s["label"],
                "features": s["features"]
            })
            
            if len(batch) >= 100:
                supabase.table("samples").insert(batch).execute()
                total_imported += len(batch)
                batch = []
        
        if batch:
            supabase.table("samples").insert(batch).execute()
            total_imported += len(batch)

        return {
            "ok": True,
            "message": f"Importação concluída com sucesso. {total_imported} amostras restauradas.",
            "datasets_processed": len(payload.datasets)
        }
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(500, f"Falha na importação: {str(e)}")