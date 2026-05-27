# src/api/app_state.py
# ==========================================================
# Estado global do servidor Li-Vision.
#
# MULTI-TENANT: O estado per-user foi movido para UserSession.
# Este módulo mantém apenas recursos compartilhados:
#   - config:             configuração do servidor (padrões)
#   - pipeline:           HandPipeline do MediaPipe (compartilhado)
#   - collection_service: para rotas REST de coleta estática
#   - training_service:   para rotas REST de treinamento
#   - ModelCache:         inicializado aqui na startup
# ==========================================================

import threading
from src.core.config_loader import Config
from src.vision.pipeline import HandPipeline
from src.core.model_cache import ModelCache


class AppState:
    def __init__(self, config_path="config.yaml"):
        self.lock = threading.RLock()
        self.config_path = config_path
        self.config = Config(config_path)

        # modo padrão do servidor (usado como fallback quando o cliente não especifica)
        self.run_mode = self.config["app"].get("run_mode", "inference")

        # pipeline compartilhada (MediaPipe HandLandmarker)
        self.pipeline = None

        # serviços compartilhados (usados pelas rotas REST)
        from src.services.collection_service import CollectionService
        from src.services.training_service import TrainingService
        self.collection_service = CollectionService()
        self.training_service = TrainingService()

        # Inicializa o cache global de modelos ML
        ModelCache.initialize(self.config)

        # Inicializa o valor de rules_enabled do banco ou usa o do config.yaml como fallback
        self.rules_enabled = self.config["rules"].get("enabled", True)
        try:
            from src.core.supabase_client import supabase
            res = supabase.table("system_settings").select("value").eq("key", "rules_enabled").execute()
            if res.data:
                self.rules_enabled = res.data[0]["value"] == "true"
                self.config["rules"]["enabled"] = self.rules_enabled
        except Exception as e:
            import logging
            logging.getLogger(__name__).warning(f"[AppState] Erro ao carregar rules_enabled do banco, usando config.yaml: {e}")

    def set_rules_enabled(self, enabled: bool):
        """Habilita ou desabilita as regras lógicas globalmente."""
        with self.lock:
            self.rules_enabled = enabled
            self.config["rules"]["enabled"] = enabled
            try:
                from src.core.supabase_client import supabase
                supabase.table("system_settings").upsert({
                    "key": "rules_enabled",
                    "value": str(enabled).lower()
                }).execute()
            except Exception as e:
                import logging
                logging.getLogger(__name__).error(f"[AppState] Erro ao salvar rules_enabled no banco: {e}")

    def get_rules_enabled(self) -> bool:
        with self.lock:
            return self.rules_enabled

    def start_pipeline(self):
        """Cria e abre o HandPipeline (se não existir)."""
        with self.lock:
            if self.pipeline is not None:
                return
            model_path = self.config["pipeline"]["model_path"]
            num_hands = self.config["pipeline"]["num_hands"]
            self.pipeline = HandPipeline(model_path=model_path, num_hands=num_hands)
            self.pipeline.__enter__()  # abre globalmente (manter vivo)

    def stop_pipeline(self):
        """Fecha pipeline se aberto."""
        with self.lock:
            if self.pipeline is None:
                return
            try:
                self.pipeline.__exit__(None, None, None)
            finally:
                self.pipeline = None

    def reload_config_from_disk(self):
        """Recarrega config.yaml do disco e aplica (não salva alterações)."""
        with self.lock:
            self.config = Config(self.config_path)
            self.run_mode = self.config["app"].get("run_mode", self.run_mode)
            # Recarrega modelos com nova config
            ModelCache.reload(self.config)


state = AppState("config.yaml")