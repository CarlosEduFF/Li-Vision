"""
Estruturas de dados para entrada holística de Libras (mãos + corpo + rosto).

A v2 do protocolo aceita, além do array legado de mãos, um objeto com canais
opcionais `hands`, `pose` e `face`. Este módulo define os tipos internos
unificados usados por coleta, inferência e detecção.

Retrocompatibilidade: o caminho só-mãos continua válido — `HolisticFrame` com
`pose=None` e `face=None` se comporta exatamente como o array de mãos atual.
"""

from dataclasses import dataclass, field
from typing import List, Optional


class MockLandmark:
    """
    Wrapper leve que imita o objeto landmark do MediaPipe.

    `visibility` é usado pelos pontos de pose (0.0–1.0). Mãos e rosto deixam
    `visibility = None`.
    """
    __slots__ = ("x", "y", "z", "visibility")

    def __init__(self, x: float, y: float, z: float = 0.0, visibility: Optional[float] = None):
        self.x = x
        self.y = y
        self.z = z
        self.visibility = visibility


@dataclass
class HolisticFrame:
    """
    Um frame holístico unificado.

    - `hands`: 0..2 mãos, cada uma com 21 landmarks (formato legado).
    - `pose`:  landmarks de corpo (MediaPipe Pose, 33 pontos) ou None.
    - `face`:  landmarks de rosto (MediaPipe FaceLandmarker) ou None.
    """
    hands: List[List[MockLandmark]] = field(default_factory=list)
    pose: Optional[List[MockLandmark]] = None
    face: Optional[List[MockLandmark]] = None

    @property
    def has_pose(self) -> bool:
        return bool(self.pose)

    @property
    def has_face(self) -> bool:
        return bool(self.face)

    @property
    def is_holistic(self) -> bool:
        """True se algum canal além das mãos estiver presente."""
        return self.has_pose or self.has_face


def _landmarks_from_points(points, with_visibility: bool = False) -> List[MockLandmark]:
    """Converte uma lista de dicts {x,y,z[,visibility]} em MockLandmarks."""
    result = []
    for p in points:
        result.append(MockLandmark(
            float(p.get("x", 0.0)),
            float(p.get("y", 0.0)),
            float(p.get("z", 0.0)),
            float(p["visibility"]) if with_visibility and p.get("visibility") is not None else None,
        ))
    return result


def parse_input(parsed) -> HolisticFrame:
    """
    Normaliza o payload de landmarks recebido pelo WebSocket num HolisticFrame.

    Aceita dois formatos, detectados pela *forma* do payload:

    1. Legado (lista no topo): `[[{x,y,z}×21], ...]` → tratado como `hands`.
    2. Holístico (objeto no topo): `{"hands": [...], "pose": [...], "face": [...]}`.

    Levanta ValueError com mensagem amigável quando o formato é inválido ou
    alguma mão tem menos de 21 pontos (mantém o contrato de erro atual).
    """
    # ----- Formato holístico (objeto) -----
    if isinstance(parsed, dict):
        raw_hands = parsed.get("hands", []) or []
        raw_pose = parsed.get("pose")
        raw_face = parsed.get("face")

        hands = _parse_hands(raw_hands)
        pose = _landmarks_from_points(raw_pose, with_visibility=True) if raw_pose else None
        face = _landmarks_from_points(raw_face) if raw_face else None

        return HolisticFrame(hands=hands, pose=pose, face=face)

    # ----- Formato legado (lista de mãos) -----
    if isinstance(parsed, list):
        if len(parsed) == 0:
            raise ValueError("Formato inválido: esperado array de mãos não vazio.")
        return HolisticFrame(hands=_parse_hands(parsed))

    raise ValueError("Formato inválido: esperado array de mãos ou objeto holístico.")


def _parse_hands(hands_data) -> List[List[MockLandmark]]:
    """Converte o array de mãos, validando o mínimo de 21 pontos por mão."""
    if not isinstance(hands_data, list):
        raise ValueError("Campo 'hands' deve ser uma lista de mãos.")

    hands: List[List[MockLandmark]] = []
    for hand_points in hands_data:
        if not isinstance(hand_points, list) or len(hand_points) < 21:
            n = len(hand_points) if hasattr(hand_points, "__len__") else 0
            raise ValueError(f"Mão com {n} pontos (mínimo 21).")
        hands.append(_landmarks_from_points(hand_points))
    return hands
