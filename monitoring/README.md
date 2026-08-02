# 企業イベント動向モニタリング

内装/空間プロデュース会社・設計事務所・ゼネコン・デベロッパーなど **115社** について、
公式HP・公式SNS・イベントページ・お知らせ・社員SNS を **2日に1回** 自動でリサーチし、
イベント出展／登壇／自社イベント／受賞／新規プロジェクト実績が見つかった企業だけを
Slack で高橋幸司さんにメンション通知する。

## 通知の仕様

| 項目 | 設定 |
| --- | --- |
| 通知先 | `#01-10_営業_claudeタスク確認テスト`（`C0BDAFB0X63`） |
| メンション | `@高橋幸司`（`U063SJG0N0L`） |
| 頻度 | 2日に1回・日本時間 朝7時ごろ |
| 通知範囲 | 出展 / 登壇 / 自社イベント / 受賞 / 新規プロジェクト実績 |
| 動きがない回 | メンションなしの1行サマリだけ投稿（通知は飛ばない） |

企業は名刺交換枚数で優先度を付けており、通知本文でも上位から並ぶ。

| 優先度 | 条件 | 社数 |
| --- | --- | --- |
| :red_circle: A | 名刺20枚以上 | 7 |
| :large_orange_circle: B | 名刺5〜19枚 | 30 |
| :large_blue_circle: C | 名刺1〜4枚 | 18 |
| :white_circle: D | 接点情報なし | 60 |

## 構成

```
monitoring/
  companies.tsv          対象企業マスタ（編集するのはこれ）
  companies.json         上記から生成する機械可読版（自動生成・直接編集しない）
  config.json            通知先・通知範囲・調査期間・バッチ設定
  RESEARCH_PROMPT.md     定期実行セッションが読む実行手順書
  ROUTINE_PROMPT.md      Routines UI に貼り付ける登録用プロンプト
  state/seen.json        通知済みの動きの記録（重複通知の防止・400日で自動整理）
  state/pending.json     配信できなかった積み残し（次回に自動で再通知）
  reports/YYYY-MM-DD.md  Slackに投稿できなかった回のレポート退避先
  scripts/
    build_companies.py   companies.tsv -> companies.json
    preflight.py         調査前に配信経路と積み残しを確認
    dedupe.py            既報を除外し、積み残しを合流（state は書き換えない）
    render_slack.py      Slack 投稿テキストに整形
    post_slack.py        経路B: Incoming Webhook で投稿
    finalize.py          配信の成否を state に反映（state を書く唯一のスクリプト）
```

## 通知経路の現状（重要）

**Slack のメンション通知は、現時点では鳴らない。** 理由は2つ（いずれも検証済み）。

1. MCP コネクタは**高橋さん本人の名義**で投稿するため、`<@U063SJG0N0L>` が
   自分から自分へのメンションになり、Slack の仕様で通知が鳴らない。
2. 実行環境から `slack.com` / `hooks.slack.com` へ出られない（組織のegressポリシーで
   CONNECT が 403）。そのためアプリ名義で投稿する bot token / Webhook が使えない。

そこで **Routine の完了通知（プッシュ／メール）** で気付ける状態にしてある。
Slack への投稿は記録として継続する。

| 経路 | 投稿名義 | メンション通知 | スレッド | 現在 |
| --- | --- | --- | --- | --- |
| 1. bot token | Slackアプリ | 鳴る | できる | **egressでブロック** |
| 2. Webhook | Slackアプリ | 鳴る | できない | **egressでブロック** |
| 3. MCPコネクタ | 本人 | **鳴らない** | できる | 利用可（記録用） |

### Slackのメンション通知を鳴らすには

組織のegressポリシーで **`hooks.slack.com` を許可**してもらい、Slack で Incoming Webhook を
発行して環境変数 `SLACK_WEBHOOK_URL` に設定する。それだけで経路2が有効になり、
アプリ名義の投稿＝メンション通知が鳴るようになる（コードは実装・テスト済み）。
`SLACK_BOT_TOKEN`（`slack.com` の許可が必要）ならスレッド返信も使える。

```
リサーチ → dedupe（既報を除外＋積み残しを合流）→ 整形
   → 経路A で投稿 ─成功→ finalize --delivered（seen に記録・pending クリア）
        └失敗→ 経路B で投稿 ─成功→ finalize --delivered
                    └失敗→ finalize --failed（pending に積む・seen は触らない）
                              → 次回の実行で自動的に合流して再通知
```

肝は **投稿が成功するまで `seen.json` に書かない** こと。投稿前に「通知済み」にすると、
配信に失敗した動きが二度と出てこなくなる。2回続けて失敗すると `finalize.py` が警告を出す。

## 運用

### 対象企業を追加・削除する

`companies.tsv` を編集して再生成する。列は `会社名 <TAB> 名刺枚数 <TAB> カテゴリ <TAB> URL`。
名刺枚数とURLは空欄可。

```bash
python3 monitoring/scripts/build_companies.py
```

### 通知先や通知範囲を変える

`config.json` を編集する。チャンネルを本番用に切り替えるときは `slack.channel_id` を差し替える。

### 手動で1回まわす

`RESEARCH_PROMPT.md` の手順をそのまま実行すればよい。Claude に
「monitoring/RESEARCH_PROMPT.md に従ってリサーチを実行して」と伝えるだけでも動く。

### 経路B（Webhook）を有効にする

Slack で Incoming Webhook を発行し、**URL を実行環境の環境変数 `SLACK_WEBHOOK_URL`
に設定する**（claude.ai の環境設定から登録する。URL は投稿権限そのものなので、
リポジトリにも会話にも貼らないこと）。設定されているかは `preflight.py` で確認できる。

### 通知済み記録をリセットする（全件を再通知したいとき）

```bash
echo '{"updated_at":null,"retention_days":400,"count":0,"entries":{}}' > monitoring/state/seen.json
echo '{"updated_at":null,"failed_runs":0,"findings":[]}' > monitoring/state/pending.json
```

## 重複通知を防ぐしくみ

`会社名 + 動きの種類 + イベント名 + 日程` を正規化してハッシュ化し、`state/seen.json` に
記録する。表記ゆれ（全角半角・記号・空白・`〜`と`~`）は吸収するため、同じ動きを
HPとSNSの両方で拾っても1件にまとまる。この state はリポジトリにコミットされるので、
実行環境が毎回作り直されても履歴が引き継がれる。

## スケジュール実行

Routine（スケジュールトリガー）として登録済み。UTC cron `55 21 */2 * *`（= JST 06:55、2日おき）。
毎回まっさらなセッションが立ち上がり、このブランチを checkout して `RESEARCH_PROMPT.md`
を実行する。停止・再開・時刻変更は Claude に依頼すれば Routine 側で変更できる。
