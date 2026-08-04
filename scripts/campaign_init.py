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
    "meeting_duration",
    "meeting_style",
    "scheduling_lead",
    "impact_report_url",
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
        "name": "高橋 幸司",
        "short_name": "高橋",
        "title": "",
        "email": "koji.takahashi@shin-mirai.co.jp",
        "mobile": "08069972075",
        "tel": "03-6453-9234",
        "fax": "03-6453-9275",
        "address": "〒108-0014 東京都港区芝5-27-6 泉田町ビル6F",
        "url": "https://shin-mirai.co.jp/",
    },
    # 普段のメール署名(Gmailの送信済みメールと同じ内容)
    "signature": [
        "-----",
        "株式会社森未来 高橋 幸司",
        "MAIL：koji.takahashi@shin-mirai.co.jp",
        "MOBILE：08069972075",
        "",
        "★eTREE主催・共催のイベント情報",
        "今後の開催予定のイベントはこちら https://go.etree.jp/l/785863/2022-10-31/l7mvm",
        "★森林・木材に関するイベントをお持ちの方へ",
        "「森林と木材のイベントポータル」では無料で掲載を受け付けております。",
        "▷ 掲載を申し込む（Googleフォーム https://docs.google.com/forms/d/e/1FAIpQLScEBeZVmqRCRcYWD2GC6bjlimFw6SAIvwEKS-fFiCJtCp-rCQ/viewform）",
        "▷ イベントポータルとは？→詳しくはこちら https://www.etree.jp/content/11149",
        "eTREE（森未来サービス）: https://www.etree.jp/",
        "〒108-0014 東京都港区芝5-27-6 泉田町ビル6F",
        "TEL：03-6453-9234",
        "FAX：03-6453-9275",
        "https://shin-mirai.co.jp/",
    ],
    "impact_report_url": "https://speakerdeck.com/shinmirai/zhu-shi-hui-she-sen-wei-lai-inpakutorepoto2025-dot-12",
    "subject": "【{event_name}】ご挨拶のお礼と情報交換のお願い({sender_company})",
    "purpose": "弊社で扱っている木材や納入事例",
    "meeting_duration": "30分～1時間",
    "meeting_style": "オンラインでも、ご訪問でも構いません。",
    "scheduling_lead": "下記のいずれのURLからでもご予約いただけますので、ご都合のよい日時をお選びいただけますと幸いです。",
    # 日程調整リンク(文字列 / リスト / {"label","url"} のリストが使える)
    "scheduling_url": [
        "https://calendar.app.google/uMg6sUAPWo4Jidts6",
        "https://calendar.app.google/4ingyZZWjcVKX6Pa6",
    ],
    "template": "templates/apo_mail_short.txt",
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
            "scheduling_url": "",
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
                "manual": manual,
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
        groups.append((candidate, bucket["label"], members, bucket.get("manual")))
    return sorted(groups, key=lambda g: g[1])


def make_group(
    group_id: str,
    label: str,
    members: list[dict],
    events: dict,
    manual: dict | None = None,
) -> dict:
    dates = [m["exchanged_on"] for m in members if m["exchanged_on"]]
    depts = {m["department"] for m in members}
    emails = [m["email"] for m in members]
    forced_to = [e.lower() for e in (manual or {}).get("to", []) if e.lower() in emails]
    to = forced_to or [emails[0]]
    return {
        "id": group_id,
        "label": label,
        "company": members[0]["company"],
        # 部署表記が全員一致するときだけ宛名に出す(表記ゆれ混在なら会社名のみ)
        "department": depts.pop() if len(depts) == 1 else "",
        "event": event_for(dates, events),
        "to": to,
        "cc": [e for e in emails if e not in to],
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

    # 既存イベントで拾えていない名刺交換日があれば、新しいイベント枠だけを追加する
    events = existing.get("events") or {}
    covered = {d for ev in events.values() for d in ev.get("card_dates", [])}
    for event_id, event in build_events(contacts).items():
        if not set(event["card_dates"]) & covered:
            events[event_id] = event

    old_groups = {g["id"]: g for g in existing.get("groups", [])}
    groups = []
    for group_id, label, members, manual in group_contacts(
        contacts, manual_groups, args.group_by
    ):
        group = make_group(group_id, label, members, events, manual)
        old = old_groups.get(group_id)
        if old:
            for field in EDITABLE_FIELDS:
                if field in old:
                    group[field] = old[field]
            known = {m["email"] for m in group["members"]}
            # grouping.json で to を明示しているグループは、そちらを優先する
            if not (manual or {}).get("to"):
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
