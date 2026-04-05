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
        # We store models temporarily in /tmp/models before uploading
        os.makedirs("/tmp/models", exist_ok=True)
        # We can poll or keep track of training jobs here
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

    def train_model(self, dataset_id: str, model_name: str, model_type: str) -> dict:
        dataset_name = ""
        model_name = model_name.upper()

        ds_res = supabase.table("datasets").select("name").eq("id", dataset_id).execute()
        if len(ds_res.data) > 0:
            dataset_name = ds_res.data[0]["name"].upper()

        # Step 1: Push model entry to supabase (with 0 total_samples for now)
        mod_res = supabase.table("models").insert({
            "name": model_name,
            "type": model_type,
            "dataset_id": dataset_id,
            "total_samples_trained": 0
        }).execute()
        model_id = mod_res.data[0]["id"]

        # Create job
        job_id = self.create_job(model_id, dataset_name)
        
        try:
            # Step 2: Fetch samples
            samples_res = supabase.table("samples").select("label, features").eq("dataset_id", dataset_id).execute()
            data = samples_res.data
            
            if len(data) < 2:
                raise ValueError("Not enough samples to train (min 2).")

            df = pd.DataFrame(data)
            X = pd.DataFrame(df['features'].to_list())
            y = df['label']
            
            total_samples = len(df)

            # Step 3: Train MLP
            clf = MLPClassifier(hidden_layer_sizes=(128, 64), max_iter=500, random_state=42)
            clf.fit(X, y)
            
            y_pred = clf.predict(X)
            acc = accuracy_score(y, y_pred)
            report = classification_report(y, y_pred)

            # Step 4: Save temp local Joblib
            local_path = f"/tmp/models/{model_name}.joblib"
            joblib.dump(clf, local_path)

            # Step 5: Upload to Supabase Storage Bucket ('models')
            storage_path = f"{model_type}/{model_name}_{dataset_id}.joblib"
            with open(local_path, "rb") as f:
                # remove existing if there's an overwrite issue
                res = supabase.storage.from_("models").list(model_type)
                for file_info in res:
                    if file_info["name"] == f"{model_name}_{dataset_id}.joblib":
                        supabase.storage.from_("models").remove([storage_path])

                supabase.storage.from_("models").upload(
                    path=storage_path,
                    file=f,
                    file_options={"content-type": "application/octet-stream"}
                )

            # Update Model metrics
            supabase.table("models").update({
                "storage_path": storage_path,
                "accuracy": acc,
                "classification_report": report,
                "total_samples_trained": total_samples,
                "updated_at": "now()"
            }).eq("id", model_id).execute()

            # Update training job
            self._update_job(job_id, {
                "status": "completed",
                "accuracy": acc,
                "report": report,
                "completed_at": "now()"
            })

            return {"status": "completed", "accuracy": acc, "job_id": job_id}
            
        except Exception as e:
            logger.error(f"Training error: {e}")
            self._update_job(job_id, {
                "status": "failed",
                "error": str(e),
                "completed_at": "now()"
            })
            return {"status": "failed", "error": str(e), "job_id": job_id}

    def get_job_status(self, job_id: str) -> dict:
        res = supabase.table("training_jobs").select("*").eq("id", job_id).execute()
        if len(res.data) == 0:
            return {"error": "Job not found"}
        return res.data[0]

    def list_models(self) -> dict:
        res = supabase.table("models").select("*").execute()
        return {"models": res.data}

    def activate_model(self, model_id: str) -> dict:
        mod_res = supabase.table("models").select("*").eq("id", model_id).execute()
        if len(mod_res.data) == 0:
            return {"error": "Model not found"}
            
        model = mod_res.data[0]
        storage_path = model["storage_path"]
        
        # Download from storage
        local_dir = "c:/Users/carlo/Downloads/Li-Vision/src/models/"
        os.makedirs(os.path.join(local_dir, "static"), exist_ok=True)
        os.makedirs(os.path.join(local_dir, "dynamic"), exist_ok=True)
        
        target_path = os.path.join(local_dir, model["type"], "classifier.joblib")
        
        try:
            with open(target_path, 'wb+') as f:
                data = supabase.storage.from_("models").download(storage_path)
                f.write(data)
                
            return {"ok": True, "active_model": model["name"], "type": model["type"]}
        except Exception as e:
            return {"ok": False, "error": str(e)}
