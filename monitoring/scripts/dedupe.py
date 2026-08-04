#!/usr/bin/env python3
"""リサーチで拾った動きを state と突合し、今回通知すべき分だけを出力する。

usage:
    python3 monitoring/scripts/dedupe.py findings.json [--no-pending]

findings.json の形式:
    {"run_date": "YYYY-MM-DD", "findings": [ {...}, ... ]}

各 finding:
    company        会社名（companies.tsv の表記と一致させる）
    category       カテゴリ
    type           出展 / 登壇 / 自社イベント / 受賞 / 新規プロジェクト実績
    title          見出し
    event_name     イベント名（該当する場合）
    date           開催日・公開日（"2026-09-10〜2026-09-12" など自由記述）
    location       場所
    people         登壇者など（配列）
    summary        2〜3行の要約
    source_type    HP / 公式SNS / イベントページ / お知らせ / 社員SNS / メディア
    source_urls    参照URL（配列）

出力される「今回通知すべき分」= 前回までに配信できなかった積み残し（pending）
                                + 今回新しく見つかった分（seen に無いもの）

**このスクリプトは state を書き換えない。**
state の更新は Slack 投稿の成否が確定したあとに finalize.py が行う。
投稿前に「通知済み」にしてしまうと、投稿に失敗した動きが永久に埋もれるため。
"""
import argparse
import hashlib
import json
import os
import re
import sys
from datetime import date

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STATE_DIR = os.path.join(BASE, "state")
SEEN_PATH = os.path.join(STATE_DIR, "seen.json")
PENDING_PATH = os.path.join(STATE_DIR, "pending.json")

REQUIRED = ("company", "type", "title")


def normalize(text):
    """表記ゆれを吸収してキーを安定させる。

    同じ動きが「HPのお知らせ」と「X投稿」で別文言になっても同一と見なしたいので、
    記号・空白・全角半角の差は潰す。
    """
    if not text:
        return ""
    s = str(text)
    s = s.translate(str.maketrans("０１２３４５６７８９", "0123456789"))
    s = s.replace("〜", "~").replace("～", "~")
    s = re.sub(r"[\s　]+", "", s)
    s = re.sub(r"[!-/:-@\[-`{-~。、・「」『』（）()【】〈〉《》]", "", s)
    return s.lower()


def finding_key(f):
    parts = [
        normalize(f.get("company")),
        normalize(f.get("type")),
        normalize(f.get("event_name") or f.get("title")),
        normalize(f.get("date")),
    ]
    return hashlib.sha1("|".join(parts).encode("utf-8")).hexdigest()[:16]


def load_json(path, default):
    if not os.path.exists(path):
        return default
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("findings")
    ap.add_argument(
        "--no-pending",
        action="store_true",
        help="前回の積み残しを合流させない（通常は指定しない）",
    )
    ap.add_argument("--out", help="出力先（既定: <findings>.new.json）")
    # 旧仕様では dedupe が state を更新していた。古い手順書やRoutineのプロンプトが
    # --commit を付けて呼んでも落ちないよう、受け取るだけの無効オプションとして残す。
    ap.add_argument("--commit", action="store_true", help=argparse.SUPPRESS)
    args = ap.parse_args()

    if args.commit:
        print("注意: --commit は廃止されました（このオプションは無視されます）。")
        print("      state の更新は投稿後に finalize.py で行ってください。")

    data = load_json(args.findings, {})
    run_date = data.get("run_date") or date.today().isoformat()
    findings = data.get("findings", [])

    for i, f in enumerate(findings):
        missing = [k for k in REQUIRED if not f.get(k)]
        if missing:
            sys.exit(f"findings[{i}]: 必須項目が空です: {missing}")

    seen = load_json(SEEN_PATH, {}).get("entries", {})
    pending_doc = load_json(PENDING_PATH, {})
    pending = [] if args.no_pending else pending_doc.get("findings", [])

    out_findings = []
    used = set()

    # 積み残しを先に載せる。前回配信できなかったものを取りこぼさないため。
    for f in pending:
        key = f.get("_key") or finding_key(f)
        if key in used:
            continue
        used.add(key)
        f["_key"] = key
        f.setdefault("first_seen", pending_doc.get("updated_at") or run_date)
        f["_carried_over"] = True
        out_findings.append(f)

    fresh, dup = 0, 0
    for f in findings:
        key = finding_key(f)
        if key in seen or key in used:
            dup += 1
            continue
        used.add(key)
        f["_key"] = key
        f["first_seen"] = run_date
        out_findings.append(f)
        fresh += 1

    out_path = args.out or args.findings.replace(".json", "") + ".new.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump({"run_date": run_date, "findings": out_findings}, f, ensure_ascii=False, indent=2)
        f.write("\n")

    carried = len(out_findings) - fresh
    print(f"取得: {len(findings)}件 / 新規: {fresh}件 / 既報: {dup}件 / 前回積み残し: {carried}件")
    if carried:
        print(f"  ※ 前回配信できなかった {carried}件を合流させました（失敗 {pending_doc.get('failed_runs', 0)}回目）")
    print(f"今回通知すべき分: {len(out_findings)}件 -> {out_path}")
    print("state は未更新。投稿後に finalize.py を必ず実行すること。")


if __name__ == "__main__":
    main()
