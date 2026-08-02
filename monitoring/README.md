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
  state/seen.json        通知済みの動きの記録（重複通知の防止・400日で自動整理）
  scripts/
    build_companies.py   companies.tsv -> companies.json
    dedupe.py            取得結果を state と突合し新規分だけ抽出
    render_slack.py      新規分を Slack 投稿テキストに整形
```

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

### 通知済み記録をリセットする（全件を再通知したいとき）

```bash
echo '{"updated_at":null,"retention_days":400,"count":0,"entries":{}}' > monitoring/state/seen.json
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
