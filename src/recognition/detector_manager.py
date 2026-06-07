from collections import deque
import logging

logger = logging.getLogger(__name__)


class DetectorManager:
    """
    Orquestra múltiplos detectores de gestos.

    Responsabilidades
    -----------------
    - Executar detectores registrados na ordem correta
    - Detectores de sequência (SequenceGestureDetector) recebem
      a lista completa de mãos (hands), detectores estáticos
      recebem uma mão por vez.
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

    def _is_sequence_detector(self, det) -> bool:
        """
        Verifica se o detector é do tipo sequência (SequenceGestureDetector).
        Detectores de sequência esperam a lista completa de mãos (mãos × frames),
        enquanto detectores estáticos esperam uma única mão (lista de landmarks).
        """
        return hasattr(det, "buffer") and hasattr(det, "window_size")

    def detect(self, frame):
        """
        Executa detectores e retorna gesto estabilizado.

        Parameters
        ----------
        frame : HolisticFrame | list[list[MockLandmark]]
            Frame holístico (mãos + pose/face opcionais). Por compatibilidade,
            também aceita a lista de mãos crua (tratada como frame só-mãos).

        Returns
        -------
        tuple[str|None, float]
            (label, score) — label pode ser None se nada detectado.
        """
        # Detectores de sequência recebem o frame inteiro (mãos + pose + face);
        # detectores estáticos/regras recebem apenas as mãos.
        hands = getattr(frame, "hands", frame)

        # -------------------------------------------
        # Cooldown ativo — retorna último gesto estável
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
        # Executa detectores
        # -------------------------------------------
        for det in self.detectors:
            try:
                if self._is_sequence_detector(det):
                    # Detectores de sequência processam o frame holístico inteiro
                    # (mãos + pose + face). Detectores que só entendem mãos
                    # ignoram os canais extras.
                    label, score = det.detect(frame)
                else:
                    # Detectores estáticos: roda para cada mão, pega o melhor
                    label, score = None, 0.0
                    for hand in hands:
                        try:
                            lbl, scr = det.detect(hand)
                            if lbl and scr > score:
                                label, score = lbl, scr
                        except Exception as e:
                            logger.debug(
                                "[DetectorManager] Erro em detector estático por mão: %s — %s",
                                type(det).__name__, e
                            )

                if label and score > best_score:
                    best_label = label
                    best_score = score

            except Exception as e:
                logger.warning(
                    "[DetectorManager] Erro em detector %s: %s",
                    type(det).__name__, e
                )
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

            # Evita o "ghosting" de gestos dinâmicos: limpa os buffers para 
            # não ficarem "presos" prevendo a mesma sequência de frames passados
            for det in self.detectors:
                if self._is_sequence_detector(det):
                    det.buffer.clear()

            return label, best_score

        return self.last_label, self.last_score