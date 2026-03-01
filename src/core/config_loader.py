import yaml  # Biblioteca para ler arquivos YAML
from pathlib import Path  # Para manipulação de caminhos de forma segura e portátil


class Config:
    """
    Classe para carregar e acessar configurações a partir de um arquivo YAML.

    Funcionalidade:
    - Lê o YAML e armazena os dados internamente.
    - Permite acessar os valores usando sintaxe de dicionário: config['chave']
    """

    def __init__(self, path: str):
        """
        Inicializa a configuração.

        Parameters
        ----------
        path : str
            Caminho para o arquivo YAML de configuração
        """
        # Converte a string do caminho em objeto Path (mais seguro/portátil)
        # Abre o arquivo no modo leitura com codificação UTF-8
        with open(Path(path), "r", encoding="utf-8") as f:
            # Lê o conteúdo YAML e converte em dicionário Python
            self.data = yaml.safe_load(f)

    def __getitem__(self, item):
        """
        Permite acessar os dados da configuração como se fosse um dicionário.

        Exemplo:
            config = Config("config.yaml")
            camera_index = config["app"]["camera_index"]

        Parameters
        ----------
        item : str
            Chave que deseja acessar no nível superior do YAML

        Returns
        -------
        valor correspondente à chave fornecida
        """
        return self.data[item]