import logging
from typing import Optional, Dict, Any, List
from src.core.supabase_client import supabase, supabase_admin
from src.data_collection.static_collector import StaticCollector
from src.data_collection import holistic_features as hf
from src.api.holistic import HolisticFrame

logger = logging.getLogger(__name__)

class CollectionService:
    def __init__(self):
        self.static_collector = StaticCollector()
        self.dynamic_buffer = []
        self.dynamic_session: Optional[Dict[str, Any]] = None

    def _get_or_create_dataset(self, name: str, ds_type: str,
                               feature_schema: str = hf.DEFAULT_SCHEMA) -> str:
        name = name.upper()
        res = supabase.table("datasets").select("id").eq("name", name).execute()
        if len(res.data) > 0:
            return res.data[0]["id"]

        ins_res = supabase.table("datasets").insert({
            "name": name,
            "type": ds_type,
            "feature_schema": feature_schema,
        }).execute()
        return ins_res.data[0]["id"]

    def collect_static(self, label: str, hand, dataset_name: str, user_id: str = None) -> dict:
        try:
            dataset_name = dataset_name.upper()
            label = label.upper()
            dataset_id = self._get_or_create_dataset(dataset_name, "static")
            features = self.static_collector.landmarks_to_features(hand)
            
            insert_data = {
                "dataset_id": dataset_id,
                "label": label,
                "features": features
            }
            if user_id:
                insert_data["user_id"] = user_id
                
            supabase.table("samples").insert(insert_data).execute()
            
            res = supabase.table("samples").select("id", count="exact").eq("dataset_id", dataset_id).eq("label", label).execute()
            count = res.count if hasattr(res, 'count') and res.count is not None else len(res.data)
            
            return {"ok": True, "sample_count": count}
        except Exception as e:
            logger.error(f"[collect_static] Erro: {str(e)}")
            return {"ok": False, "error": f"Backend Error: {str(e)}"}

    def collect_dynamic_start(self, label: str, dataset_name: str, user_id: str = None) -> dict:
        # O dataset é criado de forma preguiçosa no primeiro frame, quando o
        # feature_schema (hands_v1 vs holistic_v1) já pode ser detectado.
        self.dynamic_session = {
            "label": label.upper(),
            "dataset_name": dataset_name.upper(),
            "user_id": user_id,
            "dataset_id": None,
            "feature_schema": None,
        }
        self.dynamic_buffer = []
        return {"ok": True, "status": "started"}

    def collect_dynamic_frame(self, frame) -> dict:
        """
        Recebe um HolisticFrame (ou lista de mãos legada) e extrai features no
        mesmo formato consumido pelo SequenceGestureDetector, via módulo unificado.

        O feature_schema é decidido no primeiro frame: holistic_v1 se houver
        pose/face, caso contrário hands_v1 (130 features/frame). O dataset é
        criado com esse schema.
        """
        if not self.dynamic_session:
            return {"ok": False, "error": "No dynamic session active"}

        frame = frame if isinstance(frame, HolisticFrame) else HolisticFrame(hands=frame)

        # Decide o schema e cria o dataset no primeiro frame
        if self.dynamic_session["dataset_id"] is None:
            schema = hf.SCHEMA_HOLISTIC_V1 if frame.is_holistic else hf.SCHEMA_HANDS_V1
            self.dynamic_session["feature_schema"] = schema
            self.dynamic_session["dataset_id"] = self._get_or_create_dataset(
                self.dynamic_session["dataset_name"], "dynamic", schema
            )

        schema = self.dynamic_session["feature_schema"]
        features = hf.build_frame_vector(frame, schema)
        self.dynamic_buffer.append(features)

        if len(self.dynamic_buffer) >= 15:
            return self.collect_dynamic_save()

        return {
            "ok": True,
            "collecting": True,
            "buffer": len(self.dynamic_buffer),
            "feature_schema": schema,
        }

    def collect_dynamic_save(self) -> dict:
        try:
            if not self.dynamic_session or len(self.dynamic_buffer) < 15:
                return {"ok": False, "error": "Incomplete buffer or no session"}
                
            dataset_id = self.dynamic_session["dataset_id"]
            label = self.dynamic_session["label"]
            user_id = self.dynamic_session.get("user_id")
            
            # Flatten the 15 frames into a single features array
            flattened_features = []
            for frame in self.dynamic_buffer:
                flattened_features.extend(frame)
                
            insert_data = {
                "dataset_id": dataset_id,
                "label": label,
                "features": flattened_features
            }
            if user_id:
                insert_data["user_id"] = user_id
                
            supabase.table("samples").insert(insert_data).execute()
            
            self.dynamic_buffer = []
            
            res = supabase.table("samples").select("id").eq("dataset_id", dataset_id).eq("label", label).execute()
            
            return {"ok": True, "sequences": len(res.data)}
        except Exception as e:
            logger.error(f"[collect_dynamic_save] Erro: {str(e)}")
            return {"ok": False, "error": f"Backend Error: {str(e)}"}

    def collect_dynamic_stop(self) -> dict:
        self.dynamic_session = None
        self.dynamic_buffer = []
        return {"ok": True, "status": "stopped"}

    def get_datasets(self) -> dict:
        res = supabase.table("datasets").select("id, name, type").execute()
        return {"datasets": res.data}

    def get_dataset_info(self, dataset_id: str) -> dict:
        ds_res = supabase.table("datasets").select("*").eq("id", dataset_id).execute()
        if len(ds_res.data) == 0:
            return {"error": "Dataset not found"}
            
        ds = ds_res.data[0]
        
        samples_res = supabase.table("samples").select("label").eq("dataset_id", dataset_id).execute()
        
        label_counts = {}
        for row in samples_res.data:
            lbl = row["label"]
            label_counts[lbl] = label_counts.get(lbl, 0) + 1
            
        ds["stats"] = label_counts
        ds["total_samples"] = len(samples_res.data)
        
        return ds

    def delete_dataset(self, dataset_id: str) -> dict:
        try:
            # Bloqueia a exclusão se houver modelos treinados vinculados a este
            # dataset — apagar o dataset quebraria a referência desses modelos.
            models_res = supabase.table("models").select("name").eq("dataset_id", dataset_id).execute()
            if models_res.data:
                model_names = ", ".join(m["name"] for m in models_res.data)
                return {
                    "ok": False,
                    "error": f"Não é possível excluir: existem modelos treinados vinculados a este dataset ({model_names}). Exclua ou retreine esses modelos antes.",
                }

            # Deleta samples primeiro (redundante com CASCADE, mas garante limpeza)
            supabase.table("samples").delete().eq("dataset_id", dataset_id).execute()
            # Depois deleta o dataset
            res = supabase.table("datasets").delete().eq("id", dataset_id).execute()
            logger.info("[delete_dataset] Dataset %s deletado. Resultado: %s", dataset_id, res.data)
            return {"ok": True}
        except Exception as e:
            logger.error("[delete_dataset] Erro: %s", str(e))
            return {"ok": False, "error": str(e)}

    def delete_label(self, dataset_id: str, label: str) -> dict:
        try:
            target_label = label.upper()
            logger.info("[delete_label] Deletando label='%s' do dataset='%s'", target_label, dataset_id)
            
            # Verifica quantas samples existem antes
            check = supabase.table("samples").select("id", count="exact").eq("dataset_id", dataset_id).eq("label", target_label).execute()
            count_before = check.count if hasattr(check, 'count') and check.count is not None else len(check.data)
            logger.info("[delete_label] Encontradas %d amostras para deletar", count_before)
            
            if count_before == 0:
                return {"ok": True, "deleted": 0, "message": "Nenhuma amostra encontrada para este gesto."}
            
            res = supabase.table("samples").delete().eq("dataset_id", dataset_id).eq("label", target_label).execute()
            deleted_count = len(res.data) if res.data else 0
            logger.info("[delete_label] Deletadas %d amostras", deleted_count)
            return {"ok": True, "deleted": deleted_count}
        except Exception as e:
            logger.error("[delete_label] Erro: %s", str(e))
            return {"ok": False, "error": str(e)}

    def rename_dataset(self, dataset_id: str, new_name: str) -> dict:
        try:
            supabase.table("datasets").update({"name": new_name.upper()}).eq("id", dataset_id).execute()
            return {"ok": True}
        except Exception as e:
            return {"ok": False, "error": str(e)}

    def rename_label(self, dataset_id: str, old_label: str, new_label: str) -> dict:
        try:
            supabase.table("samples").update({"label": new_label.upper()}).eq("dataset_id", dataset_id).eq("label", old_label.upper()).execute()
            return {"ok": True}
        except Exception as e:
            return {"ok": False, "error": str(e)}

    def get_ranking(self) -> dict:
        try:
            res = supabase.table("samples").select("user_id").execute()
            counts = {}
            for row in res.data:
                uid = row.get("user_id")
                if uid:
                    counts[uid] = counts.get(uid, 0) + 1
            
            if not counts:
                return {"ranking": []}
                
            uids = list(counts.keys())
            prof_res = supabase.table("profiles").select("id, full_name").in_("id", uids).execute()
            
            profiles = {p["id"]: p.get("full_name", "User") for p in prof_res.data}
            
            ranking = []
            for uid, count in counts.items():
                ranking.append({
                    "user_id": uid,
                    "name": profiles.get(uid, "Unknown User"),
                    "samples": count
                })
                
            ranking.sort(key=lambda x: x["samples"], reverse=True)
            return {"ranking": ranking}
        except Exception as e:
            return {"error": str(e)}