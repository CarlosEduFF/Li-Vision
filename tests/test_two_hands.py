"""
Suporte a duas mãos no vetor de features e na inferência.
"""
import sys
import types
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

_fake = types.ModuleType("src.core.supabase_client")
_fake.supabase = None
_fake.supabase_admin = None
sys.modules.setdefault("src.core.supabase_client", _fake)

from src.api.holistic import parse_input  # noqa: E402
from src.data_collection import holistic_features as hf  # noqa: E402


def _hand(x=0.5):
    return [{"x": x, "y": 0.5, "z": 0.0} for _ in range(21)]


def _pose():
    return [{"x": 0.4, "y": 0.6, "z": 0.0, "visibility": 0.9} for _ in range(33)]


def _face():
    return [{"x": 0.5, "y": 0.5, "z": 0.0} for _ in range(478)]


def test_duas_maos_ocupam_slots_distintos():
    frame = parse_input({"hands": [_hand(0.3), _hand(0.7)], "pose": _pose(), "face": _face()})
    vec = hf.build_frame_vector(frame, hf.SCHEMA_HOLISTIC_V1)

    # Cada mão ocupa 65 features; a 1a começa em 0, a 2a em 65.
    assert vec[0] == pytest.approx(0.3)
    assert vec[hf.HAND_FEATURES] == pytest.approx(0.7)


def test_uma_mao_zera_o_slot_da_segunda():
    frame = parse_input({"hands": [_hand(0.3)], "pose": _pose(), "face": _face()})
    vec = hf.build_frame_vector(frame, hf.SCHEMA_HOLISTIC_V1)

    slot2 = vec[hf.HAND_FEATURES: hf.HANDS_FEATURES]
    assert all(v == 0.0 for v in slot2)


def test_dimensao_e_a_mesma_com_uma_ou_duas_maos():
    """Dimensão fixa é o que permite treinar amostras de 1 e 2 mãos juntas."""
    uma = hf.build_frame_vector(
        parse_input({"hands": [_hand()], "pose": _pose(), "face": _face()}),
        hf.SCHEMA_HOLISTIC_V1,
    )
    duas = hf.build_frame_vector(
        parse_input({"hands": [_hand(0.3), _hand(0.7)], "pose": _pose(), "face": _face()}),
        hf.SCHEMA_HOLISTIC_V1,
    )
    assert len(uma) == len(duas) == hf.SCHEMA_FRAME_SIZE[hf.SCHEMA_HOLISTIC_V1]


def test_terceira_mao_e_ignorada():
    """MAX_HANDS=2: um terceiro par de mãos não pode deslocar o vetor."""
    frame = parse_input({"hands": [_hand(0.1), _hand(0.5), _hand(0.9)],
                         "pose": _pose(), "face": _face()})
    vec = hf.build_frame_vector(frame, hf.SCHEMA_HOLISTIC_V1)
    assert len(vec) == hf.SCHEMA_FRAME_SIZE[hf.SCHEMA_HOLISTIC_V1]
