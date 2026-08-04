#!/usr/bin/env python3
"""担当者リスト(会社名・氏名・メール)から新規アポ打診用のキャンペーンを作る。

イベントなどのきっかけが無い相手(Salesforceのリード等)へ、担当者ごとに1通ずつ
下書きを作るための入口。名刺CSVは不要で、下記のような1行1名のリストを渡す。

    株式会社◯◯   山田 太郎   yamada@example.co.jp   設計部   課長   ←任意で部署・役職
    株式会社△△,佐藤 花子,sato@example.jp

区切りはタブ / カンマ / 全角カンマのいずれでもよい。列の順序は
    会社名, 氏名, メール, [部署], [役職], [ひとこと(talked_about)]
先頭が「会社名」で始まるヘッダー行は読み飛ばす。

使い方:
    python3 scripts/cold_import.py data/outreach/cold_targets.tsv
    python3 scripts/cold_import.py data/outreach/cold_targets.tsv --append

既に cold_campaign.json がある場合、同じメールアドレスのグループに手で書いた
内容(ひとこと・件名など)は保持する。
"""
from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

from outreach_common import (
    CAMPAIGN_PATH,
    OUTREACH_DIR,
    TODO,
    display_name,
    normalize_text,
    read_json,
    slugify,
    title_rank,
    write_json,
)

COLD_CAMPAIGN_PATH = OUTREACH_DIR / "cold_campaign.json"

# 新規アポ打診の既定値。送信者情報・署名・日程調整リンクは名刺フォロー用の
# campaign.json から引き継ぐ(1か所で管理するため)。
COLD_DEFAULTS = {
    "subject": "【{to_last_name}様】空間デザインにおける木材調達や木質化に関する意見交換のご相談（{sender_company}／{sender_name}）",
    "template": "templates/cold_mail.txt",
    "exchange_word": "意見交換",
    "meeting_duration": "30分～1時間",
    "meeting_style": "オンラインでも、都内近郊であればご訪問も可能です。",
    # 宛先ごとに書き換える「ひとこと」の既定文
    "opening": "{company}様の設計における木材選定の課題や、今後の素材活用の可能性について、実例を交えて意見交換をさせていただければと思い、ご連絡いたしました。",
}

SPLIT = re.compile(r"[\t,、，]+")


def parse_targets(path: Path) -> list[dict]:
    rows = []
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        cells = [normalize_text(c) for c in SPLIT.split(line)]
        if cells[0] in ("会社名", "company"):
            continue
        if len(cells) < 3:
            print(f"列が足りない行を飛ばしました: {raw}", file=sys.stderr)
            continue
        company, name, email = cells[0], cells[1], cells[2]
        if "@" not in email:
            print(f"メールアドレスが3列目にない行を飛ばしました: {raw}", file=sys.stderr)
            continue
        parts = name.split(" ", 1)
        rows.append(
            {
                "company": company,
                "last_name": parts[0],
                "first_name": parts[1] if len(parts) > 1 else "",
                "name": display_name(parts[0], parts[1] if len(parts) > 1 else ""),
                "email": email.lower(),
                "department": cells[3] if len(cells) > 3 else "",
                "title": cells[4] if len(cells) > 4 else "",
                "opening": cells[5] if len(cells) > 5 else "",
            }
        )
    return rows


def make_group(row: dict, used_ids: set[str], default_opening: str) -> dict:
    base = slugify(row["email"].split("@")[1].split(".")[0], "target")
    group_id, suffix = base, 2
    while group_id in used_ids:
        group_id = f"{base}-{suffix}"
        suffix += 1
    used_ids.add(group_id)
    return {
        "id": group_id,
        "label": f"{row['company']} / {row['name']}",
        "company": row["company"],
        "department": row["department"],
        "event": "",
        "to": [row["email"]],
        "cc": [],
        # 宛先ごとに書き換える本文の一言(空なら既定文が入る)
        "talked_about": row["opening"] or default_opening,
        "purpose": "",
        "scheduling_url": "",
        "subject": "",
        "extra": "",
        "template": "",
        "greeting_override": [],
        "note": "",
        "skip": False,
        "status": "new",
        "members": [
            {
                "email": row["email"],
                "name": row["name"],
                "title": row["title"],
                "department": row["department"],
                "exchanged_on": "",
            }
        ],
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="担当者リストから新規アポ打診キャンペーンを作る")
    parser.add_argument("targets", help="担当者リスト(タブ/カンマ区切り)")
    parser.add_argument("--campaign", default=str(COLD_CAMPAIGN_PATH))
    parser.add_argument(
        "--append", action="store_true", help="既存のグループを残して追記する(既定は入れ替え)"
    )
    args = parser.parse_args()

    path = Path(args.targets)
    if not path.exists():
        print(f"{path} がありません", file=sys.stderr)
        return 1
    rows = parse_targets(path)
    if not rows:
        print("有効な行がありません", file=sys.stderr)
        return 1

    campaign_path = Path(args.campaign)
    existing = read_json(campaign_path, {}) or {}

    # 送信者情報・署名・リンク類は名刺フォロー用 campaign.json から引き継ぐ
    base = read_json(CAMPAIGN_PATH, {}) or {}
    inherited = {
        k: v
        for k, v in (base.get("defaults") or {}).items()
        if k in ("sender", "signature", "impact_report_url", "scheduling_url", "scheduling_lead", "cc_always")
    }
    defaults = existing.get("defaults") or {**inherited, **COLD_DEFAULTS}
    for key, value in {**inherited, **COLD_DEFAULTS}.items():
        defaults.setdefault(key, value)
    default_opening = defaults.get("opening", "")

    old_by_email = {}
    for group in existing.get("groups", []) if args.append or existing else []:
        for email in group.get("to", []):
            old_by_email[email] = group

    groups, used_ids = [], set()
    if args.append:
        for group in existing.get("groups", []):
            used_ids.add(group["id"])
            groups.append(group)

    added = 0
    for row in rows:
        old = old_by_email.get(row["email"])
        if old:
            if not args.append:
                groups.append(old)
                used_ids.add(old["id"])
            continue
        groups.append(make_group(row, used_ids, default_opening))
        added += 1

    write_json(
        campaign_path,
        {
            "campaign_id": existing.get("campaign_id", "cold-outreach"),
            "defaults": defaults,
            "events": {},
            "groups": groups,
        },
    )
    print(f"{len(groups)}件(新規 {added}件)を {campaign_path} に書き出しました")
    for group in groups:
        mark = "済" if group.get("status") == "sent" else "未"
        print(f"  [{mark}] {group['id']}: {group['label']} <{group['to'][0]}>")
    if TODO in str(defaults):
        print("※ defaults に要記入項目が残っています", file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
