"""
Correções do pipeline holístico: visibility, normalização e métrica honesta.

Cobre os três defeitos que faziam modelos `holistic_v1` reconhecerem mal:

1. `visibility` ausente virava 0.0 na vetorização (o app envia 1.0), então 1
   de cada 4 features de pose oscilava conforme o aparelho.
2. Os blocos de features (mãos/pose/rosto) têm escalas muito diferentes e a
   MLP era treinada sem StandardScaler.
3. A acurácia era medida sobre os próprios dados de treino, mascarando
   overfitting justamente no caso de poucas amostras.
"""
import sys
import types
from pathlib import Path

import numpy as np
import pytest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

_fake = types.ModuleType("src.core.supabase_client")
_fake.supabase = None
_fake.supabase_admin = None
sys.modules.setdefault("src.core.supabase_client", _fake)

from src.api.holistic import parse_input  # noqa: E402
from src.data_collection import holistic_features as hf  # noqa: E402

HOLISTIC_DIM = hf.HANDS_FEATURES + hf.POSE_FEATURES + hf.FACE_FEATURES


# ---------------------------------------------------------------------------
# 1. visibility
# ---------------------------------------------------------------------------

def _pose_visibility_features(pose_points):
    """Extrai só as features de visibility do bloco de pose."""
    frame = parse_input({
        "hands": [[{"x": 0.5, "y": 0.5, "z": 0.0} for _ in range(21)]],
        "pose": pose_points,
    })
    vec = hf.build_frame_vector(frame, hf.SCHEMA_HOLISTIC_V1)
    pose_block = vec[hf.HANDS_FEATURES:hf.HANDS_FEATURES + hf.POSE_FEATURES]
    # Layout por ponto: (x, y, z, visibility) — visibility é o índice 3.
    return pose_block[3::hf.POSE_PER_POINT]


def test_visibility_ausente_vira_1_e_nao_0():
    """
    O app envia 1.0 quando o MediaPipe não informa visibility. O backend
    precisa usar a MESMA convenção, senão o canal de pose vira ruído.
    """
    sem_vis = [{"x": 0.4, "y": 0.6, "z": 0.0} for _ in range(33)]
    assert _pose_visibility_features(sem_vis) == [1.0] * len(hf.POSE_INDICES)


def test_visibility_informada_e_preservada():
    com_vis = [{"x": 0.4, "y": 0.6, "z": 0.0, "visibility": 0.42} for _ in range(33)]
    assert _pose_visibility_features(com_vis) == [0.42] * len(hf.POSE_INDICES)


def test_pose_ausente_continua_zerada():
    """Pose ausente é um caso diferente de visibility ausente: segue zerada."""
    frame = parse_input({"hands": [[{"x": 0.5, "y": 0.5, "z": 0.0} for _ in range(21)]]})
    vec = hf.build_frame_vector(frame, hf.SCHEMA_HOLISTIC_V1)
    pose_block = vec[hf.HANDS_FEATURES:hf.HANDS_FEATURES + hf.POSE_FEATURES]
    assert pose_block == [0.0] * hf.POSE_FEATURES


def test_dimensao_do_vetor_nao_mudou():
    """A correção altera valores, nunca o tamanho — datasets seguem válidos."""
    frame = parse_input({
        "hands": [[{"x": 0.5, "y": 0.5, "z": 0.0} for _ in range(21)]],
        "pose": [{"x": 0.4, "y": 0.6, "z": 0.0} for _ in range(33)],
        "face": [{"x": 0.5, "y": 0.5, "z": 0.0} for _ in range(478)],
    })
    assert len(hf.build_frame_vector(frame, hf.SCHEMA_HOLISTIC_V1)) == HOLISTIC_DIM


# ---------------------------------------------------------------------------
# 2. Pipeline com StandardScaler na inferência
# ---------------------------------------------------------------------------

def test_detector_reconhece_pipeline_como_holistico():
    """
    Modelos novos são um Pipeline. Se `expects_holistic_frame` não souber ler
    a dimensão através dele, todo modelo holístico cai no caminho legado de 42
    features e a inferência quebra.
    """
    from sklearn.neural_network import MLPClassifier
    from sklearn.pipeline import Pipeline
    from sklearn.preprocessing import StandardScaler
    from src.detectors.ml_detectors.static_detector import MLDetector

    X = np.random.RandomState(0).rand(6, HOLISTIC_DIM)
    y = ["A", "A", "A", "B", "B", "B"]
    pipe = Pipeline([
        ("scaler", StandardScaler()),
        ("mlp", MLPClassifier(hidden_layer_sizes=(8,), max_iter=20, random_state=0)),
    ])
    pipe.fit(X, y)

    det = object.__new__(MLDetector)
    det.model = types.SimpleNamespace(model=pipe)
    det.threshold = 0.0

    assert det.expects_holistic_frame is True

    frame = parse_input({
        "hands": [[{"x": 0.5, "y": 0.5, "z": 0.0} for _ in range(21)]],
        "pose": [{"x": 0.4, "y": 0.6, "z": 0.0, "visibility": 0.9} for _ in range(33)],
        "face": [{"x": 0.5, "y": 0.5, "z": 0.0} for _ in range(478)],
    })
    label, confidence = det.detect(frame)
    assert label in ("A", "B")
    assert 0.0 <= confidence <= 1.0


