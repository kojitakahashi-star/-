# Routine 登録用プロンプト（Routines UI に貼り付ける本文）

claude.ai → Routines で以下を設定する。既存の
`企業イベント動向モニタリング（2日に1回）` は削除して、こちらに置き換える。

- **名前**: 企業イベント動向モニタリング（2日に1回）
- **スケジュール**: 2日に1回 / 日本時間 朝7時ごろ（UTC cron `55 21 */2 * *`）
- **完了通知**: **プッシュ通知とメールを ON にする** ← 現状これが実質の通知手段
- **コネクタ**: Slack を有効にする（投稿記録用。ただし本人名義なのでメンション通知は鳴らない）
- **プロンプト**: 以下の `---` の間をそのままコピーする

---

内装/空間プロデュース会社・設計事務所・ゼネコン・デベロッパー等115社のイベント動向を定期リサーチし、動きのあった企業をSlackに投稿するタスクです。

## 手順

1. リポジトリ kojitakahashi-star/- の作業ブランチに切り替え、事前確認する:

```bash
git fetch origin claude/company-event-monitoring-system-ahte64
git checkout claude/company-event-monitoring-system-ahte64
git pull origin claude/company-event-monitoring-system-ahte64
python3 monitoring/scripts/build_companies.py
python3 monitoring/scripts/preflight.py
```

2. `monitoring/RESEARCH_PROMPT.md` を読み、**そこに書かれた手順を最初から最後まで実行する**。これが唯一の正の手順書です。この指示文と食い違う場合は RESEARCH_PROMPT.md を優先してください。

## 要点（詳細は手順書に記載）

- `monitoring/companies.json` の115社を、`batch` 1〜12 ごとに general-purpose エージェントを並列起動して調査する（1体あたり約10社）。
- 調べる情報源: 公式HPのお知らせ/ニュース、イベント・セミナーページ、実績・事例ページ、公式SNS（X/Instagram/Facebook/LinkedIn/YouTube/note）、社員個人のSNSでの登壇告知、外部イベントサイトの出展社・登壇者一覧、業界メディア（PR TIMES 等）。
- **WebSearch を主軸にすること。** 日本の企業サイトの多くは WebFetch を HTTP 403 で弾く（丹青社・船場・博展で確認済み）。403 を「情報がない」と判断しないこと。
- 拾う動き: 出展 / 登壇 / 自社イベント / 受賞 / 新規プロジェクト実績。公開日が直近10日以内、または今後180日以内に開催予定のもの。
- URLは WebFetch で開けたもの、または WebSearch の結果に出てきたものだけを書く。推測でURLや日付を組み立てないこと。捏造は絶対にしない。
- `monitoring/scripts/dedupe.py <file>` で既報を除外＋前回の積み残しを合流させ、`monitoring/scripts/render_slack.py <file>.new.json --scanned 115` で整形する。

## 投稿

- まず `python3 monitoring/scripts/post_slack.py <file>.new.slack.json` を試す（SLACK_BOT_TOKEN / SLACK_WEBHOOK_URL があればアプリ名義で投稿でき、メンション通知が鳴る）。
- それが使えなければ `slack_send_message` でチャンネル `C0BDAFB0X63` に投稿する。2通目以降は1通目の ts を thread_ts にしてスレッド返信する。**この経路は本人名義の投稿になりメンション通知が鳴らない**ため、本文の先頭に「:warning: _この投稿は本人名義のため通知が鳴りません_」を必ず足すこと。

## 投稿後（飛ばさないこと）

- 成功: `python3 monitoring/scripts/finalize.py --delivered <file>.new.json`
- 全部失敗: `python3 monitoring/scripts/finalize.py --failed <file>.new.json`（seen は触らず pending に積む。次回の実行で自動的に再通知される）。あわせてレポートを `monitoring/reports/YYYY-MM-DD.md` に保存する。
- 成否にかかわらず `monitoring/state` 等をコミットして `git push -u origin claude/company-event-monitoring-system-ahte64` する。

## 最終出力（プッシュ通知・メールに載るので必ず書く）

この Routine は完了通知が高橋さんのスマホとメールに届きます。Slackのメンション通知は現状鳴らないため、**この最終出力が実質の通知本文**です。次を簡潔に書いてください。

1. 何社調べて、何社に動きがあったか
2. 動きがあった企業名と、その動きの一言要約（優先度A/Bの企業を先に）
3. Slackへの投稿が成功したかどうか、鳴らない経路で投稿した場合はその旨

新しい動きが0件でも、メンションなしの1行サマリをSlackに投稿してください。
プルリクエストは作成しないでください。

---

## 補足: Slackのメンション通知を鳴らせるようにするには

現状ブロックされている理由は2つ（どちらも検証済み）。

1. MCPコネクタは高橋さん本人の名義で投稿するため、自分宛メンションは Slack の仕様で鳴らない。
2. 実行環境から `slack.com` / `hooks.slack.com` へ出られない（組織のegressポリシーで CONNECT が 403）。
   そのためアプリ名義で投稿する bot token / Webhook が使えない。

**解消手順**: 組織のegressポリシーで `hooks.slack.com` を許可 → Slack で Incoming Webhook を発行
→ 実行環境の環境変数 `SLACK_WEBHOOK_URL` に設定。コードは実装・テスト済みなので、
これだけでアプリ名義の投稿に切り替わり、メンション通知が鳴るようになる。
`slack.com` も許可できるなら `SLACK_BOT_TOKEN` の方がスレッド返信も使えて望ましい。
