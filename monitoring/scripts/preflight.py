#!/usr/bin/env python3
"""リサーチを始める前に、配信できる状態かを確認する。

usage:
    python3 monitoring/scripts/preflight.py

115社の調査には30〜60分かかる。調べ終えてから「投稿できません」では時間が無駄になるので、
先に配信経路と積み残しの状況を確認する。

経路Bの可否だけはここで判定できる（環境変数の有無）。
経路A（Slackコネクタ）は実際にツールが生えているかで判断するため、
このスクリプトではなく実行セッション自身が確認する。
"""
import json
import os
import sys

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def load_json(path, default):
    if not os.path.exists(path):
        return default
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def main():
    ok = True

    cfg = load_json(os.path.join(BASE, "config.json"), None)
    if not cfg:
        print("NG  config.json が読めません")
        sys.exit(1)
    ch = cfg["slack"]["channel_id"]
    print(f"OK  投稿先チャンネル: {ch}（{cfg['slack']['channel_name']}）")
    print(f"OK  メンション先: {cfg['slack']['mention_user_id']}（{cfg['slack']['mention_display_name']}）")

    companies = load_json(os.path.join(BASE, "companies.json"), None)
    if not companies:
        print("NG  companies.json がありません。build_companies.py を実行してください")
        ok = False
    else:
        print(f"OK  対象企業: {companies['total']}社 / {companies['batch_count']}バッチ")

    webhook = os.environ.get("SLACK_WEBHOOK_URL", "").strip()
    if webhook:
        print("OK  経路B（Incoming Webhook）: SLACK_WEBHOOK_URL 設定済み")
    else:
        print("--  経路B（Incoming Webhook）: 未設定")
        print("    経路A（Slackコネクタ）が使えない場合、投稿できません。")
        print("    その場合でも結果は pending.json に積まれ、次回に再通知されます。")

    pending = load_json(os.path.join(BASE, "state", "pending.json"), {})
    n_pending = len(pending.get("findings", []))
    failed_runs = pending.get("failed_runs", 0)
    if n_pending:
        print(f"!!  前回の積み残し: {n_pending}件（配信失敗 {failed_runs}回目）")
        print("    今回の結果と合流して通知されます。")
    else:
        print("OK  積み残しなし")

    seen = load_json(os.path.join(BASE, "state", "seen.json"), {})
    print(f"OK  通知済み記録: {seen.get('count', 0)}件（最終更新 {seen.get('updated_at')}）")

    print()
    print("経路A（Slackコネクタ）が使えるかは、slack_send_message ツールが")
    print("利用可能かどうかで判断すること。使えなければ経路Bへ、それも駄目なら")
    print("finalize.py --failed で積み残しに回す。")

    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    main()
