# Importa os detectores baseados em regras
from src.detectors import (
    RuleADetector,
    RuleBDetector,
    RuleCDetector,
    RuleDDetector,
    RuleEDetector,
)

# Importa o detector baseado em Machine Learning
from src.detectors.ml_detector import MLDetector


# Mapeia cada letra para a classe de detector correspondente
# Isso permite criar instâncias dinamicamente usando as letras como chave
RULE_MAP = {
    "A": RuleADetector,
    "B": RuleBDetector,
    "C": RuleCDetector,
    "D": RuleDDetector,
    "E": RuleEDetector,
}


def create_detectors(config):
    """
    Cria uma lista de detectores de acordo com a configuração fornecida.

    Parameters
    ----------
    config : dict
        Dicionário de configuração contendo:
        - 'detection': modo de detecção ('rules' ou 'ml')
        - 'rules': quais detectores baseados em regras estão habilitados
        - 'ml': caminho do modelo de ML, se o modo for 'ml'

    Returns
    -------
    list
        Lista de instâncias de detectores ativados
    """

    # Lê o modo de detecção da configuração
    mode = config["detection"]["mode"]

    # Modo baseado em regras
    if mode == "rules":
        enabled = config["rules"]["enabled"]  # Lista de letras habilitadas (ex: ["A","C"])
        # Cria uma instância de cada detector habilitado usando o mapa RULE_MAP
        return [RULE_MAP[l]() for l in enabled]

    # Modo baseado em Machine Learning
    elif mode == "ml":
        model_path = config["ml"]["model_path"]  # Caminho para o arquivo do modelo ML
        return [MLDetector(model_path)]  # Retorna uma lista com o detector ML

    # Caso o modo seja desconhecido, lança erro
    else:
        raise ValueError(f"Modo desconhecido: {mode}")