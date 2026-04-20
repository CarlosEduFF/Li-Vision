# ==========================================================
# user_session.py — Sessao Isolada por Conexao WebSocket
# ==========================================================
# Cada conexao WS cria uma UserSession com seu proprio
# DetectorManager (estado temporal isolado) e
# CollectionService (buffer de coleta isolado).
#
# Os modelos ML sao reutilizados do ModelCache global.
# Suporta modelos PyTorch (.pt) e sklearn (.joblib).
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
    Estado isolado por conexao WebSocket.

    Cada instancia possui:
    - detection_mode:     modo de deteccao (rules/ml/dynamic_ml/hybrid)
    - detector_manager:   DetectorManager proprio (history, cooldown isolados)
    - collection_service: CollectionService proprio (buffer dinamico isolado)
    - collecting:         flag indicando se a sessao esta em modo coleta
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
        all_models = ModelCache.get_static_models()

        # Filtra pelo modelo ativo
        if self.active_model_name and self.active_model_name in all_models:
            filtered = {self.active_model_name: all_models[self.active_model_name]}
        else:
            if self.active_model_name:
                logger.warning("[UserSession] Modelo estatico '%s' nao encontrado no cache. Carregando todos (%d).",
                               self.active_model_name, len(all_models))
            filtered = all_models

        detectors = []
        for name, model in filtered.items():
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
        all_models = ModelCache.get_dynamic_models()

        # Filtra pelo modelo ativo
        if self.active_model_name and self.active_model_name in all_models:
            filtered = {self.active_model_name: all_models[self.active_model_name]}
        else:
            if self.active_model_name:
                logger.warning("[UserSession] Modelo dinamico '%s' nao encontrado no cache. Carregando todos (%d).",
                               self.active_model_name, len(all_models))
            filtered = all_models

        detectors = []
        for name, model in filtered.items():
            fmt = ModelCache.get_dynamic_format(name)

            if fmt == "pt":
                # ── PyTorch GRU (novo) ──────────────────────────
                from src.detectors.ml_detectors.lstm_model import GestureLSTM, LSTMGestureDetector
                import torch

                checkpoint = model  # model_cache ja carregou o checkpoint dict
                classes = checkpoint["classes"]
                input_size = checkpoint.get("input_size", 130)
                hidden_size = checkpoint.get("hidden_size", 128)
                num_layers = checkpoint.get("num_layers", 2)
                bidirectional = checkpoint.get("bidirectional", True)
                ws = checkpoint.get("window_size", window_size)

                gru_model = GestureLSTM(
                    input_size=input_size,
                    hidden_size=hidden_size,
                    num_layers=num_layers,
                    num_classes=len(classes),
                    dropout=0.0,
                    bidirectional=bidirectional,
                )
                gru_model.load_state_dict(checkpoint["model_state_dict"])
                gru_model.eval()

                # Cria detector com o modelo ja carregado (sem reabrir arquivo)
                det = LSTMGestureDetector.__new__(LSTMGestureDetector)
                det.model = gru_model
                det.classes = classes
                det.input_size = input_size
                det.window_size = ws
                det.threshold = threshold
                det.buffer = deque(maxlen=ws)
                detectors.append(det)

                logger.info("[UserSession] Detector GRU criado: '%s' (%d classes, ws=%d)",
                            name, len(classes), ws)

            else:
                # ── sklearn MLP legado (.joblib) ────────────────
                det = SequenceGestureDetector.__new__(SequenceGestureDetector)
                det.model = model
                det.window_size = window_size
                det.threshold = threshold
                det.buffer = deque(maxlen=window_size)
                detectors.append(det)

                logger.info("[UserSession] Detector MLP legado criado: '%s'", name)

        return detectors

    def _create_rule_detectors(self, config) -> list:
        """Cria detectores baseados em regras."""
        detectors = []
        letters = config["rules"]["letters"]
        for letter in letters:
            if letter in RULE_MAP:
                detectors.append(RULE_MAP[letter]())
            else:
                logger.warning("[UserSession] Detector de regra para '%s' nao existe", letter)
        return detectors

    def set_mode(self, new_mode: str):
        """Troca o modo de deteccao em tempo real para esta sessao."""
        config = ModelCache.get_config()
        self.detection_mode = new_mode
        self._build_detectors(config)
        logger.info("[UserSession] Modo alterado para '%s' (%d detectores)",
                    new_mode,
                    len(self.detector_manager.detectors) if self.detector_manager else 0)
