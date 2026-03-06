# ==========================================================
# IMPORTS - Rule Based
# ==========================================================
from src.detectors import (
    RuleADetector,
    RuleBDetector,
    RuleCDetector,
    RuleDDetector,
    RuleEDetector,
)

# ==========================================================
# IMPORT - ML Estático
# ==========================================================
from src.detectors.ml_detector import MLDetector


# ==========================================================
# MAPA DE REGRAS
# ==========================================================
RULE_MAP = {
    "A": RuleADetector,
    "B": RuleBDetector,
    "C": RuleCDetector,
    "D": RuleDDetector,
    "E": RuleEDetector,
}


# ==========================================================
# FACTORY PRINCIPAL
# ==========================================================
def create_detectors(config):
    """
    Cria detectores conforme definido no config.yaml.

    Modos suportados:
        rules
        ml
        dynamic_ml
        hybrid
    """

    mode = config["detection"]["mode"]

    detectors = []

    # ------------------------------------------------------
    # HYBRID MODE
    # ------------------------------------------------------
    if mode == "hybrid":

        # 1️⃣ Dynamic ML (prioridade maior)
        from src.recognition.sequence_gesture_detector import (
            SequenceGestureDetector,
        )

        detectors.append(
            SequenceGestureDetector(
                model_path=config["dynamic_ml"]["model_path"],
                window_size=config["dynamic_ml"]["window_size"],
                threshold=config["dynamic_ml"]["confidence_threshold"],
            )
        )

        # 2️⃣ Static ML
        detectors.append(
            MLDetector(
                model_path=config["ml"]["model_path"],
                threshold=config["ml"]["confidence_threshold"],
            )
        )

        # 3️⃣ Rule detectors
        enabled = config["rules"]["enabled"]

        for letter in enabled:
            if letter in RULE_MAP:
                detectors.append(RULE_MAP[letter]())
            else:
                print(f"[WARN] Detector para '{letter}' não existe")

        return detectors

    # ------------------------------------------------------
    # RULE BASED
    # ------------------------------------------------------
    elif mode == "rules":

        enabled = config["rules"]["enabled"]

        for letter in enabled:
            if letter in RULE_MAP:
                detectors.append(RULE_MAP[letter]())

        return detectors

    # ------------------------------------------------------
    # ML ESTÁTICO
    # ------------------------------------------------------
    elif mode == "ml":

        detectors.append(
            MLDetector(
                model_path=config["ml"]["model_path"],
                threshold=config["ml"]["confidence_threshold"],
            )
        )

        return detectors

    # ------------------------------------------------------
    # ML DINÂMICO
    # ------------------------------------------------------
    elif mode == "dynamic_ml":

        from src.recognition.sequence_gesture_detector import (
            SequenceGestureDetector,
        )

        detectors.append(
            SequenceGestureDetector(
                model_path=config["dynamic_ml"]["model_path"],
                window_size=config["dynamic_ml"]["window_size"],
                threshold=config["dynamic_ml"]["confidence_threshold"],
            )
        )

        return detectors

    # ------------------------------------------------------
    # ERRO
    # ------------------------------------------------------
    else:
        raise ValueError(f"Modo desconhecido: {mode}")