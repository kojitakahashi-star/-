#!/usr/bin/env python3
"""名刺CSV(Eight書き出し)を読み込んで data/outreach/contacts.json を作る。

使い方:
    python3 scripts/cards_import.py data/outreach/cards_20260803.csv
    python3 scripts/cards_import.py data/outreach/*.csv        # 複数イベント分をまとめて

Shift-JIS / UTF-8 は自動判定する。同じメールアドレスは1件に統合する。
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

from outreach_common import (
    CONTACTS_PATH,
    GROUPING_PATH,
    OUTREACH_DIR,
    load_contacts_from_csv,
    read_json,
    write_json,
)


def main() -> int:
    parser = argparse.ArgumentParser(description="名刺CSVを連絡先JSONに正規化する")
    parser.add_argument("csv", nargs="*", help="名刺CSVのパス(省略時は data/outreach/*.csv)")
    parser.add_argument("--out", default=str(CONTACTS_PATH), help="出力先JSON")
    args = parser.parse_args()

    paths = [Path(p) for p in args.csv] or sorted(OUTREACH_DIR.glob("*.csv"))
    missing = [p for p in paths if not p.exists()]
    if not paths or missing:
        print(f"CSVが見つかりません: {missing or OUTREACH_DIR}", file=sys.stderr)
        return 1

    grouping = read_json(GROUPING_PATH, {}) or {}
    aliases = grouping.get("company_aliases", {})
    contacts = load_contacts_from_csv(paths, aliases)
    contacts.sort(key=lambda c: (c["company"], c["department"], -c["title_rank"], c["name"]))

    write_json(Path(args.out), contacts)
    print(f"{len(contacts)}件の連絡先を {args.out} に書き出しました")

    by_date: dict[str, int] = {}
    for contact in contacts:
        by_date[contact["exchanged_on"]] = by_date.get(contact["exchanged_on"], 0) + 1
    for date, count in sorted(by_date.items()):
        print(f"  名刺交換日 {date}: {count}名")
    return 0


if __name__ == "__main__":
    sys.exit(main())
