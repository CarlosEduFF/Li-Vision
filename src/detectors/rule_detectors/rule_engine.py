"""
rule_detector.py
---------------------------------
Detectores heurísticos de letras LIBRAS
(A, B, C, D, E)

Cada detector retorna True/False.
"""

import math


# ==============================
# UTILIDADES
# ==============================

def distance(a, b):
    return math.sqrt(
        (a.x - b.x) ** 2 +
        (a.y - b.y) ** 2
    )


def finger_up(landmarks, tip, pip):
    """Verifica se dedo está estendido"""
    return landmarks[tip].y < landmarks[pip].y


def finger_down(landmarks, tip, pip):
    """Verifica se dedo está dobrado"""
    return landmarks[tip].y > landmarks[pip].y


# Índices MediaPipe
THUMB_TIP = 4
INDEX_TIP = 8
MIDDLE_TIP = 12
RING_TIP = 16
PINKY_TIP = 20

INDEX_PIP = 6
MIDDLE_PIP = 10
RING_PIP = 14
PINKY_PIP = 18


# ==============================
# LETRA A ✊
# punho fechado (polegar lateral)
# ==============================

def is_letter_a(lm):

    folded = (
        finger_down(lm, INDEX_TIP, INDEX_PIP) and
        finger_down(lm, MIDDLE_TIP, MIDDLE_PIP) and
        finger_down(lm, RING_TIP, RING_PIP) and
        finger_down(lm, PINKY_TIP, PINKY_PIP)
    )

    thumb_visible = lm[THUMB_TIP].x < lm[INDEX_PIP].x

    return folded and thumb_visible


# ==============================
# LETRA B ✋
# dedos juntos e estendidos
# ==============================

def is_letter_b(lm):

    fingers_up_all = (
        finger_up(lm, INDEX_TIP, INDEX_PIP) and
        finger_up(lm, MIDDLE_TIP, MIDDLE_PIP) and
        finger_up(lm, RING_TIP, RING_PIP) and
        finger_up(lm, PINKY_TIP, PINKY_PIP)
    )

    # polegar cruzando palma
    thumb_across = lm[THUMB_TIP].x > lm[INDEX_PIP].x

    return fingers_up_all and thumb_across


# ==============================
# LETRA C 🤏
# (sua implementação adaptada)
# ==============================

def is_letter_c(lm):

    thumb_tip = lm[4]
    index_tip = lm[8]
    middle_tip = lm[12]
    wrist = lm[0]

    hand_size = distance(wrist, middle_tip)
    gap = distance(thumb_tip, index_tip)

    ratio = gap / hand_size

    curved_index = finger_down(lm, INDEX_TIP, INDEX_PIP)
    curved_middle = finger_down(lm, MIDDLE_TIP, MIDDLE_PIP)

    return 0.25 < ratio < 0.55 and curved_index and curved_middle


# ==============================
# LETRA D ☝️
# indicador levantado
# ==============================

def is_letter_d(lm):

    index_up = finger_up(lm, INDEX_TIP, INDEX_PIP)

    others_down = (
        finger_down(lm, MIDDLE_TIP, MIDDLE_PIP) and
        finger_down(lm, RING_TIP, RING_PIP) and
        finger_down(lm, PINKY_TIP, PINKY_PIP)
    )

    thumb_touch = distance(lm[THUMB_TIP], lm[MIDDLE_PIP]) < 0.1

    return index_up and others_down and thumb_touch


# ==============================
# LETRA E ✊ (dedos curvados)
# ==============================

def is_letter_e(lm):

    all_curved = (
        finger_down(lm, INDEX_TIP, INDEX_PIP) and
        finger_down(lm, MIDDLE_TIP, MIDDLE_PIP) and
        finger_down(lm, RING_TIP, RING_PIP) and
        finger_down(lm, PINKY_TIP, PINKY_PIP)
    )

    thumb_front = lm[THUMB_TIP].y > lm[INDEX_PIP].y

    return all_curved and thumb_front


# ==============================
# REGISTRY (IMPORTANTE)
# ==============================

RULE_DETECTORS = {
    "A": is_letter_a,
    "B": is_letter_b,
    "C": is_letter_c,
    "D": is_letter_d,
    "E": is_letter_e,
}


def detect_rule_based(landmarks):
    """
    Retorna primeira letra detectada.
    """

    for letter, detector in RULE_DETECTORS.items():
        if detector(landmarks):
            return letter

    return None