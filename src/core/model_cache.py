# ==========================================================
# model_cache.py — Cache Global de Modelos ML
# ==========================================================
# Os modelos sao pesados. Este modulo os carrega UMA vez na
# memoria e compartilha entre todas as sessoes (read-only).
#
# Suporta dois formatos:
#   - .joblib (sklearn MLPClassifier — estatico + dinamico legado)
#   - .pt     (PyTorch GRU/LSTM — dinamico novo)
# ==========================================================

import threading
import logging
from pathlib import Path
import joblib

logger = logging.getLogger(__name__)


class ModelCache:
    """
    Singleton que mantem os modelos ML carregados em memoria.

    - static_models:  dict[name -> joblib_model]     (sklearn)
    - dynamic_models: dict[name -> loaded_model]      (torch ou joblib)
    """

    _lock = threading.Lock()
    _static_models: dict = {}
    _dynamic_models: dict = {}
    _dynamic_formats: dict = {}   # name -> "pt" | "joblib"
    _config = None
    _initialized = False

    @classmethod
    def initialize(cls, config):
        """Carrega todos os modelos na inicializacao do servidor."""
        with cls._lock:
            cls._config = config
            cls._load_static(config)
            cls._load_dynamic(config)
            cls._initialized = True
            logger.info("[ModelCache] Inicializado com %d estaticos, %d dinamicos",
                        len(cls._static_models), len(cls._dynamic_models))

    @classmethod
    def _load_static(cls, config):
        cls._static_models = {}
        model_dir = Path(config["ml"]["model_path"])
        if not model_dir.exists():
            logger.warning("[ModelCache] Pasta estatica nao encontrada: %s", model_dir)
            return
        for model_file in model_dir.glob("*.joblib"):
            logger.info("[ModelCache] Carregando modelo estatico: %s", model_file.name)
            cls._static_models[model_file.stem] = joblib.load(model_file)

    @classmethod
    def _load_dynamic(cls, config):
        cls._dynamic_models = {}
        cls._dynamic_formats = {}
        model_dir = Path(config["dynamic_ml"]["model_path"])
        if not model_dir.exists():
            logger.warning("[ModelCache] Pasta dinamica nao encontrada: %s", model_dir)
            return

        # Carrega modelos PyTorch (.pt) — prioridade sobre .joblib
        for model_file in model_dir.glob("*.pt"):
            import torch
            logger.info("[ModelCache] Carregando modelo dinamico (PyTorch GRU): %s", model_file.name)
            checkpoint = torch.load(model_file, map_location="cpu", weights_only=False)
            cls._dynamic_models[model_file.stem] = checkpoint
            cls._dynamic_formats[model_file.stem] = "pt"

        # Carrega modelos sklearn (.joblib) — apenas se nao houver .pt com mesmo nome
        for model_file in model_dir.glob("*.joblib"):
            if model_file.stem not in cls._dynamic_models:
                logger.info("[ModelCache] Carregando modelo dinamico (sklearn MLP legado): %s", model_file.name)
                cls._dynamic_models[model_file.stem] = joblib.load(model_file)
                cls._dynamic_formats[model_file.stem] = "joblib"

    @classmethod
    def reload(cls, config=None):
        """Recarrega todos os modelos (chamado apos /train/activate)."""
        cfg = config or cls._config
        if cfg is None:
            logger.error("[ModelCache] Nao e possivel recarregar sem config")
            return
        logger.info("[ModelCache] Recarregando modelos...")
        cls.initialize(cfg)

    @classmethod
    def get_static_models(cls) -> dict:
        """Retorna dict[name -> loaded_model] dos modelos estaticos."""
        return dict(cls._static_models)

    @classmethod
    def get_dynamic_models(cls) -> dict:
        """Retorna dict[name -> loaded_model] dos modelos dinamicos."""
        return dict(cls._dynamic_models)

    @classmethod
    def get_dynamic_format(cls, name: str) -> str:
        """Retorna o formato do modelo dinamico ('pt' ou 'joblib')."""
        return cls._dynamic_formats.get(name, "joblib")

    @classmethod
    def get_config(cls):
        return cls._config
