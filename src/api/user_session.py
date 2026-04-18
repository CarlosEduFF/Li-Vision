# ==========================================================
# user_session.py — Sessão Isolada por Conexão WebSocket
# ==========================================================
# Cada conexão WS cria uma UserSession com seu próprio
# DetectorManager (estado temporal isolado) e
# CollectionService (buffer de coleta isolado).
#
# Os modelos ML são reutilizados do ModelCache global.
# ==========================================================

import logging
from collections import deque

from src.core.model_cache import ModelCache
from src.recognition.detector_manager import DetectorManager
from src.detectors.ml_detectors.static_detector import MLDetector
from src.detectors.ml_detectors.sequence_detector import SequenceGestureDetector
from src.detectors.rule_detectors import (
    RuleADetector, RuleBDetector, RuleCDetector,
    RuleDDetector, RuleEDetector,
)
from src.services.collection_service import CollectionService

logger = logging.getLogger(__name__)

RULE_MAP = {
    "A": RuleADetector,
    "B": RuleBDetector,
    "C": RuleCDetector,
    "D": RuleDDetector,
    "E": RuleEDetector,
}


class UserSession:
    """
    Estado isolado por conexão WebSocket.

    Cada instância possui:
    - detection_mode:     modo de detecção (rules/ml/dynamic_ml/hybrid)
    - detector_manager:   DetectorManager próprio (history, cooldown isolados)
    - collection_service: CollectionService próprio (buffer dinâmico isolado)
    - collecting:         flag indicando se a sessão está em modo coleta
    """

    def __init__(self, detection_mode: str = None, active_model_name: str = None):
        config = ModelCache.get_config()

        if detection_mode is None:
            detection_mode = config["detection"].get("mode", "hybrid")

        self.detection_mode = detection_mode
        self.active_model_name = active_model_name
        self.collecting = False
        self.collection_service = CollectionService()
        self.detector_manager = None

        self._build_detectors(config)
        logger.info("[UserSession] Criada com modo '%s' (%d detectores) [Modelo Ativo: %s]",
                    self.detection_mode,
                    len(self.detector_manager.detectors) if self.detector_manager else 0,
                    self.active_model_name or "TODOS")

    def _build_detectors(self, config):
        detectors = []
        mode = self.detection_mode

        if mode == "hybrid":
            if config["dynamic_ml"]["enabled"]:
                detectors.extend(self._create_dynamic_detectors(config))
            if config["ml"]["enabled"]:
                detectors.extend(self._create_static_detectors(config))
            if config["rules"]["enabled"]:
                detectors.extend(self._create_rule_detectors(config))

        elif mode == "rules":
            if config["rules"]["enabled"]:
                detectors.extend(self._create_rule_detectors(config))

        elif mode == "ml":
            if config["ml"]["enabled"]:
                detectors.extend(self._create_static_detectors(config))

        elif mode == "dynamic_ml":
            if config["dynamic_ml"]["enabled"]:
                detectors.extend(self._create_dynamic_detectors(config))

        else:
            logger.warning("[UserSession] Modo desconhecido: %s, usando hybrid", mode)
            self.detection_mode = "hybrid"
            return self._build_detectors(config)

        self.detector_manager = DetectorManager(
            detectors,
            min_score=config["detection"].get("min_score", 0.6),
            stability_frames=config["detection"].get("stability_frames", 3),
            cooldown_frames=config["detection"].get("cooldown_frames", 10),
        )

    def _create_static_detectors(self, config) -> list:
        threshold = config["ml"]["confidence_threshold"]
        detectors = []
        for name, model in ModelCache.get_static_models().items():
            if self.active_model_name and name != self.active_model_name:
                continue

            det = MLDetector.__new__(MLDetector)
            from src.detectors.ml_detectors.static_detector import MLGestureDetector
            inner = MLGestureDetector.__new__(MLGestureDetector)
            inner.model = model
            det.model = inner
            det.threshold = threshold
            detectors.append(det)
        return detectors

    def _create_dynamic_detectors(self, config) -> list:
        threshold = config["dynamic_ml"]["confidence_threshold"]
        window_size = config["dynamic_ml"]["window_size"]
        detectors = []
        for name, model in ModelCache.get_dynamic_models().items():
            if self.active_model_name and name != self.active_model_name:
                continue

            det = SequenceGestureDetector.__new__(SequenceGestureDetector)
            det.model = model
            det.window_size = window_size
            det.threshold = threshold
            det.buffer = deque(maxlen=window_size)
            detectors.append(det)
        return detectors

    def _create_rule_detectors(self, config) -> list:
        """Cria detectores baseados em regras."""
        detectors = []
        letters = config["rules"]["letters"]
        for letter in letters:
            if letter in RULE_MAP:
                detectors.append(RULE_MAP[letter]())
            else:
                logger.warning("[UserSession] Detector de regra para '%s' não existe", letter)
        return detectors

    def set_mode(self, new_mode: str):
        """Troca o modo de detecção em tempo real para esta sessão."""
        config = ModelCache.get_config()
        self.detection_mode = new_mode
        self._build_detectors(config)
        logger.info("[UserSession] Modo alterado para '%s' (%d detectores)",
                    new_mode,
                    len(self.detector_manager.detectors) if self.detector_manager else 0)
