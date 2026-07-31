#!/usr/bin/env python3
"""designers.dbの内容を表示する。

Usage:
    python scripts/query_designer.py                    # 全件を一覧表示
    python scripts/query_designer.py <デザイナー名>       # 1名の詳細を表示
    python scripts/query_designer.py --genre <ジャンル>   # 会社ジャンルで絞り込み
    python scripts/query_designer.py --material <素材>    # よく使う素材で絞り込み
"""
import sqlite3
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DB_PATH = ROOT / "db" / "designers.db"

LABELS = {
    "designer_name": "名前",
    "designer_name_en": "ローマ字表記",
    "company": "所属会社",
    "title": "肩書き",
    "company_genre": "会社ジャンル",
    "company_genre_detail": "会社ジャンル(補足)",
    "headquarters_location": "本社所在地",
    "num_locations": "拠点数",
    "locations_detail": "拠点内訳",
    "target_spaces": "主な対象とする空間",
    "signature_projects": "代表的な事例",
    "materials": "よく使う素材",
    "features": "特徴",
    "strengths": "強み",
    "source_urls": "参照元",
    "researched_at": "リサーチ実施日",
}


def print_list(rows):
    if not rows:
        print("該当するデザイナーはいません。")
        return
    for r in rows:
        print(
            f"[{r['id']}] {r['designer_name']} / {r['company']} / "
            f"{r['company_genre']} / {r['headquarters_location']}"
        )
    print(f"\n計 {len(rows)} 名")


def main():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    args = sys.argv[1:]

    if not args:
        rows = conn.execute(
            "SELECT * FROM designers ORDER BY company_genre, id"
        ).fetchall()
        print_list(rows)
        return

    if args[0] in ("--genre", "--material") and len(args) >= 2:
        column = "company_genre" if args[0] == "--genre" else "materials"
        rows = conn.execute(
            f"SELECT * FROM designers WHERE {column} LIKE ? ORDER BY id",
            (f"%{args[1]}%",),
        ).fetchall()
        print_list(rows)
        return

    name = args[0]
    rows = conn.execute(
        "SELECT * FROM designers WHERE designer_name LIKE ?", (f"%{name}%",)
    ).fetchall()
    if not rows:
        print(f"'{name}' は見つかりませんでした。")
        return
    for row in rows:
        for key, label in LABELS.items():
            print(f"■ {label}\n{row[key]}\n")
        print("-" * 60)


if __name__ == "__main__":
    main()
