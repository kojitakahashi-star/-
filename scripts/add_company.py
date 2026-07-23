#!/usr/bin/env python3
"""リサーチ結果のJSONファイルをcompanies.dbに登録(UPSERT)する。

Usage:
    python scripts/add_company.py data/researched/<company>.json
"""
import json
import sqlite3
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DB_PATH = ROOT / "db" / "companies.db"

REQUIRED_FIELDS = [
    "company_name",
    "headquarters_location",
    "num_locations",
    "locations_detail",
    "industry",
    "business_description",
    "products",
    "processing",
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
    updates = ", ".join(f"{c}=excluded.{c}" for c in columns if c != "company_name")
    sql = f"""
        INSERT INTO companies ({", ".join(columns)})
        VALUES ({placeholders})
        ON CONFLICT(company_name) DO UPDATE SET {updates}
    """
    conn.execute(sql, [record[c] for c in columns])
    conn.commit()


def main():
    if len(sys.argv) != 2:
        print("Usage: python scripts/add_company.py <path/to/company.json>")
        sys.exit(1)

    json_path = Path(sys.argv[1])
    record = load_record(json_path)

    conn = sqlite3.connect(DB_PATH)
    try:
        upsert(conn, record)
    finally:
        conn.close()

    print(f"Saved: {record['company_name']} -> {DB_PATH}")


if __name__ == "__main__":
    main()
