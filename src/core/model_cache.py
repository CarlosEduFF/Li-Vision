# ==========================================================
# model_cache.py — Cache Global de Modelos ML
# ==========================================================
# Os modelos .joblib são pesados (~MBs). Este módulo os
# carrega UMA vez na memória e compartilha entre todas as
# sessões de usuário (read-only).
# ==========================================================

import threading
import logging
from pathlib import Path
import joblib

logger = logging.getLogger(__name__)


class ModelCache:
    """
    Singleton que mantém os modelos ML carregados em memória.

    - static_models:  dict[path_str -> joblib_model]
    - dynamic_models: dict[path_str -> joblib_model]
    - rule_letters:   list[str]  (quais letras de regra estão habilitadas)

    Cada UserSession cria seus próprios wrappers (MLDetector,
    SequenceGestureDetector) mas reutiliza os objetos joblib
    já carregados aqui, evitando duplicação de memória.
    """

    _lock = threading.Lock()
    _static_models: dict = {}       # path -> loaded joblib model
    _dynamic_models: dict = {}      # path -> loaded joblib model
    _config = None
    _initialized = False

    @classmethod
    def initialize(cls, config):
        """Carrega todos os modelos na inicialização do servidor."""
        with cls._lock:
            cls._config = config
            cls._load_static(config)
            cls._load_dynamic(config)
            cls._initialized = True
            logger.info("[ModelCache] Inicializado com %d estáticos, %d dinâmicos",
                        len(cls._static_models), len(cls._dynamic_models))

    @classmethod
    def _load_static(cls, config):
        cls._static_models = {}
        model_dir = Path(config["ml"]["model_path"])
        if not model_dir.exists():
            logger.warning("[ModelCache] Pasta estática não encontrada: %s", model_dir)
            return
        for model_file in model_dir.glob("*.joblib"):
            logger.info("[ModelCache] Carregando modelo estático: %s", model_file.name)
            cls._static_models[model_file.stem] = joblib.load(model_file)

    @classmethod
    def _load_dynamic(cls, config):
        cls._dynamic_models = {}
        model_dir = Path(config["dynamic_ml"]["model_path"])
        if not model_dir.exists():
            logger.warning("[ModelCache] Pasta dinâmica não encontrada: %s", model_dir)
            return
        for model_file in model_dir.glob("*.joblib"):
            logger.info("[ModelCache] Carregando modelo dinâmico: %s", model_file.name)
            cls._dynamic_models[model_file.stem] = joblib.load(model_file)

    @classmethod
    def reload(cls, config=None):
        """Recarrega todos os modelos (chamado após /train/activate)."""
        cfg = config or cls._config
        if cfg is None:
            logger.error("[ModelCache] Não é possível recarregar sem config")
            return
        logger.info("[ModelCache] Recarregando modelos...")
        cls.initialize(cfg)

    @classmethod
    def get_static_models(cls) -> dict:
        """Retorna dict[path -> loaded_model] dos modelos estáticos."""
        return dict(cls._static_models)

    @classmethod
    def get_dynamic_models(cls) -> dict:
        """Retorna dict[path -> loaded_model] dos modelos dinâmicos."""
        return dict(cls._dynamic_models)

    @classmethod
    def get_config(cls):
        return cls._config
