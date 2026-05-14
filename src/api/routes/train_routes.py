from fastapi import APIRouter, BackgroundTasks
from pydantic import BaseModel
from src.core.model_cache import ModelCache
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/train", tags=["Training"])

class TrainStartPayload(BaseModel):
    dataset_ids: list[str]
    model_name: str

class ActivatePayload(BaseModel):
    model_id: str

def get_service():
    from src.api.app_state import state
    return state.training_service


def _run_training_in_background(dataset_ids: list, model_name: str):
    """
    Executa o treinamento em uma thread de background.
    Isso evita que a requisição HTTP expire no Render (timeout ~30s)
    enquanto um modelo GRU treina por vários minutos.
    """
    try:
        logger.info("[Train BG] Iniciando treinamento em background: %s", model_name)
        result = get_service().train_model(dataset_ids, model_name)
        logger.info("[Train BG] Treinamento concluido: %s -> %s", model_name, result.get("status"))
        
        if result.get("status") == "failed":
            get_service().report_fatal_error(model_name, result.get("error", "Erro desconhecido"), dataset_ids)
            
    except Exception as e:
        logger.error("[Train BG] Erro fatal no treinamento em background: %s", e, exc_info=True)
        get_service().report_fatal_error(model_name, f"Erro fatal do servidor: {str(e)}", dataset_ids)


@router.post("/start")
async def start_training(payload: TrainStartPayload, background_tasks: BackgroundTasks):
    """
    Inicia o treinamento em background e retorna imediatamente.
    O frontend deve fazer polling em /train/status/by-model/{model_name} para acompanhar.
    """
    model_name = payload.model_name.upper()

    # Valida datasets antes de agendar
    from src.core.supabase_client import supabase
    ds_res = supabase.table("datasets").select("id, name, type").in_("id", payload.dataset_ids).execute()
    if len(ds_res.data) == 0:
        return {"status": "failed", "error": "Nenhum dataset valido encontrado."}

    # Agenda treinamento em background (responde HTTP imediatamente)
    background_tasks.add_task(_run_training_in_background, payload.dataset_ids, payload.model_name)

    return {
        "status": "running",
        "model_name": model_name,
        "message": "Treinamento iniciado em background.",
    }


@router.get("/status/by-model/{model_name}")
async def get_training_status_by_model(model_name: str):
    """
    Retorna os jobs de treinamento mais recentes para um modelo.
    Util para polling apos iniciar treinamento em background.
    """
    from src.core.supabase_client import supabase
    model_name = model_name.upper()

    # Busca IDs dos modelos com esse nome
    mod_res = supabase.table("models").select("id, type").eq("name", model_name).execute()
    if not mod_res.data:
        return {"status": "pending", "jobs": []}

    model_ids = [m["id"] for m in mod_res.data]
    model_type_map = {m["id"]: m["type"] for m in mod_res.data}

    # Busca os jobs mais recentes de cada modelo
    jobs_res = (
        supabase.table("training_jobs")
        .select("*")
        .in_("model_id", model_ids)
        .order("created_at", desc=True)
        .limit(10)
        .execute()
    )

    if not jobs_res.data:
        return {"status": "pending", "jobs": []}

    # Pega o job mais recente de cada tipo (static/dynamic)
    latest_by_type = {}
    for job in jobs_res.data:
        mtype = model_type_map.get(job["model_id"], "unknown")
        if mtype not in latest_by_type:
            latest_by_type[mtype] = job

    jobs = []
    for mtype, job in latest_by_type.items():
        jobs.append({
            "job_id": job["id"],
            "type": mtype,
            "status": job["status"],
            "accuracy": job.get("accuracy"),
            "error": job.get("error"),
            "progress": job.get("progress", 0),
            "current_epoch": job.get("current_epoch", 0),
            "total_epochs": job.get("total_epochs", 0),
            "stage": job.get("stage", ""),
        })

    all_done = all(j["status"] in ("completed", "failed") for j in jobs)
    any_failed = any(j["status"] == "failed" for j in jobs)

    if all_done:
        overall = "failed" if any_failed else "completed"
        overall_progress = 100
    else:
        overall = "running"
        # Media ponderada do progresso dos sub-jobs
        progress_values = [j.get("progress", 0) or 0 for j in jobs]
        overall_progress = int(sum(progress_values) / len(progress_values)) if progress_values else 0

    return {"status": overall, "jobs": jobs, "progress": overall_progress}


@router.get("/status/{job_id}")
async def get_training_status(job_id: str):
    return get_service().get_job_status(job_id)


@router.get("/models")
async def list_models():
    return get_service().list_models()

@router.post("/activate")
async def activate_model(payload: ActivatePayload):
    res = get_service().activate_model(payload.model_id)
    if res.get("ok"):
        # Recarrega o cache global de modelos (novas sessões WS usarão o novo modelo)
        ModelCache.reload()
    return res
