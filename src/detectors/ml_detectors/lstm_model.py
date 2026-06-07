import torch
import torch.nn as nn
import numpy as np
from collections import deque

from src.api.holistic import HolisticFrame
from src.data_collection import holistic_features as hf


class GestureLSTM(nn.Module):
    """
    Modelo LSTM/GRU para reconhecimento de gestos dinamicos (sequencias temporais).
    
    Arquitetura:
        Input (seq_len, features_per_frame)
          -> GRU bidirecional (captura padrao temporal)
          -> Dropout
          -> Camada densa com BatchNorm
          -> Softmax (probabilidades por classe)
    
    GRU foi escolhido em vez de LSTM por:
        - 33% menos parametros (mais rapido em CPU)
        - Performance comparavel em sequencias curtas (15 frames)
        - Melhor para datasets pequenos (menos overfitting)
    """

    def __init__(self, input_size: int, hidden_size: int, num_layers: int,
                 num_classes: int, dropout: float = 0.3, bidirectional: bool = True):
        super().__init__()

        self.hidden_size = hidden_size
        self.num_layers = num_layers
        self.bidirectional = bidirectional
        self.num_directions = 2 if bidirectional else 1

        # GRU bidirecional: processa a sequencia nos dois sentidos
        self.gru = nn.GRU(
            input_size=input_size,
            hidden_size=hidden_size,
            num_layers=num_layers,
            batch_first=True,
            dropout=dropout if num_layers > 1 else 0.0,
            bidirectional=bidirectional,
        )

        self.dropout = nn.Dropout(dropout)
        
        gru_output_size = hidden_size * self.num_directions

        # Camada de classificacao com BatchNorm
        self.classifier = nn.Sequential(
            nn.Linear(gru_output_size, 64),
            nn.BatchNorm1d(64),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(64, num_classes),
        )

    def forward(self, x):
        """
        Forward pass.
        
        Args:
            x: Tensor de shape (batch, seq_len, features_per_frame)
        
        Returns:
            logits: Tensor de shape (batch, num_classes)
        """
        # GRU output: (batch, seq_len, hidden * directions)
        gru_out, _ = self.gru(x)

        # Usa APENAS o ultimo timestep (contem contexto de toda a sequencia)
        last_hidden = gru_out[:, -1, :]  # (batch, hidden * directions)

        last_hidden = self.dropout(last_hidden)
        logits = self.classifier(last_hidden)
        return logits


class LSTMGestureDetector:
    """
    Detector de gestos dinamicos usando GRU/LSTM treinado com PyTorch.
    Interface compativel com o DetectorManager existente.
    """

    def __init__(self, model_path: str, window_size: int, threshold: float,
                 input_size: int = 130):
        self.window_size = window_size
        self.threshold = threshold
        self.input_size = input_size
        self.buffer = deque(maxlen=window_size)

        # Carrega checkpoint com modelo + metadados
        checkpoint = torch.load(model_path, map_location="cpu", weights_only=False)

        self.classes = checkpoint["classes"]          # lista de labels
        self.input_size = checkpoint.get("input_size", input_size)

        # Schema de features: vem do checkpoint (modelos holísticos) ou é
        # inferido pelo tamanho do frame (modelos hands_v1 antigos).
        self.feature_schema = checkpoint.get("feature_schema") or (
            hf.SCHEMA_HOLISTIC_V1
            if self.input_size == hf.frame_size(hf.SCHEMA_HOLISTIC_V1)
            else hf.SCHEMA_HANDS_V1
        )

        # Reconstroi o modelo
        self.model = GestureLSTM(
            input_size=self.input_size,
            hidden_size=checkpoint.get("hidden_size", 128),
            num_layers=checkpoint.get("num_layers", 2),
            num_classes=len(self.classes),
            dropout=0.0,  # inferencia sem dropout
            bidirectional=checkpoint.get("bidirectional", True),
        )
        self.model.load_state_dict(checkpoint["model_state_dict"])
        self.model.eval()  # modo inferencia (desativa dropout/batchnorm training)

    def landmarks_to_vector(self, frame):
        """
        Converte landmarks para o mesmo tamanho por frame usado no treinamento.
        """
        # Normaliza para HolisticFrame
        if isinstance(frame, HolisticFrame):
            hands_list = frame.hands
        elif len(frame) > 0 and hasattr(frame[0], "__len__") and not hasattr(frame[0], "x"):
            hands_list = frame
            frame = HolisticFrame(hands=hands_list)
        else:
            hands_list = [frame]
            frame = HolisticFrame(hands=hands_list)

        # Caminho unificado para os schemas atuais (hands_v1 / holistic_v1)
        if self.input_size == hf.frame_size(self.feature_schema):
            return hf.build_frame_vector(frame, self.feature_schema)

        # ----- Caminho legado (modelos antigos 42/63/126/etc.) -----
        if self.input_size in (42, 63, 65):
            max_hands = 1
            hand_size = self.input_size
        elif self.input_size % 2 == 0 and self.input_size // 2 in (42, 63, 65):
            max_hands = 2
            hand_size = self.input_size // 2
        else:
            max_hands = 2
            hand_size = 65

        vec = []
        for i in range(max_hands):
            if i < len(hands_list):
                hand = hands_list[i]
                vec.extend(self._hand_to_vector(hand, hand_size))
            else:
                vec.extend([0.0] * hand_size)

        if len(vec) < self.input_size:
            vec.extend([0.0] * (self.input_size - len(vec)))

        return vec[:self.input_size]

    def _hand_to_vector(self, hand, hand_size):
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

    def detect(self, frame):
        """
        Processa um frame e retorna (label, score) se a janela estiver cheia.
        Interface compativel com DetectorManager.
        """
        hands = getattr(frame, "hands", frame)
        if not hands:
            self.buffer.clear()
            return None, 0.0

        vec = self.landmarks_to_vector(frame)
        self.buffer.append(vec)

        if len(self.buffer) < self.window_size:
            return None, 0.0

        # Monta tensor 3D: (1, seq_len, features)
        sequence = np.array(list(self.buffer), dtype=np.float32)
        if sequence.shape[1] != self.input_size:
            return None, 0.0

        tensor = torch.from_numpy(sequence).unsqueeze(0)  # (1, window, features)

        with torch.no_grad():
            logits = self.model(tensor)
            probs = torch.softmax(logits, dim=1)[0]

        score, idx = probs.max(0)
        score = score.item()

        if score < self.threshold:
            return None, 0.0

        label = self.classes[idx.item()]
        return label, score
