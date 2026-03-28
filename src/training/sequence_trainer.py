import pandas as pd
import numpy as np
from pathlib import Path
from sklearn.neural_network import MLPClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report
import joblib


CSV = "src/data/collected/sequences.csv"
MODELS_DIR = Path("models/dynamic")


def load_data(csv_path):
    df = pd.read_csv(csv_path, header=None)

    X = df.iloc[:, 1:].values.astype(float)
    y = df.iloc[:, 0].values

    return X, y


def choose_model_name():
    """
    Lista modelos existentes e pergunta o nome do novo modelo.
    """

    MODELS_DIR.mkdir(exist_ok=True)

    existing = list(MODELS_DIR.glob("*.joblib"))

    print("\nModelos existentes:")

    if not existing:
        print("  (nenhum modelo encontrado)")
    else:
        for m in existing:
            print(" -", m.name)

    name = input("\nDigite o nome do novo modelo (sem extensão): ").strip()

    if not name:
        name = "gesture_model"

    model_path = MODELS_DIR / f"{name}.joblib"

    if model_path.exists():
        overwrite = input(
            f"O modelo '{name}' já existe. Deseja sobrescrever? (s/n): "
        )

        if overwrite.lower() != "s":
            print("Treinamento cancelado.")
            exit()

    return model_path


def main():

    print("Carregando dados...")
    X, y = load_data(CSV)

    print("Total de amostras:", len(X))
    print("Features por amostra:", X.shape[1])

    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=0.2,
        random_state=42
    )

    print("\nTreinando Rede Neural (MLPClassifier)...")

    clf = MLPClassifier(
        hidden_layer_sizes=(128, 64),
        activation='relu',
        solver='adam',
        max_iter=500,
        random_state=42,
        early_stopping=True,
        n_iter_no_change=20
    )

    clf.fit(X_train, y_train)

    preds = clf.predict(X_test)

    print("\nRelatório de classificação:")
    print(classification_report(y_test, preds))

    model_path = choose_model_name()

    joblib.dump(clf, model_path)

    print("\nModelo salvo em:", model_path)


if __name__ == "__main__":
    main()