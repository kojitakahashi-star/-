#!/usr/bin/env python3
"""送付先企業のリサーチ状況とブリーフを表示する。

メールを書く前に「どの会社をまだ調べていないか」「調べた内容は何か」を確認するための道具。

使い方:
    python3 scripts/prospect_brief.py                     # cold_campaign.json の全社の状況
    python3 scripts/prospect_brief.py --missing           # 未リサーチの会社名だけ出す
    python3 scripts/prospect_brief.py --brief             # リサーチ済みの内容を詳しく表示
    python3 scripts/prospect_brief.py "株式会社◯◯"       # 会社名を直接指定
    python3 scripts/prospect_brief.py --campaign data/outreach/campaign.json
"""
from __future__ import annotations

import argparse
import sqlite3
import sys
from pathlib import Path

from outreach_common import OUTREACH_DIR, REPO_ROOT, company_key, read_json

DB_PATH = REPO_ROOT / "db" / "companies.db"
COLD_CAMPAIGN_PATH = OUTREACH_DIR / "cold_campaign.json"

FIELDS = [
    ("industry", "業種"),
    ("headquarters_location", "所在地"),
    ("business_description", "事業内容"),
    ("segments", "手がける領域"),
    ("strengths", "特徴・強み"),
    ("wood_relevance", "木材との接点"),
    ("talking_points", "メールの切り口"),
    ("caution", "注意(未確認事項)"),
    ("source_urls", "参照元"),
]


def load_prospects() -> dict[str, dict]:
    if not DB_PATH.exists():
        return {}
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        rows = conn.execute("SELECT * FROM prospects").fetchall()
    except sqlite3.OperationalError:
        return {}
    finally:
        conn.close()
    return {company_key(r["company_name"]): dict(r) for r in rows}


def target_companies(campaign_path: Path) -> list[str]:
    campaign = read_json(campaign_path, {}) or {}
    names, seen = [], set()
    for group in campaign.get("groups", []):
        name = group.get("company", "")
        if name and company_key(name) not in seen:
            seen.add(company_key(name))
            names.append(name)
    return names


def main() -> int:
    parser = argparse.ArgumentParser(description="送付先企業のリサーチ状況を表示する")
    parser.add_argument("companies", nargs="*", help="会社名(省略時はキャンペーンの全社)")
    parser.add_argument("--campaign", default=str(COLD_CAMPAIGN_PATH))
    parser.add_argument("--missing", action="store_true", help="未リサーチの会社名だけ出す")
    parser.add_argument("--brief", action="store_true", help="リサーチ内容を詳しく表示")
    args = parser.parse_args()

    names = args.companies or target_companies(Path(args.campaign))
    if not names:
        print(f"対象の会社がありません({args.campaign})", file=sys.stderr)
        return 1

    prospects = load_prospects()
    missing = [n for n in names if company_key(n) not in prospects]

    if args.missing:
        for name in missing:
            print(name)
        return 0

    print(f"対象 {len(names)}社 / リサーチ済み {len(names) - len(missing)}社 / 未 {len(missing)}社")
    for name in names:
        row = prospects.get(company_key(name))
        if not row:
            print(f"  [未] {name}")
            continue
        head = row.get("industry") or ""
        print(f"  [済] {name}" + (f" — {head}" if head else "") + f" (調査日 {row['researched_at']})")
        if args.brief:
            for key, label in FIELDS:
                value = (row.get(key) or "").strip()
                if value:
                    indented = value.replace("\n", "\n            ")
                    print(f"        {label}: {indented}")
            print()
    if missing and not args.brief:
        print("\n未リサーチ:")
        for name in missing:
            print(f"  - {name}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
