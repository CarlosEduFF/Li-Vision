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
    Cria detectores conforme o modo definido no config.yaml.
    """

    mode = config["detection"]["mode"]

    # ------------------------------------------------------
    # 1) RULE BASED
    # ------------------------------------------------------
    if mode == "rules":
        enabled = config["rules"]["enabled"]
        return [RULE_MAP[l]() for l in enabled]

    # ------------------------------------------------------
    # 2) ML ESTÁTICO (63 features)
    # ------------------------------------------------------
    elif mode == "ml":
        model_path = config["ml"]["model_path"]
        return [MLDetector(model_path)]

    # ------------------------------------------------------
    # 3) ML DINÂMICO (SEQUÊNCIA TEMPORAL)
    # ------------------------------------------------------
    elif mode == "dynamic_ml":

        from src.recognition.sequence_gesture_detector import (
            SequenceGestureDetector,
        )

        return [
            SequenceGestureDetector(
                model_path=config["dynamic_ml"]["model_path"],
                window_size=config["dynamic_ml"]["window_size"],
                threshold=config["dynamic_ml"]["confidence_threshold"],
            )
        ]

    # ------------------------------------------------------
    # ERRO
    # ------------------------------------------------------
    else:
        raise ValueError(f"Modo desconhecido: {mode}")