import json
import os

BASE_DIR = r"d:\code\jscode\slowlyRecord\slowlyRecord\public\datafile\poetry"

for fname in sorted(os.listdir(BASE_DIR)):
    if not fname.endswith(".json") or fname == "index.json":
        continue
    path = os.path.join(BASE_DIR, fname)
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    print(f"\n=== {fname} ===")
    for p in data.get("poems", []):
        print(f"  {p.get('id')} | {p.get('author')} | {p.get('title')}")
