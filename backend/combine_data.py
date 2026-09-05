import pandas as pd
import glob
import os
from pathlib import Path

backend_dir = Path(__file__).resolve().parent
files = glob.glob(str(backend_dir / "newdata" / "*.csv"))

print(f"Found {len(files)} CSV files")

if not files:
    print(f"No CSV files found in {backend_dir / 'newdata'}")
    exit()

dataframes = []

for file in files:
    print(f"Loading: {os.path.basename(file)}")

    df = pd.read_csv(file)

    df.columns = df.columns.str.strip()

    dataframes.append(df)

combined = pd.concat(
    dataframes,
    ignore_index=True
)

print("\nCombined dataset:")
print(combined.shape)

print("\nLabels:")
print(combined["Label"].value_counts())

combined.to_csv(
    backend_dir / "combined_cicids2017.csv",
    index=False
)

print("\nSaved: combined_cicids2017.csv")