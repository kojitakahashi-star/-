#!/usr/bin/env python3
"""Slack アプリ名義で投稿する。**これが本命の投稿経路。**

usage:
    python3 monitoring/scripts/post_slack.py findings.new.slack.json

なぜ MCP の slack_send_message ではなくこちらが本命か:
    MCP コネクタは「高橋さん本人のアカウント」として投稿するため、本文中の
    <@U063SJG0N0L> は自分から自分へのメンションになり、**Slack の通知が鳴らない**。
    Bot トークン / Incoming Webhook はアプリ名義で投稿するので、
    同じメンションがきちんと通知として届く。

対応する認証（上から順に試す）:
    1. SLACK_BOT_TOKEN    xoxb-... 推奨。スレッド返信ができ、チャンネルも変更できる。
                          アプリに chat:write 権限を付け、投稿先チャンネルに招待しておくこと。
    2. SLACK_WEBHOOK_URL  https://hooks.slack.com/services/... 次善。
                          チャンネル固定・スレッド返信不可（複数通は連投になる）。

どちらも未設定なら非ゼロ終了する。呼び出し側は「投稿できなかった」と判断して
finalize.py --failed に回すこと（積み残しとして次回リトライされる）。
"""
import json
import os
import sys
import time
import urllib.error
import urllib.request

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TOKEN_ENV = "SLACK_BOT_TOKEN"
WEBHOOK_ENV = "SLACK_WEBHOOK_URL"
RETRIES = 4


def _request(url, data, headers):
    req = urllib.request.Request(url, data=data, headers=headers, method="POST")
    with urllib.request.urlopen(req, timeout=30) as resp:
        return resp.status, resp.read().decode("utf-8", "replace")


def with_retry(fn, label):
    """一時的なネットワーク断で通知を落とさないよう指数バックオフで粘る。"""
    for attempt in range(RETRIES):
        try:
            return fn()
        except Exception as e:  # noqa: BLE001 - 失敗理由は呼び出し元に集約して報告する
            if attempt == RETRIES - 1:
                raise RuntimeError(f"{label}: {e}") from e
            time.sleep(2**attempt)


def post_via_bot(token, channel, messages):
    """chat.postMessage。1通目をチャンネルへ、2通目以降はそのスレッドへ返信する。"""
    headers = {
        "Content-Type": "application/json; charset=utf-8",
        "Authorization": f"Bearer {token}",
    }
    thread_ts = None
    for i, text in enumerate(messages, 1):
        payload = {"channel": channel, "text": text}
        if thread_ts:
            payload["thread_ts"] = thread_ts

        def send(p=payload):
            status, body = _request(
                "https://slack.com/api/chat.postMessage",
                json.dumps(p).encode("utf-8"),
                headers,
            )
            result = json.loads(body)
            if not result.get("ok"):
                raise RuntimeError(f"HTTP {status} / {result.get('error')}")
            return result

        result = with_retry(send, f"message {i}")
        if thread_ts is None:
            thread_ts = result["ts"]
        print(f"message {i}/{len(messages)} 送信成功（bot token）")
        time.sleep(0.5)
    return thread_ts


def post_via_webhook(url, messages):
    """Incoming Webhook。スレッドに繋げないので複数通は連投する。"""
    headers = {"Content-Type": "application/json"}
    for i, text in enumerate(messages, 1):
        if i > 1:
            text = f"_（続き {i}/{len(messages)}）_\n\n" + text

        def send(t=text):
            status, body = _request(url, json.dumps({"text": t}).encode("utf-8"), headers)
            if status != 200:
                raise RuntimeError(f"HTTP {status}: {body}")

        with_retry(send, f"message {i}")
        print(f"message {i}/{len(messages)} 送信成功（webhook）")
        time.sleep(1)


def main():
    if len(sys.argv) != 2:
        sys.exit("usage: post_slack.py <rendered.slack.json>")

    with open(sys.argv[1], encoding="utf-8") as f:
        messages = json.load(f)["messages"]
    with open(os.path.join(BASE, "config.json"), encoding="utf-8") as f:
        channel = json.load(f)["slack"]["channel_id"]

    token = os.environ.get(TOKEN_ENV, "").strip()
    webhook = os.environ.get(WEBHOOK_ENV, "").strip()

    if token:
        try:
            ts = post_via_bot(token, channel, messages)
            print(f"{len(messages)}通すべて送信しました（アプリ名義 / thread_ts={ts}）")
            return
        except Exception as e:  # noqa: BLE001
            print(f"bot token での投稿に失敗: {e}", file=sys.stderr)
            if not webhook:
                sys.exit(1)
            print("Webhook にフォールバックします", file=sys.stderr)

    if webhook:
        post_via_webhook(webhook, messages)
        print(f"{len(messages)}通すべて送信しました（アプリ名義 / webhook）")
        return

    sys.exit(
        f"{TOKEN_ENV} も {WEBHOOK_ENV} も未設定です。\n"
        f"MCP の slack_send_message は本人名義の投稿になり、自分宛メンションでは\n"
        f"通知が鳴らないため、通知を届けるにはどちらかの設定が必須です。"
    )


if __name__ == "__main__":
    main()
