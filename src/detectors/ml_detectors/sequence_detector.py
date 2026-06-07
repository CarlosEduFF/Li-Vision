import numpy as np
import joblib
from collections import deque

from src.api.holistic import HolisticFrame
from src.data_collection import holistic_features as hf


class SequenceGestureDetector:

    def __init__(self, model_path, window_size, threshold, feature_schema=None):

        self.model = joblib.load(model_path)
        # Modelos antigos foram treinados com formatos diferentes por frame:
        # 63/126 = xyz relativo sem posicao absoluta; 42/84 = xy normalizado;
        # 65/130 = formato atual com pulso absoluto + xyz relativo (hands_v1);
        # holistic_v1 = 130 (maos) + pose + face.
        self.expected_features = getattr(self.model, "n_features_in_", 130 * window_size)
        self.features_per_frame = (
            self.expected_features // window_size
            if self.expected_features % window_size == 0
            else 130
        )
        self.window_size = window_size
        self.threshold = threshold
        self.buffer = deque(maxlen=self.window_size)

        # Schema: usa o declarado (do registro do modelo) ou infere pelo tamanho.
        self.feature_schema = feature_schema or self._infer_schema()

    def _infer_schema(self) -> str:
        """Infere o schema de features pelo tamanho do frame do modelo."""
        if self.features_per_frame == hf.frame_size(hf.SCHEMA_HOLISTIC_V1):
            return hf.SCHEMA_HOLISTIC_V1
        return hf.SCHEMA_HANDS_V1

    def _hand_to_vector(self, hand, hand_size):
        """Formato legado para modelos antigos (42/63/65 por mão)."""
        if hand_size == 42:
            xs = [lm.x for lm in hand]
            ys = [lm.y for lm in hand]
            x_min, x_max = min(xs), max(xs)
            y_min, y_max = min(ys), max(ys)
            width = x_max - x_min
            height = y_max - y_min

            vec = []
            for lm in hand:
                rel_x = (lm.x - x_min) / width if width > 0 else 0.0
                rel_y = (lm.y - y_min) / height if height > 0 else 0.0
                vec.extend([rel_x, rel_y])
            return vec

        base_x = hand[0].x
        base_y = hand[0].y
        vec = []

        if hand_size == 65:
            vec.extend([base_x, base_y])

        for lm in hand:
            vec.append(lm.x - base_x)
            vec.append(lm.y - base_y)
            vec.append(getattr(lm, "z", 0.0))

        if len(vec) < hand_size:
            vec.extend([0.0] * (hand_size - len(vec)))
        return vec[:hand_size]

    def landmarks_to_vector(self, frame):
        """
        Monta o vetor de features de um frame.

        - holistic_v1 e hands_v1 (130): delega ao módulo unificado
          `holistic_features.build_frame_vector`, garantindo paridade com a coleta.
        - schemas legados (42/63/126/...): mantém a lógica histórica por compat.
        """
        # Normaliza para HolisticFrame
        if isinstance(frame, HolisticFrame):
            hands = frame.hands
        elif len(frame) > 0 and hasattr(frame[0], "__len__") and not hasattr(frame[0], "x"):
            hands = frame  # lista de mãos
            frame = HolisticFrame(hands=hands)
        else:
            hands = [frame]  # mão única
            frame = HolisticFrame(hands=hands)

        # Caminho unificado para os schemas atuais
        if self.features_per_frame == hf.frame_size(self.feature_schema):
            return hf.build_frame_vector(frame, self.feature_schema)

        # ----- Caminho legado (modelos antigos com 42/63/126/etc.) -----
        if self.features_per_frame in (42, 63, 65):
            max_hands = 1
            hand_size = self.features_per_frame
        elif self.features_per_frame % 2 == 0 and self.features_per_frame // 2 in (42, 63, 65):
            max_hands = 2
            hand_size = self.features_per_frame // 2
        else:
            max_hands = 2
            hand_size = 65

        vec = []
        for i in range(max_hands):
            if i < len(hands):
                vec.extend(self._hand_to_vector(hands[i], hand_size))
            else:
                vec.extend([0.0] * hand_size)

        if len(vec) < self.features_per_frame:
            vec.extend([0.0] * (self.features_per_frame - len(vec)))

        return vec[:self.features_per_frame]

    def detect(self, frame):

        hands = getattr(frame, "hands", frame)
        if not hands:
            self.buffer.clear()
            return None, 0.0

        vec = self.landmarks_to_vector(frame)
        self.buffer.append(vec)

        if len(self.buffer) < self.window_size:
            return None, 0.0

        sequence = np.array(self.buffer).flatten().reshape(1, -1)

        if sequence.shape[1] != self.expected_features:
            return None, 0.0

        probs = self.model.predict_proba(sequence)[0]
        idx = np.argmax(probs)
        score = probs[idx]

        if score < self.threshold:
            return None, 0.0

        label = self.model.classes_[idx]

        return label, score
