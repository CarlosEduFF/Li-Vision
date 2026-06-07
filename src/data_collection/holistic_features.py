"""
Montagem unificada e versionada do vetor de features por frame.

Centraliza a lógica que antes estava duplicada entre
`CollectionService._dynamic_landmarks_to_vector` e
`SequenceGestureDetector.landmarks_to_vector`, garantindo que coleta e
inferência produzam exatamente o mesmo vetor.

Schemas de features
-------------------
- "hands_v1"    : 130 features/frame — 2 mãos × 65 (2 absolutas + 21×3 relativas).
                  Formato histórico atual; preservado bit-a-bit para compatibilidade.
- "holistic_v1" : 130 (mãos) + pose + face. Pose e face usam subconjuntos
                  selecionados de pontos, normalizados, para não explodir a
                  dimensionalidade. Canais ausentes são preenchidos com zeros.

A função pública `build_frame_vector(frame, schema)` recebe um HolisticFrame
e devolve a lista de features daquele frame.
"""

from typing import List, Optional

# ---------------------------------------------------------------------------
# Constantes de schema
# ---------------------------------------------------------------------------

SCHEMA_HANDS_V1 = "hands_v1"
SCHEMA_HOLISTIC_V1 = "holistic_v1"
DEFAULT_SCHEMA = SCHEMA_HANDS_V1

# Mãos: 2 mãos × 65 features (2 absolutas do pulso + 21×3 relativas xyz)
HAND_FEATURES = 65
MAX_HANDS = 2
HANDS_FEATURES = HAND_FEATURES * MAX_HANDS  # 130

# Pose: subconjunto relevante p/ Libras (evita ruído de pernas).
# Índices do MediaPipe Pose (33 pontos). Selecionamos parte superior do corpo.
#   0 nariz, 2/5 olhos, 7/8 orelhas, 11/12 ombros, 13/14 cotovelos,
#   15/16 pulsos, 23/24 quadris (referência de tronco).
POSE_INDICES = [0, 2, 5, 7, 8, 11, 12, 13, 14, 15, 16, 23, 24]
POSE_PER_POINT = 4  # (x-ref, y-ref, z, visibility)
POSE_FEATURES = len(POSE_INDICES) * POSE_PER_POINT

# Rosto: subconjunto p/ marcações não-manuais (sobrancelhas, olhos, boca,
# bochechas). Índices do MediaPipe FaceLandmarker (478 pontos no total).
# NÃO usamos os 478 — só os relevantes para expressão.
FACE_INDICES = [
    # sobrancelhas
    70, 63, 105, 66, 107, 336, 296, 334, 293, 300,
    # olhos (cantos e pálpebras)
    33, 159, 145, 133, 362, 386, 374, 263,
    # boca (contorno externo)
    61, 0, 291, 17, 13, 14, 78, 308,
    # bochechas / nariz
    1, 234, 454,
]
FACE_PER_POINT = 3  # (x-ref, y-ref, z)
FACE_FEATURES = len(FACE_INDICES) * FACE_PER_POINT

# Tamanho total por schema
SCHEMA_FRAME_SIZE = {
    SCHEMA_HANDS_V1: HANDS_FEATURES,
    SCHEMA_HOLISTIC_V1: HANDS_FEATURES + POSE_FEATURES + FACE_FEATURES,
}


# ---------------------------------------------------------------------------
# Mãos (idêntico ao formato 130 atual — não alterar a aritmética)
# ---------------------------------------------------------------------------

def _hands_vector(hands) -> List[float]:
    """
    Reproduz exatamente o vetor de 130 features das duas mãos.
    65 por mão: 2 absolutas do pulso + 21×3 relativas (x-base, y-base, z).
    Mão ausente → 65 zeros.
    """
    vec: List[float] = []
    for i in range(MAX_HANDS):
        if i < len(hands):
            hand = hands[i]
            base_x = hand[0].x
            base_y = hand[0].y
            vec.append(base_x)
            vec.append(base_y)
            for lm in hand:
                vec.append(lm.x - base_x)
                vec.append(lm.y - base_y)
                vec.append(getattr(lm, "z", 0.0))
        else:
            vec.extend([0.0] * HAND_FEATURES)
    return vec


# ---------------------------------------------------------------------------
# Pose (corpo)
# ---------------------------------------------------------------------------

def _pose_vector(pose: Optional[list]) -> List[float]:
    """
    Subconjunto de pose normalizado pelo ponto médio dos ombros (índices 11/12),
    o que torna o vetor invariante à posição do corpo na câmera.
    Pose ausente → zeros.
    """
    if not pose or len(pose) <= max(POSE_INDICES):
        return [0.0] * POSE_FEATURES

    # Referência: ponto médio dos ombros
    ref_x = (pose[11].x + pose[12].x) / 2.0
    ref_y = (pose[11].y + pose[12].y) / 2.0

    vec: List[float] = []
    for idx in POSE_INDICES:
        lm = pose[idx]
        vis = getattr(lm, "visibility", None)
        vec.append(lm.x - ref_x)
        vec.append(lm.y - ref_y)
        vec.append(getattr(lm, "z", 0.0))
        vec.append(vis if vis is not None else 0.0)
    return vec


# ---------------------------------------------------------------------------
# Rosto
# ---------------------------------------------------------------------------

def _face_vector(face: Optional[list]) -> List[float]:
    """
    Subconjunto facial normalizado pelo centroide dos pontos selecionados,
    tornando o vetor invariante à posição/escala do rosto na câmera.
    Rosto ausente → zeros.
    """
    if not face or len(face) <= max(FACE_INDICES):
        return [0.0] * FACE_FEATURES

    pts = [face[idx] for idx in FACE_INDICES]
    ref_x = sum(p.x for p in pts) / len(pts)
    ref_y = sum(p.y for p in pts) / len(pts)

    vec: List[float] = []
    for p in pts:
        vec.append(p.x - ref_x)
        vec.append(p.y - ref_y)
        vec.append(getattr(p, "z", 0.0))
    return vec


# ---------------------------------------------------------------------------
# API pública
# ---------------------------------------------------------------------------

def build_frame_vector(frame, schema: str = DEFAULT_SCHEMA) -> List[float]:
    """
    Monta o vetor de features de um único frame conforme o schema.

    Parameters
    ----------
    frame : HolisticFrame
        Frame holístico (mãos sempre; pose/face opcionais).
    schema : str
        "hands_v1" (padrão, retrocompatível) ou "holistic_v1".

    Returns
    -------
    list[float]
        Vetor de comprimento fixo `SCHEMA_FRAME_SIZE[schema]`.
    """
    hands = getattr(frame, "hands", frame)  # tolera receber lista de mãos crua

    vec = _hands_vector(hands)

    if schema == SCHEMA_HOLISTIC_V1:
        vec.extend(_pose_vector(getattr(frame, "pose", None)))
        vec.extend(_face_vector(getattr(frame, "face", None)))

    return vec


def frame_size(schema: str = DEFAULT_SCHEMA) -> int:
    """Tamanho do vetor por frame para o schema dado."""
    return SCHEMA_FRAME_SIZE.get(schema, HANDS_FEATURES)
