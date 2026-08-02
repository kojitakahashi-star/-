#!/usr/bin/env python3
"""Slack 投稿の成否を state に反映する。state を書き換える唯一のスクリプト。

usage:
    # 投稿できた
    python3 monitoring/scripts/finalize.py --delivered findings.new.json
    # 投稿できなかった（A も B も駄目だった）
    python3 monitoring/scripts/finalize.py --failed findings.new.json

--delivered: 通知済みとして seen.json に記録し、pending.json を空にする。
--failed:    seen.json は触らず、pending.json に積む。次回の実行で自動的に合流し、
             再度通知が試みられる。これで「投稿に失敗した動きが消える」ことがなくなる。
"""
import argparse
import json
import os
import sys
from datetime import datetime, timedelta

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STATE_DIR = os.path.join(BASE, "state")
SEEN_PATH = os.path.join(STATE_DIR, "seen.json")
PENDING_PATH = os.path.join(STATE_DIR, "pending.json")

# 一度通知した動きを覚えておく期間。イベントは会期後しばらくで話題が尽きるため、
# 1年強を過ぎたキーは落として state を肥大させない。
RETENTION_DAYS = 400


def load_json(path, default):
    if not os.path.exists(path):
        return default
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def write_json(path, payload):
    os.makedirs(STATE_DIR, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)
        f.write("\n")


def mark_delivered(findings, run_date):
    doc = load_json(SEEN_PATH, {})
    entries = doc.get("entries", {})
    for f in findings:
        key = f.get("_key")
        if not key:
            sys.exit("_key がありません。dedupe.py を通した出力を渡してください。")
        entries[key] = {
            "company": f["company"],
            "type": f["type"],
            "title": f["title"],
            "first_seen": f.get("first_seen", run_date),
        }

    cutoff = (datetime.strptime(run_date, "%Y-%m-%d").date() - timedelta(days=RETENTION_DAYS)).isoformat()
    kept = {k: v for k, v in entries.items() if v.get("first_seen", run_date) >= cutoff}
    pruned = len(entries) - len(kept)

    write_json(
        SEEN_PATH,
        {
            "updated_at": run_date,
            "retention_days": RETENTION_DAYS,
            "count": len(kept),
            "entries": dict(sorted(kept.items())),
        },
    )
    write_json(PENDING_PATH, {"updated_at": run_date, "failed_runs": 0, "findings": []})
    print(f"配信済みとして {len(findings)}件を記録（{RETENTION_DAYS}日超過の {pruned}件を整理）")
    print("pending.json をクリアしました。")


def mark_failed(findings, run_date):
    prev = load_json(PENDING_PATH, {})
    failed_runs = prev.get("failed_runs", 0) + 1
    for f in findings:
        f.pop("_carried_over", None)
    write_json(
        PENDING_PATH,
        {"updated_at": run_date, "failed_runs": failed_runs, "findings": findings},
    )
    print(f"投稿失敗として {len(findings)}件を pending.json に積みました（失敗 {failed_runs}回目）")
    print("seen.json は更新していません。次回の実行で再度通知が試みられます。")
    if failed_runs >= 2:
        print(f"警告: {failed_runs}回続けて配信できていません。Slackの設定を確認してください。")


def main():
    ap = argparse.ArgumentParser()
    g = ap.add_mutually_exclusive_group(required=True)
    g.add_argument("--delivered", metavar="FILE")
    g.add_argument("--failed", metavar="FILE")
    args = ap.parse_args()

    path = args.delivered or args.failed
    data = load_json(path, None)
    if data is None:
        sys.exit(f"ファイルがありません: {path}")

    run_date = data["run_date"]
    findings = data.get("findings", [])

    if args.delivered:
        if not findings:
            # 0件でも「動きなし」を投稿している。pending をクリアして正常終了。
            write_json(PENDING_PATH, {"updated_at": run_date, "failed_runs": 0, "findings": []})
            print("新規0件。pending.json をクリアしました。")
            return
        mark_delivered(findings, run_date)
    else:
        if not findings:
            print("積むものがありません（新規0件の回の投稿失敗）。state は変更しません。")
            return
        mark_failed(findings, run_date)


if __name__ == "__main__":
    main()
