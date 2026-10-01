import glob
import os
import pandas as pd

base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
files = sorted(glob.glob(os.path.join(base_dir, "Ground Water *.csv")))

print(f"Total files found: {len(files)}")
all_cols = set()
file_summaries = []

for f in files:
    fname = os.path.basename(f)
    try:
        df = pd.read_csv(f, encoding="latin1")
        file_summaries.append({
            "file": fname,
            "rows": len(df),
            "cols": list(df.columns)
        })
        all_cols.update(df.columns)
    except Exception as e:
        print(f"Error reading {fname}: {e}")

print("\n--- Summary per CSV ---")
for s in file_summaries:
    print(f"\n{s['file']} (Rows: {s['rows']}):")
    for col in s['cols']:
        print(f"  - {col}")

print("\n--- All Unique Columns Across All Years ---")
for col in sorted(all_cols):
    print(f"  * {col}")

# Let's inspect unique states across all files
states = set()
for f in files:
    try:
        df = pd.read_csv(f, encoding="latin1")
        state_col = [c for c in df.columns if "state" in c.lower()]
        if state_col:
            unique_in_f = df[state_col[0]].dropna().unique()
            for st in unique_in_f:
                states.add(str(st).strip().upper())
    except:
        pass

print(f"\n--- Total States Covered ({len(states)}) ---")
print(sorted(list(states)))
