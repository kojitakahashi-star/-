#!/usr/bin/env python3
"""アポ打診先のリサーチ結果JSONをcompanies.dbに登録(UPSERT)する。

企業情報を prospects へ、JSON内の contacts 配列を prospect_contacts へ登録する。

Usage:
    python scripts/add_prospect.py data/prospects/<company>.json
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
    "wood_touchpoint",
    "mail_angle",
    "features",
    "strengths",
    "notes",
    "source_urls",
    "researched_at",
]

CONTACT_FIELDS = ["contact_name", "email", "department", "title"]


def load_record(json_path: Path) -> dict:
    data = json.loads(json_path.read_text(encoding="utf-8"))
    missing = [f for f in REQUIRED_FIELDS if f not in data]
    if missing:
        raise ValueError(f"Missing fields in {json_path}: {missing}")
    for contact in data.get("contacts", []):
        if not contact.get("contact_name") or not contact.get("email"):
            raise ValueError(f"contact_name and email are required in {json_path}: {contact}")
    return data


def upsert_prospect(conn: sqlite3.Connection, record: dict):
    columns = REQUIRED_FIELDS
    placeholders = ", ".join(["?"] * len(columns))
    updates = ", ".join(f"{c}=excluded.{c}" for c in columns if c != "company_name")
    conn.execute(
        f"""
        INSERT INTO prospects ({", ".join(columns)})
        VALUES ({placeholders})
        ON CONFLICT(company_name) DO UPDATE SET {updates}
        """,
        [record[c] for c in columns],
    )


def upsert_contacts(conn: sqlite3.Connection, record: dict) -> int:
    contacts = record.get("contacts", [])
    columns = ["company_name"] + CONTACT_FIELDS
    placeholders = ", ".join(["?"] * len(columns))
    updates = ", ".join(f"{c}=excluded.{c}" for c in columns if c != "email")
    for contact in contacts:
        conn.execute(
            f"""
            INSERT INTO prospect_contacts ({", ".join(columns)})
            VALUES ({placeholders})
            ON CONFLICT(email) DO UPDATE SET {updates}
            """,
            [record["company_name"]] + [contact.get(f) for f in CONTACT_FIELDS],
        )
    return len(contacts)


def main():
    if len(sys.argv) != 2:
        print("Usage: python scripts/add_prospect.py <path/to/prospect.json>")
        sys.exit(1)

    json_path = Path(sys.argv[1])
    record = load_record(json_path)

    conn = sqlite3.connect(DB_PATH)
    try:
        upsert_prospect(conn, record)
        num_contacts = upsert_contacts(conn, record)
        conn.commit()
    finally:
        conn.close()

    print(f"Saved: {record['company_name']} (担当者{num_contacts}名) -> {DB_PATH}")


if __name__ == "__main__":
    main()
