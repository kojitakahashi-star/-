#!/usr/bin/env python3
"""companies.tsv から companies.json を生成する。

TSV が編集用の正。JSON はリサーチ実行時に読み込む機械可読版。
名刺枚数から優先度(A〜D)を付与し、リサーチのバッチ分割もここで確定させる。
"""
import json
import os
import sys

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TSV = os.path.join(BASE, "companies.tsv")
JSON_OUT = os.path.join(BASE, "companies.json")

# 名刺枚数 = 接点の濃さ。多いほど動きを取りこぼしたときの損失が大きい。
def priority(cards):
    if cards is None:
        return "D"
    if cards >= 20:
        return "A"
    if cards >= 5:
        return "B"
    if cards >= 1:
        return "C"
    return "D"


def load_rows():
    rows = []
    with open(TSV, encoding="utf-8") as f:
        for lineno, raw in enumerate(f, 1):
            line = raw.rstrip("\n")
            if not line.strip() or line.lstrip().startswith("#"):
                continue
            cols = line.split("\t")
            if len(cols) < 3:
                sys.exit(f"{TSV}:{lineno}: 列が足りません（会社名/名刺/カテゴリ が必須）: {line!r}")
            name = cols[0].strip()
            cards_raw = cols[1].strip()
            category = cols[2].strip()
            url = cols[3].strip() if len(cols) > 3 else ""
            if not name:
                sys.exit(f"{TSV}:{lineno}: 会社名が空です")
            cards = int(cards_raw) if cards_raw else None
            rows.append(
                {
                    "name": name,
                    "business_cards": cards,
                    "category": category,
                    "hp_url": url or None,
                    "priority": priority(cards),
                }
            )
    return rows


def main():
    rows = load_rows()

    seen = {}
    for r in rows:
        if r["name"] in seen:
            sys.exit(f"会社名が重複しています: {r['name']}")
        seen[r["name"]] = r

    # 優先度順（A→D）、同順位内は名刺枚数の多い順に並べ、先頭バッチほど濃い接点になるようにする。
    order = {"A": 0, "B": 1, "C": 2, "D": 3}
    rows.sort(key=lambda r: (order[r["priority"]], -(r["business_cards"] or 0), r["name"]))

    cfg_path = os.path.join(BASE, "config.json")
    with open(cfg_path, encoding="utf-8") as f:
        batch_size = json.load(f)["run"]["batch_size"]

    for i, r in enumerate(rows):
        r["batch"] = i // batch_size + 1

    out = {
        "total": len(rows),
        "batch_size": batch_size,
        "batch_count": (len(rows) + batch_size - 1) // batch_size,
        "priority_counts": {
            p: sum(1 for r in rows if r["priority"] == p) for p in ("A", "B", "C", "D")
        },
        "companies": rows,
    }
    with open(JSON_OUT, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=2)
        f.write("\n")

    print(f"{len(rows)}社 -> {JSON_OUT}")
    print(f"優先度: {out['priority_counts']}  バッチ数: {out['batch_count']}")


if __name__ == "__main__":
    main()
