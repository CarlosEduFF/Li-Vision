class DetectorManager:
    """
    Orquestra múltiplos detectores de mãos.

    Responsabilidades:
    - Receber mãos detectadas pela pipeline
    - Executar todos detectores registrados
    - Escolher o resultado com maior confiança
    """

    def __init__(self, detectors, min_score=0.6):
        """
        Inicializa o gerenciador de detectores.

        Parameters
        ----------
        detectors : list
            Lista de objetos detectores, cada um com método `detect(landmarks)`
        min_score : float
            Score mínimo para considerar uma detecção válida
        """
        self.detectors = detectors  # Armazena os detectores passados
        self.min_score = min_score  # Score mínimo para aceitar a detecção

    def detect(self, hands):
        """
        Executa todos os detectores em cada mão detectada e retorna
        o label com maior confiança.

        Parameters
        ----------
        hands : list
            Lista de mãos detectadas, onde cada mão é representada
            por 21 landmarks (coordenadas de pontos-chave)

        Returns
        -------
        (label, score) : tuple
            label : string ou None -> nome do gesto detectado
            score : float -> confiança da detecção
        """

        # Se não houver mãos detectadas, retorna imediatamente
        if not hands:
            return None, 0.0

        # Inicializa variáveis para armazenar a melhor detecção
        best_label = None
        best_score = 0.0

        # Percorre cada mão detectada
        for landmarks in hands:

            # Segurança: ignora mãos inválidas ou incompletas (<21 pontos)
            if not landmarks or len(landmarks) < 21:
                continue

            # Para cada mão, roda todos os detectores registrados
            for det in self.detectors:
                label, score = det.detect(landmarks)  # Detecta o gesto na mão atual

                # Atualiza a melhor detecção se a confiança for maior
                if label and score > best_score:
                    best_label = label
                    best_score = score

        # Aplica o threshold mínimo: só retorna se a detecção for confiável
        if best_score >= self.min_score:
            return best_label, best_score

        # Se nenhuma detecção ultrapassou o threshold, retorna None
        return None, 0.0