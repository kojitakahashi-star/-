#!/usr/bin/env python3
"""リサーチ結果のJSONファイルをdesigners.dbに登録(UPSERT)する。

Usage:
    python scripts/add_designer.py data/designers/<designer>.json
    python scripts/add_designer.py data/designers/*.json
"""
import json
import sqlite3
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DB_PATH = ROOT / "db" / "designers.db"

REQUIRED_FIELDS = [
    "designer_name",
    "designer_name_en",
    "company",
    "title",
    "company_genre",
    "company_genre_detail",
    "headquarters_location",
    "num_locations",
    "locations_detail",
    "target_spaces",
    "signature_projects",
    "materials",
    "features",
    "strengths",
    "source_urls",
    "researched_at",
]


def load_record(json_path: Path) -> dict:
    data = json.loads(json_path.read_text(encoding="utf-8"))
    missing = [f for f in REQUIRED_FIELDS if f not in data]
    if missing:
        raise ValueError(f"Missing fields in {json_path}: {missing}")
    return data


def upsert(conn: sqlite3.Connection, record: dict):
    columns = REQUIRED_FIELDS
    placeholders = ", ".join(["?"] * len(columns))
    keys = ("designer_name", "company")
    updates = ", ".join(f"{c}=excluded.{c}" for c in columns if c not in keys)
    sql = f"""
        INSERT INTO designers ({", ".join(columns)})
        VALUES ({placeholders})
        ON CONFLICT(designer_name, company) DO UPDATE SET {updates}
    """
    conn.execute(sql, [record[c] for c in columns])


def main():
    if len(sys.argv) < 2:
        print("Usage: python scripts/add_designer.py <path/to/designer.json> [...]")
        sys.exit(1)

    paths = [Path(p) for p in sys.argv[1:]]
    conn = sqlite3.connect(DB_PATH)
    try:
        for json_path in paths:
            record = load_record(json_path)
            upsert(conn, record)
            print(f"Saved: {record['designer_name']} ({record['company']})")
        conn.commit()
    finally:
        conn.close()

    print(f"-> {DB_PATH} ({len(paths)} 件)")


if __name__ == "__main__":
    main()