def test_detector_legado_sem_pipeline_continua_funcionando():
    """Modelos antigos (estimador nu, sem Pipeline) seguem sendo lidos."""
    from src.detectors.ml_detectors.static_detector import _n_features_in

    assert _n_features_in(types.SimpleNamespace(n_features_in_=42)) == 42


def test_scaler_iguala_a_influencia_dos_blocos():
    """
    As features de rosto têm amplitude ~10x menor que as de mão. Sem o scaler
    esse bloco quase não pesa no gradiente; com ele, todos os blocos entram na
    mesma escala.
    """
    from sklearn.preprocessing import StandardScaler

    rng = np.random.RandomState(0)
    # Simula os blocos com as amplitudes reais medidas no vetor.
    maos = rng.normal(0, 0.10, size=(40, 10))
    rosto = rng.normal(0, 0.01, size=(40, 10))
    X = np.hstack([maos, rosto])

    assert X[:, :10].std() > X[:, 10:].std() * 5  # desequilíbrio antes

    Xs = StandardScaler().fit_transform(X)
    assert Xs[:, :10].std() == pytest.approx(Xs[:, 10:].std(), rel=0.2)


# ---------------------------------------------------------------------------
# 3. Métrica honesta
# ---------------------------------------------------------------------------

def test_rotulos_texto_com_early_stopping_nao_quebram():
    """
    Regressão: `early_stopping=True` + rótulos string faz o MLPClassifier do
    sklearn 1.8 estourar `TypeError: ufunc 'isnan' not supported` ao pontuar a
    validação interna. Como early_stopping era incondicional, TODO treino com
    >= 50 amostras falhava. O LabelEncoder resolve, e reajustar o
    `_label_binarizer` mantém `predict` devolvendo as letras.
    """
    from sklearn.neural_network import MLPClassifier
    from sklearn.pipeline import Pipeline
    from sklearn.preprocessing import LabelEncoder, StandardScaler

    rng = np.random.RandomState(0)
    labels = np.array([c for c in "ABCDEFGH" for _ in range(10)])
    base = {c: rng.rand(40) for c in set(labels)}
    X = np.array([base[c] + rng.normal(0, 0.01, 40) for c in labels])

    le = LabelEncoder()
    y_enc = le.fit_transform(labels)

    clf = Pipeline([
        ("scaler", StandardScaler()),
        ("mlp", MLPClassifier(
            hidden_layer_sizes=(32,), max_iter=200, random_state=42,
            early_stopping=True, validation_fraction=0.15,
        )),
    ])
    clf.fit(X, y_enc)  # sem o encoder, isto levantaria TypeError

    mlp = clf.named_steps["mlp"]
    mlp._label_binarizer.fit(le.classes_)
    mlp.classes_ = le.classes_

    # `predict` precisa devolver as LETRAS: reescrever só `classes_` não basta,
    # o binarizer é quem decodifica a saída.
    pred = clf.predict(X[:3])
    assert pred.dtype.kind in ("U", "S", "O"), f"predict devolveu {pred.dtype}"
    assert set(pred) <= set(labels)

    # E o caminho que o MLDetector usa (argmax sobre predict_proba) concorda.
    proba = clf.predict_proba(X[:1])[0]
    assert mlp.classes_[int(np.argmax(proba))] == clf.predict(X[:1])[0]


def test_holdout_detecta_overfitting_que_o_treino_esconde():
    """
    Prova o problema da métrica antiga: com ruído puro (sem sinal aprendível),
    avaliar no treino dá acurácia alta e avaliar em holdout dá ~acaso.
    """
    from sklearn.metrics import accuracy_score
    from sklearn.model_selection import train_test_split
    from sklearn.neural_network import MLPClassifier
    from sklearn.pipeline import Pipeline
    from sklearn.preprocessing import StandardScaler

    rng = np.random.RandomState(42)
    # Rótulos SEM relação com X: nada real a aprender.
    X = rng.rand(40, HOLISTIC_DIM)
    y = np.array(["A", "B"] * 20)

    X_tr, X_te, y_tr, y_te = train_test_split(
        X, y, test_size=0.3, random_state=42, stratify=y,
    )
    clf = Pipeline([
        ("scaler", StandardScaler()),
        ("mlp", MLPClassifier(hidden_layer_sizes=(128, 64), max_iter=500, random_state=42)),
    ])
    clf.fit(X_tr, y_tr)

    acc_treino = accuracy_score(y_tr, clf.predict(X_tr))
    acc_teste = accuracy_score(y_te, clf.predict(X_te))

    # A métrica antiga reportaria acc_treino — alta e enganosa.
    assert acc_treino > 0.9
    # A nova revela que o modelo não generaliza.
    assert acc_teste < 0.8
    assert acc_treino > acc_teste
