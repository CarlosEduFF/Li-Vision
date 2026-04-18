import logging
import os
import joblib
import pandas as pd
from typing import Optional, Dict
from sklearn.neural_network import MLPClassifier
from sklearn.metrics import accuracy_score, classification_report
from src.core.supabase_client import supabase

logger = logging.getLogger(__name__)

class TrainingService:
    def __init__(self):
        os.makedirs("/tmp/models", exist_ok=True)
        self.active_jobs = {}

    def _update_job(self, job_id: str, updates: dict):
        supabase.table("training_jobs").update(updates).eq("id", job_id).execute()

    def create_job(self, model_id: str, dataset_name: str) -> str:
        res = supabase.table("training_jobs").insert({
            "model_id": model_id,
            "status": "running",
            "dataset_name": dataset_name
        }).execute()
        return res.data[0]["id"]

    def train_model(self, dataset_ids: list, model_name: str) -> dict:
        model_name = model_name.upper()

        ds_res = supabase.table("datasets").select("id, name, type").in_("id", dataset_ids).execute()
        if len(ds_res.data) == 0:
            return {"status": "failed", "error": "Nenhum dataset válido encontrado."}

        static_ids = [d["id"] for d in ds_res.data if d["type"] == "static"]
        dynamic_ids = [d["id"] for d in ds_res.data if d["type"] == "dynamic"]

        job_ids = []
        reports = []

        if static_ids:
            res = self._train_submodel(static_ids, model_name, "static")
            job_ids.append(res.get("job_id"))
            reports.append(res)
        
        if dynamic_ids:
            res = self._train_submodel(dynamic_ids, model_name, "dynamic")
            job_ids.append(res.get("job_id"))
            reports.append(res)
            
        return {"status": "completed", "jobs": job_ids, "details": reports}

    def _train_submodel(self, dataset_ids: list, model_name: str, model_type: str) -> dict:
        dataset_name_grouped = f"{len(dataset_ids)} Datasets"
        
        mod_res = supabase.table("models").select("id").eq("name", model_name).eq("type", model_type).execute()
        
        if len(mod_res.data) > 0:
            model_id = mod_res.data[0]["id"]
        else:
            mod_ins = supabase.table("models").insert({
                "name": model_name,
                "type": model_type,
                "dataset_id": dataset_ids[0],
                "total_samples_trained": 0
            }).execute()
            model_id = mod_ins.data[0]["id"]

        job_id = self.create_job(model_id, dataset_name_grouped)
        
        try:
            samples_res = supabase.table("samples").select("label, features").in_("dataset_id", dataset_ids).execute()
            data = samples_res.data
            
            if len(data) < 2:
                raise ValueError(f"Amostras insuficientes para treinar modelo {model_type} (mínimo 2).")

            df = pd.DataFrame(data)
            X = pd.DataFrame(df['features'].to_list())
            y = df['label']
            
            total_samples = len(df)

            clf = MLPClassifier(hidden_layer_sizes=(128, 64), max_iter=500, random_state=42)
            clf.fit(X, y)
            
            y_pred = clf.predict(X)
            acc = accuracy_score(y, y_pred)
            report = classification_report(y, y_pred)

            os.makedirs("/tmp/models", exist_ok=True)
            local_path = f"/tmp/models/{model_name}_{model_type}.joblib"
            joblib.dump(clf, local_path)

            storage_path = f"{model_type}/{model_name}_group.joblib"
            with open(local_path, "rb") as f:
                try:
                    supabase.storage.from_("models").remove([storage_path])
                except:
                    pass

                supabase.storage.from_("models").upload(
                    path=storage_path,
                    file=f,
                    file_options={"content-type": "application/octet-stream"}
                )

            supabase.table("models").update({
                "storage_path": storage_path,
                "accuracy": acc,
                "classification_report": report,
                "total_samples_trained": total_samples,
                "updated_at": "now()"
            }).eq("id", model_id).execute()

            self._update_job(job_id, {
                "status": "completed",
                "accuracy": acc,
                "report": report,
                "completed_at": "now()"
            })

            return {"status": "completed", "accuracy": acc, "job_id": job_id, "type": model_type}
            
        except Exception as e:
            logger.error(f"Erro no treinamento de {model_type}: {e}")
            self._update_job(job_id, {"status": "failed", "error": str(e), "completed_at": "now()"})
            return {"status": "failed", "error": str(e), "job_id": job_id, "type": model_type}

    def get_job_status(self, job_id: str) -> dict:
        res = supabase.table("training_jobs").select("*").eq("id", job_id).execute()
        if len(res.data) == 0:
            return {"error": "Job not found"}
        return res.data[0]

    def list_models(self) -> dict:
        res = supabase.table("models").select("*").execute()
        grouped = {}
        for m in res.data:
            name = m["name"]
            if name not in grouped:
                grouped[name] = {
                    "id": name, 
                    "name": name,
                    "static_model": None,
                    "dynamic_model": None,
                    "total_samples": 0
                }
            if m["type"] == "static":
                grouped[name]["static_model"] = m
            else:
                grouped[name]["dynamic_model"] = m
            
            grouped[name]["total_samples"] += m.get("total_samples_trained", 0)

        return {"models": list(grouped.values())}

    def activate_model(self, model_name: str) -> dict:
        mod_res = supabase.table("models").select("*").eq("name", model_name).execute()
        if len(mod_res.data) == 0:
            return {"error": "Model not found"}
            
        local_dir = "c:/Users/carlo/Downloads/Li-Vision/src/models/"
        os.makedirs(os.path.join(local_dir, "static"), exist_ok=True)
        os.makedirs(os.path.join(local_dir, "dynamic"), exist_ok=True)
        
        try:
            for model in mod_res.data:
                storage_path = model.get("storage_path")
                if not storage_path:
                    continue

                target_path = os.path.join(local_dir, model["type"], "classifier.joblib")
                
                with open(target_path, 'wb+') as f:
                    data = supabase.storage.from_("models").download(storage_path)
                    f.write(data)
                    
            return {"ok": True, "active_model": model_name, "type": "hybrid"}
        except Exception as e:
            return {"ok": False, "error": str(e)}
