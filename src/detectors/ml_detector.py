"""
ml_detector.py
---------------------------------
Wrapper de Machine Learning para reconhecimento
de gestos de mão (Libras).

Responsabilidade:
- Carregar modelo treinado (.joblib)
- Converter landmarks em vetor de features
- Retornar letra prevista

NÃO depende de OpenCV.
"""

from pathlib import Path
import numpy as np
import joblib


class MLGestureDetector:
    """
    Detector de gestos usando modelo treinado.
    """

    def __init__(self, model_path: str):
        model_file = Path(model_path)

        if not model_file.exists():
            raise FileNotFoundError(
                f"Modelo não encontrado: {model_path}"
            )

        print(f"[ML] Carregando modelo: {model_path}")
        self.model = joblib.load(model_file)

    # ==============================
    # FEATURE ENGINEERING
    # ==============================

    def landmarks_to_features(self, landmarks):
        """
        Converte landmarks do MediaPipe
        em vetor numérico para o modelo ML.

        Entrada:
            landmarks -> lista de 21 pontos

        Saída:
            numpy array shape (1, N)
        """

        # usa o pulso como referência (normalização)
        wrist = landmarks[0]

        features = []

        for lm in landmarks:
            features.append(lm.x - wrist.x)
            features.append(lm.y - wrist.y)

        return np.array(features).reshape(1, -1)

    # ==============================
    # PREDIÇÃO
    # ==============================

    def predict(self, landmarks):
        """
        Retorna a letra prevista.

        Returns:
            str | None
        """

        try:
            features = self.landmarks_to_features(landmarks)

            prediction = self.model.predict(features)[0]

            return prediction

        except Exception as e:
            print(f"[ML ERROR] {e}")
            return None

    # ==============================
    # PREDIÇÃO COM CONFIANÇA
    # ==============================

    def predict_with_confidence(self, landmarks):
        """
        Retorna (classe, confiança).
        """

        if not hasattr(self.model, "predict_proba"):
            return self.predict(landmarks), None

        features = self.landmarks_to_features(landmarks)

        probs = self.model.predict_proba(features)[0]
        idx = np.argmax(probs)

        label = self.model.classes_[idx]
        confidence = probs[idx]

        return label, float(confidence)