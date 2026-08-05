"""
Coleta estática: escolha do schema de features (hands_v1 vs holistic_v1).

O risco coberto aqui é misturar dimensões dentro do mesmo dataset — amostras
de 42 e de ~208 features juntas inviabilizam o treino.
"""
import sys
import types
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

# supabase_client valida env e resolve DNS no import; stub evita rede no teste.
_fake = types.ModuleType("src.core.supabase_client")
_fake.supabase = None
_fake.supabase_admin = None
sys.modules.setdefault("src.core.supabase_client", _fake)

from src.api.holistic import HolisticFrame, parse_input  # noqa: E402
from src.data_collection import holistic_features as hf  # noqa: E402
from src.services.collection_service import CollectionService  # noqa: E402


def _hand(n=21):
    return [{"x": 0.5, "y": 0.5, "z": 0.0} for _ in range(n)]


def _pose():
    return [{"x": 0.4, "y": 0.6, "z": 0.0, "visibility": 0.99} for _ in range(33)]


def _face():
    return [{"x": 0.5, "y": 0.5, "z": 0.0} for _ in range(478)]


class _ServiceUnderTest(CollectionService):
    """Isola a persistência: só queremos o vetor de features resultante."""

    def __init__(self, existing_schema=None):
        super().__init__()
        self._existing_schema = existing_schema
        self.created_with_schema = None
        self.saved_features = None

    def _get_or_create_dataset(self, name, ds_type, feature_schema=hf.DEFAULT_SCHEMA):
        self.created_with_schema = feature_schema
        return "ds-1"

    def _get_dataset_schema(self, dataset_id):
        return self._existing_schema

    def _persist(self, insert_data):
        self.saved_features = insert_data["features"]


def test_payload_holistico_gera_vetor_holistico():
    frame = parse_input({"hands": [_hand()], "pose": _pose(), "face": _face()})
    assert frame.is_holistic

    vec = hf.build_frame_vector(frame, hf.SCHEMA_HOLISTIC_V1)
    esperado = hf.HANDS_FEATURES + hf.POSE_FEATURES + hf.FACE_FEATURES
    assert len(vec) == esperado


def test_payload_legado_continua_com_42_features():
    frame = parse_input([_hand()])
    assert not frame.is_holistic

    from src.data_collection.static_collector import StaticCollector
    vec = StaticCollector().landmarks_to_features(frame.hands[0])
    assert len(vec) == 42


def test_visibility_da_pose_entra_no_vetor():
    """visibility é a 4a feature de cada ponto de pose; se sumir, vira zero."""
    frame = parse_input({"hands": [_hand()], "pose": _pose(), "face": _face()})
    vec = hf.build_frame_vector(frame, hf.SCHEMA_HOLISTIC_V1)

    pose_inicio = hf.HANDS_FEATURES
    visibilidades = vec[pose_inicio + 3: pose_inicio + hf.POSE_FEATURES: hf.POSE_PER_POINT]

    assert visibilidades, "nenhuma feature de visibility encontrada"
    assert all(v == pytest.approx(0.99) for v in visibilidades)


def test_dataset_hands_v1_existente_nao_recebe_amostra_holistica():
    """Dataset antigo continua em 42 features mesmo com payload holístico."""
    svc = _ServiceUnderTest(existing_schema=hf.SCHEMA_HANDS_V1)
    frame = parse_input({"hands": [_hand()], "pose": _pose(), "face": _face()})

    use_holistic = frame.is_holistic and svc._get_dataset_schema("ds-1") != hf.SCHEMA_HANDS_V1
    assert use_holistic is False


def test_dataset_novo_com_payload_holistico_nasce_holistico():
    svc = _ServiceUnderTest(existing_schema=None)
    frame = parse_input({"hands": [_hand()], "pose": _pose(), "face": _face()})

    use_holistic = frame.is_holistic and svc._get_dataset_schema("ds-1") != hf.SCHEMA_HANDS_V1
    assert use_holistic is True
