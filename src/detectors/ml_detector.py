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

from pathlib import Path  # Para manipulação segura de caminhos de arquivos
import numpy as np       # Para manipulação de arrays numéricos
import joblib            # Para carregar modelos scikit-learn serializados

from src.detectors.base import BaseDetector  # Classe base para todos detectores


# ======================================================
# DETECTOR DE GESTOS USANDO ML
# ======================================================
class MLGestureDetector:
    """
    Detector de gestos usando modelo treinado.
    
    Funcionalidades:
    - Carrega o modelo ML
    - Converte landmarks do MediaPipe em vetor de features
    - Realiza predição da letra prevista
    """

    def __init__(self, model_path: str):
        """
        Inicializa o detector carregando o modelo .joblib.

        Parameters
        ----------
        model_path : str
            Caminho para o modelo treinado
        """
        model_file = Path(model_path)

        # Valida existência do arquivo de modelo
        if not model_file.exists():
            raise FileNotFoundError(f"Modelo não encontrado: {model_path}")

        print(f"[ML] Carregando modelo: {model_path}")
        # Carrega o modelo scikit-learn serializado
        self.model = joblib.load(model_file)

    # ==============================
    # FEATURE ENGINEERING
    # ==============================
    def landmarks_to_features(self, landmarks):
        """
        Converte landmarks do MediaPipe em vetor numérico
        que será usado como entrada pelo modelo ML.

        Parameters
        ----------
        landmarks : list
            Lista de 21 landmarks do MediaPipe

        Returns
        -------
        np.ndarray
            Array numpy de shape (1, N) pronto para predição
        """

        # Usa o pulso (landmark 0) como referência para normalizar coordenadas
        wrist = landmarks[0]

        features = []

        for lm in landmarks:
            # Calcula posição relativa ao pulso
            features.append(lm.x - wrist.x)
            features.append(lm.y - wrist.y)

        # Retorna array 2D (1 amostra, N features)
        return np.array(features).reshape(1, -1)

    # ==============================
    # PREDIÇÃO SIMPLES
    # ==============================
    def predict(self, landmarks):
        """
        Retorna a letra prevista pelo modelo ML.

        Parameters
        ----------
        landmarks : list
            Lista de 21 landmarks do MediaPipe

        Returns
        -------
        str | None
            Letra prevista ou None em caso de erro
        """
        try:
            features = self.landmarks_to_features(landmarks)
            prediction = self.model.predict(features)[0]
            return prediction
        except Exception as e:
            # Em caso de erro na predição, imprime log e retorna None
            print(f"[ML ERROR] {e}")
            return None

    # ==============================
    # PREDIÇÃO COM CONFIANÇA
    # ==============================
    def predict_with_confidence(self, landmarks):
        """
        Retorna tupla (classe, confiança).

        Parameters
        ----------
        landmarks : list
            Lista de 21 landmarks do MediaPipe

        Returns
        -------
        tuple
            (label, confidence) se suportado, caso contrário (label, None)
        """
        # Se o modelo não tem método predict_proba, retorna apenas a predição
        if not hasattr(self.model, "predict_proba"):
            return self.predict(landmarks), None

        features = self.landmarks_to_features(landmarks)

        # Probabilidades de cada classe
        probs = self.model.predict_proba(features)[0]

        # Índice da classe mais provável
        idx = np.argmax(probs)

        label = self.model.classes_[idx]
        confidence = probs[idx]

        return label, float(confidence)


# ======================================================
# ADAPTER PARA ARQUITETURA DO PROJETO
# ======================================================
class MLDetector(BaseDetector):
    """
    Adapter que integra o modelo ML ao sistema de detectors do Li-Vision.

    Funcionalidade:
    - Segue interface de BaseDetector
    - Retorna (label, confidence) compatível com DetectorManager
    """

    def __init__(self, model_path: str, threshold: float = 0.7):
        """
        Parameters
        ----------
        model_path : str
            Caminho para o modelo treinado
        threshold : float
            Confiança mínima para aceitar a predição
        """

        self.model = MLGestureDetector(model_path)
        self.threshold = threshold

    def detect(self, landmarks):
        """
        Implementa método detect() da interface BaseDetector.
        """

        if not landmarks:
            return None, 0.0

        label, confidence = self.model.predict_with_confidence(landmarks)

        # Caso modelo não retorne probabilidade
        if confidence is None:
            return label, 1.0 if label else 0.0

        # Aplica threshold
        if confidence < self.threshold:
            return None, 0.0

        return label, confidence            