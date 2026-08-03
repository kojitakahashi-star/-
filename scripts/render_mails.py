#!/usr/bin/env python3
"""campaign.json とテンプレートから、グループごとのアポメール本文を生成する。

使い方:
    python3 scripts/render_mails.py                      # 全グループを out/mails/ に出力
    python3 scripts/render_mails.py --only tokumura      # 特定グループだけ
    python3 scripts/render_mails.py --event ev-0729      # イベント単位
    python3 scripts/render_mails.py --check              # 記入漏れの確認だけ(出力しない)

出力:
    out/mails/<group_id>.txt   人が読んで確認する用
    out/mails.json             to / cc / 件名 / 本文をまとめたJSON(Gmail下書き作成に使う)

「<<要記入...>>」が残っているグループは ready:false になり、警告を出す。
"""
from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

from outreach_common import (
    CAMPAIGN_PATH,
    REPO_ROOT,
    TODO,
    honorific,
    read_json,
    write_json,
)

PLACEHOLDER = re.compile(r"\{(\w+)\}")


def fill(text: str, values: dict[str, str]) -> str:
    return PLACEHOLDER.sub(lambda m: values.get(m.group(1), m.group(0)), text or "")


def jp_date(date: str) -> str:
    match = re.match(r"(\d{4})-(\d{2})-(\d{2})", date or "")
    if not match:
        return date or ""
    return f"{int(match.group(2))}月{int(match.group(3))}日"


def member_map(group: dict) -> dict[str, dict]:
    return {m["email"]: m for m in group.get("members", [])}


def build_header(group: dict) -> str:
    """宛名ブロック(会社名 / 部署 / to の氏名 / CCの氏名)を組み立てる。"""
    if group.get("greeting_override"):
        return "\n".join(group["greeting_override"])

    members = member_map(group)
    lines = [group.get("company", "")]
    if group.get("department"):
        lines.append(group["department"])
    for email in group.get("to", []):
        member = members.get(email, {})
        lines.append(honorific(member.get("name", email)))
    cc_names = [
        honorific(members.get(email, {}).get("name", email))
        for email in group.get("cc", [])
    ]
    if cc_names:
        lines.append("(CC: " + "、".join(cc_names) + ")")
    return "\n".join(line for line in lines if line)


def collapse_blank_lines(text: str) -> str:
    return re.sub(r"\n{3,}", "\n\n", text).strip() + "\n"


def render_group(group: dict, campaign: dict) -> dict:
    defaults = campaign.get("defaults", {})
    sender = defaults.get("sender", {})
    event = campaign.get("events", {}).get(group.get("event", ""), {})

    values = {
        "sender_company": sender.get("company", ""),
        "sender_name": sender.get("name", ""),
        "sender_title": sender.get("title", ""),
        "sender_email": sender.get("email", ""),
        "sender_tel": sender.get("tel", ""),
        "sender_url": sender.get("url", ""),
        "company": group.get("company", ""),
        "department": group.get("department", ""),
        "event_name": event.get("name", ""),
        "event_date": event.get("date", ""),
        "event_date_jp": jp_date(event.get("date", "")),
        "event_place": event.get("place", ""),
        "purpose": group.get("purpose") or defaults.get("purpose", ""),
        "scheduling_url": group.get("scheduling_url") or defaults.get("scheduling_url", ""),
        "talked_about": group.get("talked_about", ""),
    }
    if values["event_date_jp"] and values["event_name"]:
        values["event_line"] = f"{values['event_date_jp']}の{values['event_name']}"
    else:
        values["event_line"] = values["event_name"] or values["event_date_jp"]
    values["signature"] = fill("\n".join(defaults.get("signature", [])), values)
    values["header"] = build_header(group)
    extra = (group.get("extra") or "").strip()
    values["extra"] = f"\n{fill(extra, values)}\n" if extra else ""

    template_path = REPO_ROOT / (group.get("template") or defaults.get("template"))
    body = collapse_blank_lines(fill(template_path.read_text(encoding="utf-8"), values))
    subject = fill(group.get("subject") or defaults.get("subject", ""), values)

    todos = sorted(
        {
            m
            for field, text in (("件名", subject), ("本文", body))
            for m in re.findall(r"<<要記入[^>]*>>", text)
        }
    )
    unresolved = sorted(set(PLACEHOLDER.findall(body)) | set(PLACEHOLDER.findall(subject)))

    return {
        "id": group["id"],
        "label": group.get("label", ""),
        "event": group.get("event", ""),
        "to": group.get("to", []),
        "cc": group.get("cc", []),
        "subject": subject,
        "body": body,
        "ready": not todos and not unresolved,
        "todos": todos,
        "unresolved_placeholders": unresolved,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="アポメール本文を生成する")
    parser.add_argument("--campaign", default=str(CAMPAIGN_PATH))
    parser.add_argument("--only", help="グループIDをカンマ区切りで指定")
    parser.add_argument("--event", help="イベントIDで絞り込む")
    parser.add_argument("--outdir", default="out/mails")
    parser.add_argument("--json", dest="json_out", default="out/mails.json")
    parser.add_argument("--check", action="store_true", help="検証のみ(ファイルを書かない)")
    parser.add_argument("--include-skipped", action="store_true")
    args = parser.parse_args()

    campaign = read_json(Path(args.campaign))
    if not campaign:
        print(f"{args.campaign} がありません。campaign_init.py を先に実行してください。", file=sys.stderr)
        return 1

    only = {s.strip() for s in args.only.split(",")} if args.only else None
    groups = [
        g
        for g in campaign.get("groups", [])
        if (args.include_skipped or not g.get("skip"))
        and (only is None or g["id"] in only)
        and (args.event is None or g.get("event") == args.event)
    ]
    if not groups:
        print("対象グループがありません", file=sys.stderr)
        return 1

    rendered = [render_group(group, campaign) for group in groups]

    if not args.check:
        outdir = REPO_ROOT / args.outdir
        outdir.mkdir(parents=True, exist_ok=True)
        for mail in rendered:
            header = (
                f"To: {', '.join(mail['to'])}\n"
                f"Cc: {', '.join(mail['cc'])}\n"
                f"Subject: {mail['subject']}\n"
                + "=" * 40
                + "\n"
            )
            (outdir / f"{mail['id']}.txt").write_text(header + mail["body"], encoding="utf-8")
        write_json(REPO_ROOT / args.json_out, rendered)
        print(f"{len(rendered)}件を {args.outdir}/ と {args.json_out} に出力しました")

    ready = [m for m in rendered if m["ready"]]
    print(f"送信可: {len(ready)}件 / 要記入: {len(rendered) - len(ready)}件")
    for mail in rendered:
        mark = "OK " if mail["ready"] else "要記入"
        print(f"  [{mark}] {mail['id']} - {mail['label']}")
        for todo in mail["todos"]:
            print(f"        {todo}")
        for name in mail["unresolved_placeholders"]:
            print(f"        未解決プレースホルダ: {{{name}}}")
    return 0 if len(ready) == len(rendered) else 2


if __name__ == "__main__":
    sys.exit(main())
