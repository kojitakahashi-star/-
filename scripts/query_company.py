#!/usr/bin/env python3
"""companies.dbの内容を表示する。

Usage:
    python scripts/query_company.py            # 全件を一覧表示
    python scripts/query_company.py <会社名>    # 1社の詳細を表示
"""
import sqlite3
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DB_PATH = ROOT / "db" / "companies.db"

LABELS = {
    "company_name": "会社名",
    "headquarters_location": "本社所在地",
    "num_locations": "拠点数",
    "locations_detail": "拠点内訳",
    "industry": "業種",
    "business_description": "事業内容",
    "products": "扱っている商品",
    "processing": "扱っている加工",
    "features": "特徴",
    "strengths": "強み",
    "source_urls": "参照元",
    "researched_at": "リサーチ実施日",
}


def main():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row

    if len(sys.argv) == 1:
        rows = conn.execute(
            "SELECT id, company_name, headquarters_location, industry FROM companies ORDER BY id"
        ).fetchall()
        if not rows:
            print("登録されている企業はありません。")
            return
        for r in rows:
            print(f"[{r['id']}] {r['company_name']} / {r['headquarters_location']} / {r['industry']}")
        return

    name = sys.argv[1]
    row = conn.execute(
        "SELECT * FROM companies WHERE company_name = ?", (name,)
    ).fetchone()
    if not row:
        print(f"'{name}' は見つかりませんでした。")
        return
    for key, label in LABELS.items():
        print(f"■ {label}\n{row[key]}\n")


if __name__ == "__main__":
    main()
