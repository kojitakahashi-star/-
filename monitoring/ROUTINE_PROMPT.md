# Routine 登録用プロンプト（claude.ai の Routines UI に貼り付ける本文）

claude.ai → Routines → 新規作成 で、以下を設定する。

- **名前**: 企業イベント動向モニタリング（2日に1回）
- **スケジュール**: 2日に1回 / 日本時間 朝7時ごろ（UTC cron `55 21 */2 * *`）
- **コネクタ**: **Slack を必ず有効にする**（これが無いと投稿できない）
- **プロンプト**: 以下の `---` の間をそのままコピーする

---

内装/空間プロデュース会社・設計事務所・ゼネコン・デベロッパー等115社のイベント動向を定期リサーチし、動きのあった企業をSlackで通知するタスクです。

## 手順

1. リポジトリ kojitakahashi-star/- の作業ブランチに切り替える:

```bash
git fetch origin claude/company-event-monitoring-system-ahte64
git checkout claude/company-event-monitoring-system-ahte64
git pull origin claude/company-event-monitoring-system-ahte64
```

2. `monitoring/RESEARCH_PROMPT.md` を読み、**そこに書かれた手順を最初から最後まで実行する**。
   これが唯一の正の手順書です。この指示文と食い違う場合は RESEARCH_PROMPT.md を優先してください。

## 要点（詳細は手順書に記載）

- `monitoring/companies.json` の115社を、`batch` 1〜12 ごとに general-purpose エージェントを並列起動して調査する（1体あたり約10社）。
- 調べる情報源: 公式HPのお知らせ/ニュース、イベント・セミナーページ、実績・事例ページ、公式SNS（X/Instagram/Facebook/LinkedIn/YouTube/note）、社員個人のSNSでの登壇告知、外部イベントサイトの出展社・登壇者一覧、業界メディア（PR TIMES 等）。
- **WebSearch を主軸にすること。** 日本の企業サイトの多くは WebFetch を HTTP 403 で弾く（丹青社・船場・博展で確認済み）。403 を「情報がない」と判断しないこと。
- 拾う動き: 出展 / 登壇 / 自社イベント / 受賞 / 新規プロジェクト実績。公開日が直近10日以内、または今後180日以内に開催予定のもの。
- URLは WebFetch で開けたもの、または WebSearch の結果に出てきたものだけを書く。推測でURLや日付を組み立てないこと。見つからない場合は「見つからなかった」とする。捏造は絶対にしない。
- 調査を始める前に `monitoring/scripts/preflight.py` を実行し、配信経路と積み残しを確認する。
- 結果をまとめた findings.json を作り、`monitoring/scripts/dedupe.py <file>` で既報を除外＋前回の積み残しを合流させ、`monitoring/scripts/render_slack.py <file>.new.json --scanned 115` で整形する。dedupe は state を書き換えない。
- 投稿は **経路A → 経路B** の順に必ず試す。
  - **経路A**: `slack_send_message` でチャンネル `C0BDAFB0X63`（#01-10_営業_claudeタスク確認テスト）に投稿。2通目以降は1通目の ts を thread_ts にしてスレッド返信する。本文の `<@U063SJG0N0L>` メンションは消さずにそのまま送ること。
  - **経路B**: `slack_send_message` が使えない／失敗したら `monitoring/scripts/post_slack.py <file>.new.slack.json` を実行する（環境変数 `SLACK_WEBHOOK_URL` が必要）。
- 投稿の成否を state に反映する。**これを飛ばさないこと。**
  - 成功: `monitoring/scripts/finalize.py --delivered <file>.new.json`
  - 両方失敗: `monitoring/scripts/finalize.py --failed <file>.new.json`（seen は触らず pending に積む。次回に自動で再通知される）。あわせてレポートを `monitoring/reports/YYYY-MM-DD.md` に保存する。
- 成否にかかわらず `monitoring/state` 等をコミットし、`git push -u origin claude/company-event-monitoring-system-ahte64` する。実行環境は毎回作り直されるため、コミットしないと記録が引き継がれない。
- 両方失敗した場合は、セッションの最終出力に「Slackに投稿できなかったこと」と pending の件数を明記する。

新しい動きが0件でも、メンションなしの1行サマリを同じチャンネルに投稿してください。
プルリクエストは作成しないでください。

---

登録が終わったら、API経由で作った古い Routine（`trig_01XSqwU6UoQzRjSYYyFxrJnJ`）を
削除する。二重に走って重複通知が出るのを防ぐため。Claude に
「古いモニタリングRoutineを削除して」と伝えれば消せる。
