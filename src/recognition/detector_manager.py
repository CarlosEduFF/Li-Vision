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

        # memória do último gesto detectado
        self.last_label = None
        self.last_score = 0.0

    def detect(self, hands):
        """
        Executa detectores e retorna gesto estabilizado.
        """

        # -------------------------------------------
        # Cooldown ativo
        # -------------------------------------------
        if self.cooldown_counter > 0:
            self.cooldown_counter -= 1
            return self.last_label, self.last_score

        if not hands:
            self.history.clear()
            return None, 0.0

        best_label = None
        best_score = 0.0

        # -------------------------------------------
        # Executa todos detectores
        # -------------------------------------------
        for hand in hands:
            for det in self.detectors:
                try:
                    label, score = det.detect(hand)

                    if label and score > best_score:
                        best_label = label
                        best_score = score

                except Exception:
                    # fallback para detectores que usam lista de mãos
                    try:
                        label, score = det.detect(hands)

                        if label and score > best_score:
                            best_label = label
                            best_score = score
                    except Exception:
                        continue

        # -------------------------------------------
        # Threshold mínimo
        # -------------------------------------------
        if best_score < self.min_score:
            self.history.clear()
            return self.last_label, self.last_score

        # -------------------------------------------
        # Estabilização temporal
        # -------------------------------------------
        self.history.append(best_label)

        if len(self.history) < self.history.maxlen:
            return self.last_label, self.last_score

        # verifica se todos frames detectaram o mesmo gesto
        if len(set(self.history)) == 1:

            label = self.history[0]

            # salva como último gesto
            self.last_label = label
            self.last_score = best_score

            # ativa cooldown
            self.cooldown_counter = self.cooldown_frames
            self.history.clear()

            return label, best_score

        return self.last_label, self.last_score