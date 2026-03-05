import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report
import joblib

CSV = "src/data/collected/sequences.csv"
MODEL_OUT = "models/gesture_dynamic.joblib"


def load_data(csv_path):
    df = pd.read_csv(csv_path, header=None)

    X = df.iloc[:, 1:].values.astype(float)
    y = df.iloc[:, 0].values

    return X, y


def main():
    print("Carregando dados...")
    X, y = load_data(CSV)

    print("Total de amostras:", len(X))
    print("Features por amostra:", X.shape[1])

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )

    print("Treinando RandomForest...")
    clf = RandomForestClassifier(
        n_estimators=300,
        n_jobs=-1,
        random_state=42
    )

    clf.fit(X_train, y_train)

    preds = clf.predict(X_test)

    print("\nRelatório de classificação:")
    print(classification_report(y_test, preds))

    joblib.dump(clf, MODEL_OUT)
    print("\nModelo salvo em:", MODEL_OUT)


if __name__ == "__main__":
    main()