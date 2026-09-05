"""Train a multiclass CIC-IDS model using only live-reproducible features."""

from __future__ import annotations

import json
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report, confusion_matrix, f1_score, precision_score, recall_score
from sklearn.model_selection import GroupShuffleSplit

try:
    from features import FEATURE_COLUMNS, LABEL_COLUMN, feature_mapping
except ImportError:
    from .features import FEATURE_COLUMNS, LABEL_COLUMN, feature_mapping

BASE_DIR = Path(__file__).resolve().parent
DATASET_PATH = BASE_DIR / "combined_cicids2017.csv"
MODEL_DIR = BASE_DIR / "models"
MODEL_PATH = MODEL_DIR / "network_detector.joblib"
SCHEMA_PATH = BASE_DIR / "feature_schema.json"
MAPPING_PATH = BASE_DIR / "feature_mapping.md"


def write_schema_and_mapping(csv_columns: list[str], classes: list[str] | None = None) -> None:
    schema = {
        "schema_version": 1,
        "label_column": LABEL_COLUMN,
        "feature_columns": FEATURE_COLUMNS,
        "feature_count": len(FEATURE_COLUMNS),
        "source_csv_columns": csv_columns,
        "classes": classes or [],
        "notes": "Only features reproducible from live Scapy packet metadata are selected.",
    }
    SCHEMA_PATH.write_text(json.dumps(schema, indent=2), encoding="utf-8")
    rows = feature_mapping(csv_columns)
    lines = [
        "# CIC-IDS2017 to Scapy Feature Mapping",
        "",
        "Only rows marked `selected` are used by both training and live inference.",
        "",
        "| CIC feature | How it is calculated | Available? | Source type | Status |",
        "|---|---|---:|---|---|",
    ]
    for row in rows:
        calculation = row["calculation"].replace("|", "\\|")
        lines.append(f"| `{row['cic_feature']}` | {calculation} | {row['available']} | {row['source_type']} | {row['status']} |")
    MAPPING_PATH.write_text("\n".join(lines) + "\n", encoding="utf-8")


def main() -> None:
    if not DATASET_PATH.is_file():
        raise FileNotFoundError(
            f"Dataset not found: {DATASET_PATH}. Run live_detector.py in combiner mode first."
        )

    print(f"Loading dataset: {DATASET_PATH}")
    header = pd.read_csv(DATASET_PATH, nrows=0)
    csv_columns = [column.strip() for column in header.columns]
    print(f"Exact CSV column count: {len(csv_columns)}")
    for index, column in enumerate(csv_columns):
        print(f"{index:02d}: {column}")
    write_schema_and_mapping(csv_columns)

    missing = [column for column in FEATURE_COLUMNS + [LABEL_COLUMN] if column not in csv_columns]
    if missing:
        raise ValueError(f"CSV does not match the expected CIC schema. Missing columns: {missing}")

    print(f"\nReading {len(FEATURE_COLUMNS)} selected live-reproducible features...")
    df = pd.read_csv(DATASET_PATH, usecols=FEATURE_COLUMNS + [LABEL_COLUMN])
    df.columns = df.columns.str.strip()
    df[LABEL_COLUMN] = df[LABEL_COLUMN].astype(str).str.strip()
    df = df.replace([np.inf, -np.inf], np.nan).dropna(subset=[LABEL_COLUMN])
    X = df[FEATURE_COLUMNS].apply(pd.to_numeric, errors="coerce").replace([np.inf, -np.inf], np.nan).fillna(0.0)
    y = df[LABEL_COLUMN]
    valid_labels = y.value_counts()
    keep_labels = valid_labels[valid_labels >= 2].index
    X = X[y.isin(keep_labels)]
    y = y[y.isin(keep_labels)]
    print(f"Training rows after cleaning: {len(X):,}")
    print("\nClass distribution:")
    print(y.value_counts().to_string())

    # CIC-IDS2017 has no flow identifier in this CSV. Group contiguous rows in
    # blocks so nearby correlated records do not get split independently.
    groups = np.arange(len(X)) // 1000
    splitter = GroupShuffleSplit(n_splits=1, test_size=0.20, random_state=42)
    train_indexes, test_indexes = next(splitter.split(X, y, groups=groups))
    X_train, X_test = X.iloc[train_indexes], X.iloc[test_indexes]
    y_train, y_test = y.iloc[train_indexes], y.iloc[test_indexes]
    model = RandomForestClassifier(
        n_estimators=160,
        random_state=42,
        n_jobs=-1,
        class_weight="balanced_subsample",
        min_samples_leaf=2,
    )
    print("\nTraining multiclass Random Forest...")
    model.fit(X_train, y_train)
    predictions = model.predict(X_test)

    print("\nEVALUATION")
    print(f"Precision (weighted): {precision_score(y_test, predictions, average='weighted', zero_division=0):.4f}")
    print(f"Recall (weighted):    {recall_score(y_test, predictions, average='weighted', zero_division=0):.4f}")
    print(f"F1 (weighted):        {f1_score(y_test, predictions, average='weighted', zero_division=0):.4f}")
    print(f"F1 (macro):           {f1_score(y_test, predictions, average='macro', zero_division=0):.4f}")
    print("\nPer-class metrics:")
    print(classification_report(y_test, predictions, zero_division=0))
    labels = list(model.classes_)
    print("Confusion matrix labels:")
    print(labels)
    print(confusion_matrix(y_test, predictions, labels=labels))

    MODEL_DIR.mkdir(exist_ok=True)
    artifact = {
        "model": model,
        "feature_columns": FEATURE_COLUMNS,
        "classes": labels,
        "schema_version": 1,
    }
    joblib.dump(artifact, MODEL_PATH)
    write_schema_and_mapping(csv_columns, labels)
    print(f"\nSaved model: {MODEL_PATH}")
    print(f"Saved schema: {SCHEMA_PATH}")
    print(f"Saved mapping: {MAPPING_PATH}")


if __name__ == "__main__":
    main()
