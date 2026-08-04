#!/usr/bin/env python3
"""送付先(アポ打診先)企業のリサーチ結果JSONを prospects テーブルに登録(UPSERT)する。

Usage:
    python3 scripts/add_prospect.py data/prospects/<会社名>.json
    python3 scripts/add_prospect.py data/prospects/*.json

JSONの形式(必須は company_name と researched_at、他は空文字でよい):

    {
      "company_name": "株式会社◯◯",
      "url": "https://...",
      "headquarters_location": "東京都◯◯区...",
      "industry": "設計事務所",
      "business_description": "...",
      "segments": "店舗 / オフィス / ホテル",
      "strengths": "...",
      "wood_relevance": "木質化や木造への関わり。無ければ「公開情報では確認できず」と書く",
      "talking_points": "メールで触れる切り口(改行区切り)",
      "caution": "断定を避けるべき点・未確認事項",
      "source_urls": "参照元URL(改行区切り)",
      "researched_at": "2026-08-04"
    }
"""
from __future__ import annotations

import json
import sqlite3
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DB_PATH = ROOT / "db" / "companies.db"

COLUMNS = [
    "company_name",
    "url",
    "headquarters_location",
    "industry",
    "business_description",
    "segments",
    "strengths",
    "wood_relevance",
    "talking_points",
    "caution",
    "source_urls",
    "researched_at",
]


def upsert(conn: sqlite3.Connection, record: dict) -> None:
    for field in ("company_name", "researched_at"):
        if not record.get(field):
            raise ValueError(f"{field} は必須です: {record.get('company_name')}")
    values = [record.get(c, "") or "" for c in COLUMNS]
    updates = ", ".join(f"{c}=excluded.{c}" for c in COLUMNS if c != "company_name")
    conn.execute(
        f"INSERT INTO prospects ({', '.join(COLUMNS)}) "
        f"VALUES ({', '.join(['?'] * len(COLUMNS))}) "
        f"ON CONFLICT(company_name) DO UPDATE SET {updates}",
        values,
    )
    conn.commit()


def main() -> int:
    paths = [Path(p) for p in sys.argv[1:]]
    if not paths:
        print(__doc__)
        return 1
    conn = sqlite3.connect(DB_PATH)
    try:
        for path in paths:
            record = json.loads(path.read_text(encoding="utf-8"))
            upsert(conn, record)
            print(f"登録: {record['company_name']} ({path.name})")
    finally:
        conn.close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
