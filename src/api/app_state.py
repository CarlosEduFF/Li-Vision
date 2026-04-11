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