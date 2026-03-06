from collections import deque


class DetectorManager:
    """
    Orquestra múltiplos detectores de gestos.

    Responsabilidades
    -----------------
    - Executar detectores registrados
    - Aplicar threshold de confiança
    - Estabilizar detecções no tempo
    """

    def __init__(
        self,
        detectors,
        min_score=0.6,
        stability_frames=3,
        cooldown_frames=10,
    ):

        self.detectors = detectors
        self.min_score = min_score

        # estabilização temporal
        self.history = deque(maxlen=stability_frames)

        # cooldown
        self.cooldown_frames = cooldown_frames
        self.cooldown_counter = 0

    def detect(self, hands):
        """
        Executa detectores e retorna gesto estabilizado.
        """

        # -------------------------------------------
        # Cooldown ativo
        # -------------------------------------------
        if self.cooldown_counter > 0:
            self.cooldown_counter -= 1
            return None, 0.0

        if not hands:
            self.history.clear()
            return None, 0.0

        best_label = None
        best_score = 0.0

        # -------------------------------------------
        # Executa todos detectores
        # -------------------------------------------
        for det in self.detectors:

            try:
                # Detectores dinâmicos usam sequência de mãos
                label, score = det.detect(hands)

            except Exception:
                # Detectores estáticos usam apenas uma mão
                label, score = det.detect(hands[0])

            if label and score > best_score:
                best_label = label
                best_score = score

        # -------------------------------------------
        # Threshold mínimo
        # -------------------------------------------
        if best_score < self.min_score:
            self.history.clear()
            return None, 0.0

        # -------------------------------------------
        # Estabilização temporal
        # -------------------------------------------
        self.history.append(best_label)

        if len(self.history) < self.history.maxlen:
            return None, 0.0

        if len(set(self.history)) == 1:

            label = self.history[0]

            # ativa cooldown
            self.cooldown_counter = self.cooldown_frames
            self.history.clear()

            return label, best_score

        return None, 0.0