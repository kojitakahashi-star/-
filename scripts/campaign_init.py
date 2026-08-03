#!/usr/bin/env python3
"""連絡先JSONから送信グループ(to / cc)の雛形 campaign.json を生成・更新する。

- 既定は「会社 + 部署」単位でまとめ、役職が上の人を to、残りを cc にする
- grouping.json の manual_groups に書いたメールアドレスは、その単位で強制的にまとめる
- 既に campaign.json がある場合、手で書いた内容(イベント・話した内容など)は保持し、
  新しく増えた人・グループだけを追記する

使い方:
    python3 scripts/campaign_init.py                 # 生成 / 差分更新
    python3 scripts/campaign_init.py --group-by company   # 部署を無視して会社単位に
    python3 scripts/campaign_init.py --force         # 既存の記入内容を捨てて作り直す
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

from outreach_common import (
    CAMPAIGN_PATH,
    CONTACTS_PATH,
    GROUPING_PATH,
    TODO,
    company_key,
    dept_key,
    read_json,
    slugify,
    write_json,
)

# グループ側で編集して使うフィールド(再生成しても引き継ぐ対象)
EDITABLE_FIELDS = (
    "event",
    "talked_about",
    "purpose",
    "scheduling_url",
    "subject",
    "extra",
    "template",
    "greeting_override",
    "note",
    "skip",
)

DEFAULTS = {
    "sender": {
        "company": "株式会社森未来",
        "name": f"{TODO}: 送信者氏名(例: 高橋 洸司)>>",
        "title": "",
        "email": "koji.takahashi@shin-mirai.co.jp",
        "tel": f"{TODO}: 電話番号>>",
        "url": "https://shin-mirai.co.jp/",
    },
    "signature": [
        "株式会社森未来",
        f"{TODO}: 部署 / 氏名>>",
        "〒106-0032 東京都港区六本木",
        "TEL: {sender_tel} / Mail: {sender_email}",
        "{sender_url}",
    ],
    "subject": "【{event_name}のお礼】{sender_company}よりお打ち合わせのお願い",
    "purpose": "木材の調達・ご提案サービス",
    "scheduling_url": f"{TODO}: 日程調整リンク(例: https://timerex.net/s/xxxx)>>",
    "template": "templates/apo_mail.txt",
}


def build_events(contacts: list[dict]) -> dict:
    """名刺交換日ごとにイベント枠を作る。イベント名は後から書き換える前提。"""
    events: dict[str, dict] = {}
    for date in sorted({c["exchanged_on"] for c in contacts if c["exchanged_on"]}):
        event_id = "ev-" + date.replace("-", "")[4:]
        events[event_id] = {
            "name": f"{TODO}: イベント名({date}開催)>>",
            "date": date,
            "place": "",
            "card_dates": [date],
            "note": "",
        }
    return events


def event_for(contact_dates: list[str], events: dict) -> str:
    for event_id, event in events.items():
        if any(date in event.get("card_dates", []) for date in contact_dates):
            return event_id
    return ""


def group_contacts(contacts: list[dict], manual_groups: list[dict], group_by: str):
    """(グループID, ラベル, メンバー) のリストを返す。"""
    manual_by_email: dict[str, dict] = {}
    for group in manual_groups:
        for email in group.get("emails", []):
            manual_by_email[email.lower()] = group

    buckets: dict[str, dict] = {}
    for contact in contacts:
        manual = manual_by_email.get(contact["email"])
        if manual:
            key = f"manual:{manual['id']}"
            label = manual.get("label", "")
        else:
            key = company_key(contact["company"])
            label = contact["company"]
            if group_by == "company_department":
                key = f"{key}|{dept_key(contact['department'])}"
                label = " / ".join(filter(None, [contact["company"], contact["department"]]))
        bucket = buckets.setdefault(
            key,
            {
                "id": manual["id"] if manual else "",
                "label": label,
                "members": [],
            },
        )
        bucket["members"].append(contact)

    groups = []
    used_ids: set[str] = set()
    for bucket in buckets.values():
        members = sorted(
            bucket["members"], key=lambda c: (-c["title_rank"], c["name"])
        )
        group_id = bucket["id"] or slugify(
            members[0]["email"].split("@")[1].split(".")[0], "group"
        )
        candidate, suffix = group_id, 2
        while candidate in used_ids:
            candidate = f"{group_id}-{suffix}"
            suffix += 1
        used_ids.add(candidate)
        groups.append((candidate, bucket["label"], members))
    return sorted(groups, key=lambda g: g[1])


def make_group(group_id: str, label: str, members: list[dict], events: dict) -> dict:
    dates = [m["exchanged_on"] for m in members if m["exchanged_on"]]
    depts = {m["department"] for m in members}
    return {
        "id": group_id,
        "label": label,
        "company": members[0]["company"],
        # 部署表記が全員一致するときだけ宛名に出す(表記ゆれ混在なら会社名のみ)
        "department": depts.pop() if len(depts) == 1 else "",
        "event": event_for(dates, events),
        "to": [members[0]["email"]],
        "cc": [m["email"] for m in members[1:]],
        "talked_about": f"{TODO}: 当日話した内容>>",
        "purpose": "",
        "scheduling_url": "",
        "subject": "",
        "extra": "",
        "template": "",
        "greeting_override": [],
        "note": "",
        "skip": False,
        "members": [
            {
                "email": m["email"],
                "name": m["name"],
                "title": m["title"],
                "department": m["department"],
                "exchanged_on": m["exchanged_on"],
            }
            for m in members
        ],
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="送信グループの雛形を生成・更新する")
    parser.add_argument(
        "--group-by",
        choices=["company_department", "company"],
        default="company_department",
        help="まとめ方(既定: 会社+部署)",
    )
    parser.add_argument("--campaign", default=str(CAMPAIGN_PATH))
    parser.add_argument("--force", action="store_true", help="既存の記入内容を破棄して作り直す")
    args = parser.parse_args()

    contacts = read_json(CONTACTS_PATH)
    if not contacts:
        print(
            "contacts.json がありません。先に scripts/cards_import.py を実行してください。",
            file=sys.stderr,
        )
        return 1

    campaign_path = Path(args.campaign)
    existing = {} if args.force else (read_json(campaign_path, {}) or {})
    manual_groups = (read_json(GROUPING_PATH, {}) or {}).get("manual_groups", [])

    events = existing.get("events") or build_events(contacts)
    for event_id, event in build_events(contacts).items():
        events.setdefault(event_id, event)

    old_groups = {g["id"]: g for g in existing.get("groups", [])}
    groups = []
    for group_id, label, members in group_contacts(contacts, manual_groups, args.group_by):
        group = make_group(group_id, label, members, events)
        old = old_groups.get(group_id)
        if old:
            for field in EDITABLE_FIELDS:
                if field in old:
                    group[field] = old[field]
            known = {m["email"] for m in group["members"]}
            group["to"] = [e for e in old.get("to", []) if e in known] or group["to"]
            group["cc"] = [
                e for e in old.get("cc", []) if e in known and e not in group["to"]
            ]
            added = [e for e in known if e not in group["to"] + group["cc"]]
            group["cc"].extend(sorted(added))
        groups.append(group)

    campaign = {
        "campaign_id": existing.get("campaign_id", "event-followup"),
        "defaults": existing.get("defaults") or DEFAULTS,
        "events": events,
        "groups": groups,
    }
    write_json(campaign_path, campaign)

    print(f"{len(groups)}グループ / {len(contacts)}名を {campaign_path} に書き出しました")
    for group in groups:
        to = ", ".join(group["to"])
        cc = ", ".join(group["cc"])
        print(f"  [{group['id']}] {group['label']}")
        print(f"      to: {to}" + (f" / cc: {cc}" if cc else ""))
    return 0


if __name__ == "__main__":
    sys.exit(main())
