from detectors import (
    RuleADetector,
    RuleBDetector,
    RuleCDetector,
    RuleDDetector,
    RuleEDetector,
)

from detectors.ml_detector import MLDetector


RULE_MAP = {
    "A": RuleADetector,
    "B": RuleBDetector,
    "C": RuleCDetector,
    "D": RuleDDetector,
    "E": RuleEDetector,
}


def create_detectors(config):

    mode = config["detection"]["mode"]

    if mode == "rules":
        enabled = config["rules"]["enabled"]
        return [RULE_MAP[l]() for l in enabled]

    elif mode == "ml":
        model_path = config["ml"]["model_path"]
        return [MLDetector(model_path)]

    else:
        raise ValueError(f"Modo desconhecido: {mode}")