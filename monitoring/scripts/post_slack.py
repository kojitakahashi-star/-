#!/usr/bin/env python3
"""Incoming Webhook 経由で Slack に投稿する（MCP コネクタが使えない環境向けフォールバック）。

usage:
    SLACK_WEBHOOK_URL=https://hooks.slack.com/services/... \
        python3 monitoring/scripts/post_slack.py findings.new.slack.json

定期実行セッションに Slack コネクタが載っていない場合、MCP の slack_send_message は
呼べない。そのときはこのスクリプトを使う。Webhook が未設定なら非ゼロで終了するので、
呼び出し側は「投稿できなかった」と判断して state をコミットせずに終われる。

Webhook はチャンネル固定・スレッド返信不可のため、複数メッセージは連投する。
"""
import json
import os
import sys
import time
import urllib.error
import urllib.request

WEBHOOK_ENV = "SLACK_WEBHOOK_URL"


def post(url, text):
    body = json.dumps({"text": text}).encode("utf-8")
    req = urllib.request.Request(
        url, data=body, headers={"Content-Type": "application/json"}, method="POST"
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        return resp.status, resp.read().decode("utf-8", "replace")


def main():
    if len(sys.argv) != 2:
        sys.exit("usage: post_slack.py <rendered.slack.json>")

    url = os.environ.get(WEBHOOK_ENV, "").strip()
    if not url:
        sys.exit(
            f"{WEBHOOK_ENV} が未設定です。Slack コネクタ（slack_send_message）が使えるなら\n"
            f"そちらで投稿してください。使えない場合は環境変数に Incoming Webhook URL を設定します。"
        )

    with open(sys.argv[1], encoding="utf-8") as f:
        payload = json.load(f)

    messages = payload["messages"]
    for i, text in enumerate(messages, 1):
        # Webhook はスレッドに繋げないので、2通目以降であることを本文で示す。
        if i > 1:
            text = f"_（続き {i}/{len(messages)}）_\n\n" + text
        for attempt in range(4):
            try:
                status, body = post(url, text)
                if status == 200:
                    print(f"message {i}/{len(messages)} 送信成功")
                    break
                raise RuntimeError(f"HTTP {status}: {body}")
            except (urllib.error.URLError, RuntimeError) as e:
                if attempt == 3:
                    sys.exit(f"message {i} の送信に失敗: {e}")
                time.sleep(2**attempt)
        time.sleep(1)

    print(f"{len(messages)}通すべて送信しました")


if __name__ == "__main__":
    main()
