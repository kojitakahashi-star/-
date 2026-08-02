#!/usr/bin/env python3
"""新規の動きを Slack 投稿用テキストに整形する。

usage:
    python3 monitoring/scripts/render_slack.py findings.new.json [--scanned 115]

出力は JSON:
    {"mention": bool, "messages": ["1通目（チャンネル本投稿）", "2通目以降（スレッド返信）", ...]}

Slack の1メッセージ上限に収まるよう項目境界で分割する。
動きが0件のときはメンションを付けない（無駄な通知で疲れさせないため）。
"""
import argparse
import json
import os

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Slack の上限は 5000 字。整形の余白を見て安全側に切る。
CHUNK_LIMIT = 3600

TYPE_ORDER = ["出展", "登壇", "自社イベント", "受賞", "新規プロジェクト実績"]
TYPE_EMOJI = {
    "出展": ":convenience_store:",
    "登壇": ":microphone:",
    "自社イベント": ":tada:",
    "受賞": ":trophy:",
    "新規プロジェクト実績": ":building_construction:",
}
PRIORITY_BADGE = {"A": ":red_circle:", "B": ":large_orange_circle:", "C": ":large_blue_circle:", "D": ":white_circle:"}


def load_companies():
    path = os.path.join(BASE, "companies.json")
    with open(path, encoding="utf-8") as f:
        return {c["name"]: c for c in json.load(f)["companies"]}


def render_entry(f, companies):
    c = companies.get(f["company"], {})
    prio = c.get("priority", "D")
    cards = c.get("business_cards")
    cards_txt = f"名刺{cards}枚" if cards else "名刺情報なし"
    cat = f.get("category") or c.get("category") or ""

    lines = [f"{PRIORITY_BADGE[prio]} *{f['company']}*　_{cat} / {cards_txt}_"]
    lines.append(f"　{f['title']}")

    meta = []
    if f.get("event_name") and f["event_name"] != f["title"]:
        meta.append(f"イベント: {f['event_name']}")
    if f.get("date"):
        meta.append(f"日程: {f['date']}")
    if f.get("location"):
        meta.append(f"会場: {f['location']}")
    people = f.get("people") or []
    if people:
        meta.append(f"登壇/関係者: {'、'.join(people)}")
    for m in meta:
        lines.append(f"　• {m}")

    if f.get("summary"):
        lines.append(f"　> {f['summary']}")

    urls = f.get("source_urls") or []
    if urls:
        src = f.get("source_type") or "出典"
        links = " / ".join(f"<{u}|{src}{i + 1}>" for i, u in enumerate(urls[:3]))
        lines.append(f"　:link: {links}")

    return "\n".join(lines)


def chunk(header, blocks, footer):
    """ヘッダ + 本文ブロック群 + フッタを、項目の途中で切らずに分割する。"""
    messages = []
    cur = header
    for b in blocks:
        candidate = cur + "\n\n" + b if cur else b
        if len(candidate) > CHUNK_LIMIT and cur:
            messages.append(cur)
            cur = b
        else:
            cur = candidate
    if footer:
        if len(cur) + len(footer) + 2 > CHUNK_LIMIT:
            messages.append(cur)
            cur = footer
        else:
            cur = cur + "\n\n" + footer
    if cur:
        messages.append(cur)
    return messages


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("findings")
    ap.add_argument("--scanned", type=int, default=0, help="今回調査した企業数")
    ap.add_argument("--out", default=None)
    args = ap.parse_args()

    with open(args.findings, encoding="utf-8") as f:
        data = json.load(f)
    run_date = data["run_date"]
    findings = data.get("findings", [])

    with open(os.path.join(BASE, "config.json"), encoding="utf-8") as f:
        cfg = json.load(f)
    uid = cfg["slack"]["mention_user_id"]

    companies = load_companies()

    if not findings:
        msg = (
            f":mag: *企業イベント動向モニタリング（{run_date}）*\n"
            f"{args.scanned}社を調査しましたが、前回以降の新しい動きは見つかりませんでした。"
        )
        result = {"mention": False, "messages": [msg]}
    else:
        by_type = {}
        for f in findings:
            by_type.setdefault(f.get("type", "その他"), []).append(f)

        order = {t: i for i, t in enumerate(TYPE_ORDER)}
        prio_order = {"A": 0, "B": 1, "C": 2, "D": 3}

        n_companies = len({f["company"] for f in findings})
        counts = "、".join(
            f"{t} {len(by_type[t])}件"
            for t in sorted(by_type, key=lambda t: order.get(t, 99))
        )
        header = (
            f"<@{uid}>\n"
            f":mag: *企業イベント動向モニタリング（{run_date}）*\n"
            f"{args.scanned}社を調査 → *{n_companies}社* に新しい動きがありました（{counts}）\n"
            f"{PRIORITY_BADGE['A']}名刺20枚以上 {PRIORITY_BADGE['B']}5〜19枚 "
            f"{PRIORITY_BADGE['C']}1〜4枚 {PRIORITY_BADGE['D']}接点情報なし"
        )

        blocks = []
        for t in sorted(by_type, key=lambda t: order.get(t, 99)):
            items = sorted(
                by_type[t],
                key=lambda f: (
                    prio_order.get(companies.get(f["company"], {}).get("priority", "D"), 3),
                    -(companies.get(f["company"], {}).get("business_cards") or 0),
                    f["company"],
                ),
            )
            blocks.append(f"{TYPE_EMOJI.get(t, ':pushpin:')} *【{t}】{len(items)}件*")
            blocks.extend(render_entry(f, companies) for f in items)

        footer = "_2日に1回自動実行 / 対象企業の編集は `monitoring/companies.tsv`_"
        result = {"mention": True, "messages": chunk(header, blocks, footer)}

    out = args.out or args.findings.replace(".json", "") + ".slack.json"
    with open(out, "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)
        f.write("\n")

    print(f"{len(result['messages'])}通のメッセージを生成 -> {out}")
    for i, m in enumerate(result["messages"], 1):
        print(f"--- message {i} ({len(m)}字) ---")
        print(m)


if __name__ == "__main__":
    main()
