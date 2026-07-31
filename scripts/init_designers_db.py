#!/usr/bin/env python3
"""designers.db を db/schema_designers.sql から初期化する。"""
import sqlite3
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SCHEMA_PATH = ROOT / "db" / "schema_designers.sql"
DB_PATH = ROOT / "db" / "designers.db"


def main():
    schema_sql = SCHEMA_PATH.read_text(encoding="utf-8")
    conn = sqlite3.connect(DB_PATH)
    try:
        conn.executescript(schema_sql)
        conn.commit()
    finally:
        conn.close()
    print(f"Initialized: {DB_PATH}")


if __name__ == "__main__":
    main()
