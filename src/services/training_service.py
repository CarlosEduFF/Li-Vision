import logging
import os
import joblib
import numpy as np
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
            return {"status": "failed", "error": "Nenhum dataset valido encontrado."}

        static_ids = [d["id"] for d in ds_res.data if d["type"] == "static"]
        dynamic_ids = [d["id"] for d in ds_res.data if d["type"] == "dynamic"]

        job_ids = []
        reports = []

        if static_ids:
            res = self._train_static_submodel(static_ids, model_name)
            job_ids.append(res.get("job_id"))
            reports.append(res)
        
        if dynamic_ids:
            res = self._train_dynamic_submodel(dynamic_ids, model_name)
            job_ids.append(res.get("job_id"))
            reports.append(res)
            
        return {"status": "completed", "jobs": job_ids, "details": reports}

    # ================================================================
    # ESTATICO — MLPClassifier otimizado
    # ================================================================
    def _train_static_submodel(self, dataset_ids: list, model_name: str) -> dict:
        model_type = "static"
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
                raise ValueError(f"Amostras insuficientes para treinar modelo {model_type} (minimo 2).")

            df = pd.DataFrame(data)
            X = pd.DataFrame(df['features'].to_list())
            y = df['label']
            
            total_samples = len(df)
            n_classes = y.nunique()

            # ── MLP Otimizado ──────────────────────────────────────────
            # Camadas proporcionais ao numero de features e classes
            n_features = X.shape[1]
            layer1 = min(256, max(128, n_features))
            layer2 = max(64, layer1 // 2)
            layer3 = max(32, n_classes * 4)

            clf = MLPClassifier(
                hidden_layer_sizes=(layer1, layer2, layer3),
                activation='relu',
                solver='adam',
                max_iter=800,
                random_state=42,
                early_stopping=True,            # Para quando val_loss sobe
                validation_fraction=0.15,        # 15% para validacao
                n_iter_no_change=25,             # Paciencia
                alpha=0.001,                     # Regularizacao L2
                learning_rate='adaptive',        # Reduz LR quando estagna
                learning_rate_init=0.001,
                batch_size=min(64, max(16, total_samples // 4)),
            )
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

            logger.info("[Static] Modelo treinado: %s | Acc: %.2f%% | Samples: %d | Layers: %s",
                        model_name, acc * 100, total_samples, (layer1, layer2, layer3))

            return {"status": "completed", "accuracy": acc, "job_id": job_id, "type": model_type}
            
        except Exception as e:
            logger.error(f"Erro no treinamento de {model_type}: {e}")
            self._update_job(job_id, {"status": "failed", "error": str(e), "completed_at": "now()"})
            return {"status": "failed", "error": str(e), "job_id": job_id, "type": model_type}

    # ================================================================
    # DINAMICO — PyTorch GRU (LSTM-like)
    # ================================================================
    def _train_dynamic_submodel(self, dataset_ids: list, model_name: str) -> dict:
        import torch
        import torch.nn as nn
        from torch.utils.data import DataLoader, TensorDataset
        from src.detectors.ml_detectors.lstm_model import GestureLSTM

        model_type = "dynamic"
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
                raise ValueError(f"Amostras insuficientes para treinar modelo {model_type} (minimo 2).")

            df = pd.DataFrame(data)

            # ── Prepara labels ──────────────────────────────────────
            labels_unique = sorted(df['label'].unique().tolist())
            label_to_idx = {lbl: i for i, lbl in enumerate(labels_unique)}
            y_indices = df['label'].map(label_to_idx).values

            # ── Prepara features como sequencias 3D ─────────────────
            # Cada sample e um vetor flatten de (window_size * features_per_frame)
            features_list = df['features'].to_list()
            total_features = len(features_list[0])

            # Detecta features_per_frame e window_size.
            # Formatos historicos:
            # 130/65 = atual, com pulso absoluto + xyz relativo;
            # 126/63 = xyz relativo antigo; 84/42 = xy antigo.
            supported_frame_sizes = (130, 126, 65, 63, 84, 42)
            features_per_frame = None
            window_size = None

            for frame_size in supported_frame_sizes:
                candidate_window = total_features // frame_size
                if candidate_window > 0 and candidate_window * frame_size == total_features:
                    features_per_frame = frame_size
                    window_size = candidate_window
                    break

            if features_per_frame is None:
                raise ValueError(
                    f"Formato de features invalido: {total_features} total. "
                    f"Esperado multiplo de um destes tamanhos por frame: {supported_frame_sizes}."
                )

            if features_per_frame != 130:
                logger.warning("[Dynamic] Dataset no formato legado (%d features/frame). "
                               "Recomendado regravar com formato novo.", features_per_frame)

            logger.info("[Dynamic] Dados: %d amostras, %d classes, %d frames x %d features",
                        len(df), len(labels_unique), window_size, features_per_frame)

            # Reshape para 3D: (n_samples, window_size, features_per_frame)
            X_3d = np.array(features_list, dtype=np.float32).reshape(-1, window_size, features_per_frame)
            y_arr = np.array(y_indices, dtype=np.int64)

            # ── Modelo GRU ──────────────────────────────────────────
            num_classes = len(labels_unique)
            hidden_size = 128
            num_layers = 2
            dropout = 0.3
            bidirectional = True

            model = GestureLSTM(
                input_size=features_per_frame,
                hidden_size=hidden_size,
                num_layers=num_layers,
                num_classes=num_classes,
                dropout=dropout,
                bidirectional=bidirectional,
            )

            # ── Treinamento ─────────────────────────────────────────
            X_tensor = torch.from_numpy(X_3d)
            y_tensor = torch.from_numpy(y_arr)

            dataset_torch = TensorDataset(X_tensor, y_tensor)
            batch_size = min(32, max(4, len(df) // 4))
            loader = DataLoader(dataset_torch, batch_size=batch_size, shuffle=True)

            criterion = nn.CrossEntropyLoss()
            optimizer = torch.optim.Adam(model.parameters(), lr=0.001, weight_decay=1e-4)
            scheduler = torch.optim.lr_scheduler.ReduceLROnPlateau(
                optimizer, mode='min', factor=0.5, patience=15
            )

            # Training loop
            num_epochs = 300
            best_loss = float('inf')
            patience = 40
            patience_counter = 0
            best_state = None

            model.train()
            for epoch in range(num_epochs):
                total_loss = 0.0
                correct = 0
                total = 0

                for batch_X, batch_y in loader:
                    optimizer.zero_grad()
                    outputs = model(batch_X)
                    loss = criterion(outputs, batch_y)
                    loss.backward()
                    torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
                    optimizer.step()

                    total_loss += loss.item() * batch_X.size(0)
                    _, predicted = outputs.max(1)
                    correct += predicted.eq(batch_y).sum().item()
                    total += batch_y.size(0)

                avg_loss = total_loss / total
                acc_epoch = correct / total
                scheduler.step(avg_loss)

                # Early stopping
                if avg_loss < best_loss - 1e-4:
                    best_loss = avg_loss
                    patience_counter = 0
                    best_state = {k: v.clone() for k, v in model.state_dict().items()}
                else:
                    patience_counter += 1
                    if patience_counter >= patience:
                        logger.info("[Dynamic] Early stopping na epoch %d (loss: %.4f)", epoch, best_loss)
                        break

                if (epoch + 1) % 50 == 0:
                    logger.info("[Dynamic] Epoch %d/%d - Loss: %.4f - Acc: %.2f%%",
                                epoch + 1, num_epochs, avg_loss, acc_epoch * 100)

            # Restaura melhor estado
            if best_state:
                model.load_state_dict(best_state)

            # ── Avaliacao final ─────────────────────────────────────
            model.eval()
            with torch.no_grad():
                all_outputs = model(X_tensor)
                _, all_preds = all_outputs.max(1)
                all_preds_np = all_preds.numpy()

            y_true_labels = [labels_unique[i] for i in y_arr]
            y_pred_labels = [labels_unique[i] for i in all_preds_np]

            acc = accuracy_score(y_true_labels, y_pred_labels)
            report = classification_report(y_true_labels, y_pred_labels)

            # ── Salva modelo ────────────────────────────────────────
            os.makedirs("/tmp/models", exist_ok=True)
            local_path = f"/tmp/models/{model_name}_{model_type}.pt"

            checkpoint = {
                "model_state_dict": model.state_dict(),
                "classes": labels_unique,
                "input_size": features_per_frame,
                "hidden_size": hidden_size,
                "num_layers": num_layers,
                "bidirectional": bidirectional,
                "window_size": window_size,
            }
            torch.save(checkpoint, local_path)

            # Upload para Supabase Storage (.pt em vez de .joblib)
            storage_path = f"{model_type}/{model_name}_group.pt"
            with open(local_path, "rb") as f:
                try:
                    supabase.storage.from_("models").remove([storage_path])
                except:
                    pass
                # Remove eventual .joblib antigo tambem
                try:
                    supabase.storage.from_("models").remove([f"{model_type}/{model_name}_group.joblib"])
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
                "total_samples_trained": len(df),
                "updated_at": "now()"
            }).eq("id", model_id).execute()

            self._update_job(job_id, {
                "status": "completed",
                "accuracy": acc,
                "report": report,
                "completed_at": "now()"
            })

            logger.info("[Dynamic] GRU treinado: %s | Acc: %.2f%% | Samples: %d | Classes: %s",
                        model_name, acc * 100, len(df), labels_unique)

            return {"status": "completed", "accuracy": acc, "job_id": job_id, "type": model_type}
            
        except Exception as e:
            logger.error(f"Erro no treinamento de {model_type}: {e}", exc_info=True)
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

    def activate_model(self, model_id_or_name: str) -> dict:
        import yaml
        config_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "config.yaml")
        with open(config_path, "r") as f:
            config = yaml.safe_load(f)

        static_dir = config["ml"]["model_path"]
        dynamic_dir = config["dynamic_ml"]["model_path"]

        os.makedirs(static_dir, exist_ok=True)
        os.makedirs(dynamic_dir, exist_ok=True)

        try:
            # Tenta buscar por Nome (seguro contra caracteres especiais)
            mod_res = supabase.table("models").select("*").eq("name", model_id_or_name.upper()).execute()
            if not mod_res.data:
                # Tenta buscar por ID
                mod_res = supabase.table("models").select("*").eq("id", model_id_or_name).execute()

            if not mod_res.data:
                logger.error("[TrainingService] Modelo '%s' nao encontrado no banco de dados", model_id_or_name)
                return {"error": "Model not found"}

            actual_model_name = mod_res.data[0]["name"].upper()
            for model in mod_res.data:
                storage_path = model.get("storage_path")
                if not storage_path:
                    continue

                if model["type"] == "static":
                    target_path = os.path.join(static_dir, f"{actual_model_name}.joblib")
                else:
                    # Dinamico: extensao depende do formato (.pt para LSTM, .joblib para MLP antigo)
                    ext = ".pt" if storage_path.endswith(".pt") else ".joblib"
                    target_path = os.path.join(dynamic_dir, f"{actual_model_name}{ext}")
                    # Remove formato antigo se existir
                    old_ext = ".joblib" if ext == ".pt" else ".pt"
                    old_path = os.path.join(dynamic_dir, f"{actual_model_name}{old_ext}")
                    if os.path.exists(old_path):
                        os.remove(old_path)

                data = supabase.storage.from_("models").download(storage_path)
                with open(target_path, 'wb') as f:
                    f.write(data)

                logger.info("[TrainingService] Modelo '%s' (%s) salvo em: %s", actual_model_name, model["type"], target_path)

            return {"ok": True, "active_model": actual_model_name, "type": "hybrid"}
        except Exception as e:
            logger.error("[TrainingService] Falha ao ativar modelo '%s': %s", model_id_or_name, e)
            return {"ok": False, "error": str(e)}
