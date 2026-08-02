#!/usr/bin/env python3
"""リサーチで拾った動きを state/seen.json と突合し、新規分だけを出力する。

usage:
    python3 monitoring/scripts/dedupe.py findings.json [--commit]

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

--commit を付けたときだけ state/seen.json を更新する。
付けなければ判定結果を出力するだけ（ドライラン）。
"""
import argparse
import hashlib
import json
import os
import re
import sys
from datetime import date, datetime, timedelta

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STATE_DIR = os.path.join(BASE, "state")
SEEN_PATH = os.path.join(STATE_DIR, "seen.json")

# 一度通知した動きを覚えておく期間。イベントは会期後しばらくで話題が尽きるため、
# 1年強を過ぎたキーは落として state を肥大させない。
RETENTION_DAYS = 400

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


def load_seen():
    if not os.path.exists(SEEN_PATH):
        return {}
    with open(SEEN_PATH, encoding="utf-8") as f:
        return json.load(f).get("entries", {})


def save_seen(entries, run_date):
    os.makedirs(STATE_DIR, exist_ok=True)
    cutoff = (datetime.strptime(run_date, "%Y-%m-%d").date() - timedelta(days=RETENTION_DAYS)).isoformat()
    kept = {k: v for k, v in entries.items() if v.get("first_seen", run_date) >= cutoff}
    payload = {
        "updated_at": run_date,
        "retention_days": RETENTION_DAYS,
        "count": len(kept),
        "entries": dict(sorted(kept.items())),
    }
    with open(SEEN_PATH, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)
        f.write("\n")
    return len(entries) - len(kept)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("findings")
    ap.add_argument("--commit", action="store_true", help="state/seen.json を更新する")
    ap.add_argument("--out", help="新規分の書き出し先（既定: <findings>.new.json）")
    args = ap.parse_args()

    with open(args.findings, encoding="utf-8") as f:
        data = json.load(f)

    run_date = data.get("run_date") or date.today().isoformat()
    findings = data.get("findings", [])

    for i, f in enumerate(findings):
        missing = [k for k in REQUIRED if not f.get(k)]
        if missing:
            sys.exit(f"findings[{i}]: 必須項目が空です: {missing}")

    seen = load_seen()
    new, dup = [], []
    # 同一実行内での重複（HPとSNSで同じ動きを二重に拾う）もここで潰す。
    within_run = set()
    for f in findings:
        key = finding_key(f)
        if key in seen or key in within_run:
            dup.append(f)
            continue
        within_run.add(key)
        f["_key"] = key
        f["first_seen"] = run_date
        new.append(f)

    out_path = args.out or args.findings.replace(".json", "") + ".new.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump({"run_date": run_date, "findings": new}, f, ensure_ascii=False, indent=2)
        f.write("\n")

    pruned = 0
    if args.commit:
        for f in new:
            seen[f["_key"]] = {
                "company": f["company"],
                "type": f["type"],
                "title": f["title"],
                "first_seen": run_date,
            }
        pruned = save_seen(seen, run_date)

    print(f"取得: {len(findings)}件 / 新規: {len(new)}件 / 既報: {len(dup)}件")
    if args.commit:
        print(f"state/seen.json 更新（{RETENTION_DAYS}日超過で {pruned}件を削除）")
    else:
        print("ドライラン（--commit 未指定のため state は未更新）")
    print(f"新規分: {out_path}")


if __name__ == "__main__":
    main()
