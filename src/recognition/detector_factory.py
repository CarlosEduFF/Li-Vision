# ==========================================================
# IMPORTS
# ==========================================================
from pathlib import Path

# ----------------------------------------------------------
# Rule Based Detectors
# ----------------------------------------------------------
from src.detectors import (
    RuleADetector,
    RuleBDetector,
    RuleCDetector,
    RuleDDetector,
    RuleEDetector,
)

# ----------------------------------------------------------
# Static ML
# ----------------------------------------------------------
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
# CARREGAR MODELOS ESTÁTICOS
# ==========================================================
def load_static_models(config):

    model_dir = Path(config["ml"]["model_path"])
    threshold = config["ml"]["confidence_threshold"]

    detectors = []

    if not model_dir.exists():
        print(f"[WARN] Pasta de modelos estáticos não encontrada: {model_dir}")
        return detectors

    for model_file in model_dir.glob("*.joblib"):

        print(f"[STATIC] carregando modelo: {model_file.name}")

        detectors.append(
            MLDetector(
                model_path=str(model_file),
                threshold=threshold,
            )
        )

    return detectors


# ==========================================================
# CARREGAR MODELOS DINÂMICOS
# ==========================================================
def load_dynamic_models(config):

    from src.sequence_gesture_detector import (
        SequenceGestureDetector,
    )

    model_dir = Path(config["dynamic_ml"]["model_path"])

    threshold = config["dynamic_ml"]["confidence_threshold"]
    window_size = config["dynamic_ml"]["window_size"]

    detectors = []

    if not model_dir.exists():
        print(f"[WARN] Pasta de modelos dinâmicos não encontrada: {model_dir}")
        return detectors

    for model_file in model_dir.glob("*.joblib"):

        print(f"[DYNAMIC] carregando modelo: {model_file.name}")

        detectors.append(
            SequenceGestureDetector(
                model_path=str(model_file),
                window_size=window_size,
                threshold=threshold,
            )
        )

    return detectors


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

        # Dynamic ML
        if config["dynamic_ml"]["enabled"]:
            detectors.extend(load_dynamic_models(config))

        # Static ML
        if config["ml"]["enabled"]:
            detectors.extend(load_static_models(config))

        # Rules
        if config["rules"]["enabled"]:
            letters = config["rules"]["letters"]

            for letter in letters:

                if letter in RULE_MAP:

                    print(f"[RULE] carregando detector: {letter}")

                    detectors.append(
                        RULE_MAP[letter]()
                    )

                else:
                    print(f"[WARN] Detector para '{letter}' não existe")

        return detectors

    # ------------------------------------------------------
    # RULE BASED
    # ------------------------------------------------------
    elif mode == "rules":

        if config["rules"]["enabled"]:

            letters = config["rules"]["letters"]

            for letter in letters:

                if letter in RULE_MAP:

                    detectors.append(
                        RULE_MAP[letter]()
                    )

        return detectors

    # ------------------------------------------------------
    # STATIC ML
    # ------------------------------------------------------
    elif mode == "ml":

        if config["ml"]["enabled"]:
            detectors.extend(
                load_static_models(config)
            )

        return detectors

    # ------------------------------------------------------
    # DYNAMIC ML
    # ------------------------------------------------------
    elif mode == "dynamic_ml":

        if config["dynamic_ml"]["enabled"]:
            detectors.extend(
                load_dynamic_models(config)
            )

        return detectors

    # ------------------------------------------------------
    # ERRO
    # ------------------------------------------------------
    else:
        raise ValueError(f"Modo desconhecido: {mode}")