"""
Inferência estática holística: o modelo treinado com mãos + pose + face
precisa receber o frame inteiro, não uma mão por vez.
"""
import sys
import types
from pathlib import Path

import numpy as np
import pytest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

_fake = types.ModuleType("src.core.supabase_client")
_fake.supabase = None
_fake.supabase_admin = None
sys.modules.setdefault("src.core.supabase_client", _fake)

from src.api.holistic import parse_input  # noqa: E402
from src.data_collection import holistic_features as hf  # noqa: E402

HOLISTIC_DIM = hf.HANDS_FEATURES + hf.POSE_FEATURES + hf.FACE_FEATURES


def _frame():
    return parse_input({
        "hands": [[{"x": 0.5, "y": 0.5, "z": 0.0} for _ in range(21)]],
        "pose": [{"x": 0.4, "y": 0.6, "z": 0.0, "visibility": 0.99} for _ in range(33)],
        "face": [{"x": 0.5, "y": 0.5, "z": 0.0} for _ in range(478)],
    })


class _StubModel:
    """Modelo mínimo com a interface que o detector usa."""

    def __init__(self, n_features_in):
        self.n_features_in_ = n_features_in
        self.classes_ = np.array(["A", "B"])

    def predict_proba(self, X):
        assert len(X[0]) == self.n_features_in_, (
            f"dimensão errada: recebeu {len(X[0])}, esperava {self.n_features_in_}"
        )
        return np.array([[0.1, 0.9]])


@pytest.fixture
def detector_cls():
    from src.detectors.ml_detectors.static_detector import MLDetector
    return MLDetector


def _build(detector_cls, n_features_in, threshold=0.7):
    det = object.__new__(detector_cls)
    det.model = types.SimpleNamespace(model=_StubModel(n_features_in))
    det.threshold = threshold
    return det


def test_modelo_holistico_declara_que_quer_o_frame(detector_cls):
    det = _build(detector_cls, HOLISTIC_DIM)
    assert det.expects_holistic_frame is True


def test_modelo_legado_nao_pede_frame_holistico(detector_cls):
    det = _build(detector_cls, 42)
    assert det.expects_holistic_frame is False


def test_modelo_holistico_prediz_a_partir_do_frame(detector_cls):
    det = _build(detector_cls, HOLISTIC_DIM)
    label, confidence = det.detect(_frame())

    assert label == "B"
    assert confidence == pytest.approx(0.9)


def test_confianca_abaixo_do_threshold_nao_retorna_label(detector_cls):
    det = _build(detector_cls, HOLISTIC_DIM, threshold=0.95)
    assert det.detect(_frame()) == (None, 0.0)


def test_manager_entrega_frame_inteiro_para_detector_holistico():
    """Sem isso o detector receberia uma mão e quebraria por dimensão."""
    from src.recognition.detector_manager import DetectorManager

    recebido = {}

    class _Det:
        expects_holistic_frame = True

        def detect(self, arg):
            recebido["tipo"] = type(arg).__name__
            return "A", 0.99

    mgr = object.__new__(DetectorManager)
    mgr.detectors = [_Det()]
    mgr.cooldown_counter = 0
    mgr.history = []
    mgr.last_label, mgr.last_score = None, 0.0

    frame = _frame()
    try:
        mgr.detect(frame)
    except Exception:
        pass  # estabilização/histórico não importam aqui

    assert recebido.get("tipo") == "HolisticFrame"
