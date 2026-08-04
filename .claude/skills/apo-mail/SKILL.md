---
name: apo-mail
description: 担当者名・会社名・メールアドレスのリストから、担当者ごとにアポ打診メールのGmail下書きを作る。イベントで名刺交換した相手へのフォローメール作成にも使う。「アポメール作って」「この担当者に営業メールの下書きを」「名刺リストからフォローメール」「SFの担当者にアポ打診」などで使用する。送信はしない。
---

# アポ打診メールの下書き作成

会社名・担当者名・メールアドレスだけを入力すれば、担当者ごとに1通ずつ Gmail の下書きを作る。
きっかけ（イベントなど）が無い新規打診と、名刺交換後のフォローの2系統がある。

- 新規打診（Salesforce のリードなど）: `data/outreach/cold_campaign.json` + `templates/cold_mail.txt`
- 名刺フォロー: `data/outreach/campaign.json` + `templates/apo_mail_short.txt`（詳細は `docs/OUTREACH.md`）

送信者情報・署名・日程調整リンク・社内cc は `data/outreach/campaign.json` の `defaults` が正で、新規打診側はそこから引き継ぐ。**下書きまでで止める。送信はしない。**

## 新規打診の手順

### 1. リストを受け取ってファイルにする

チャットに貼られた担当者リストを `data/outreach/cold_targets.tsv` に書き出す。1行1名、区切りはタブでもカンマでもよい。

```
会社名	氏名	メール	[部署]	[役職]	[ひとこと]
株式会社◯◯	山田 太郎	yamada@example.co.jp	設計部	課長
```

会社名・氏名・メールの3列が最低条件。氏名は「姓 名」の間に空白を入れる（宛名と件名の「〇〇様」に使う）。

### 2. キャンペーンを作る

```bash
python3 scripts/cold_import.py data/outreach/cold_targets.tsv          # 入れ替え
python3 scripts/cold_import.py data/outreach/cold_targets.tsv --append # 追記
```

同じメールアドレスの相手は既存の記入内容を保持する（二重に作らない）。

### 3. 会社ごとに「ひとこと」を書く

`cold_campaign.json` の各グループの `talked_about` が本文2段落目になる。既定は会社名を差し込んだ汎用文なので、**WebSearch で各社の公開情報を調べ、1〜2文に書き換える**。書き方のルール:

- 事実として確認できたことだけ書く。確認できなければ汎用文のままにする（憶測で書かない）
- 参照した情報と、断定を避けた箇所は同じグループの `note` に残す
- 「お役に立てそう」まで踏み込むかは相手次第。協業を狙う相手には入れてよい
- `{company}` `{to_name}` などのプレースホルダが使える

### 4. 本文を生成して確認する

```bash
python3 scripts/render_mails.py --campaign data/outreach/cold_campaign.json \
  --outdir out/cold_mails --json out/cold_mails.json
```

`要記入` が 0 件になるまで直す。`--check` で検証のみ実行できる。

### 5. Gmail の下書きを作る

`out/cold_mails.json` の各要素（`to` / `cc` / `subject` / `body`）をそのまま `mcp__Gmail__create_draft` に渡す。本文は1文字も変えずに渡すこと（署名まで含まれている）。

作成後、`cold_campaign.json` の各グループに `gmail_draft_id` と `status: "draft"` を記録する。すでに `gmail_draft_id` があるグループは `create_draft` ではなく `mcp__Gmail__update_draft` を使う。送信済みの相手は `status: "sent"` にして `gmail_draft_id` を削除する（送信後のIDは無効になり "Message not a draft" で失敗する）。

### 6. 結果を報告してコミットする

作成した下書きを宛先・件名の表で示し、本文は代表1通を提示する。判断に迷った点（公開情報が乏しかった会社など）は明示する。最後に `git add -A && git commit && git push -u origin <作業ブランチ>`。

## 変更を頼まれたときの入口

| 頼まれること | 触る場所 |
| --- | --- |
| 文面のトーン・構成 | `templates/cold_mail.txt`（別パターンはファイルを増やしてグループの `template` で切替） |
| 「意見交換 / 情報交換」 | `defaults.exchange_word`（グループ単位でも上書き可） |
| 所要時間・訪問可否 | `defaults.meeting_duration` / `meeting_style` |
| 日程調整リンク | `defaults.scheduling_url`（`{"label","url"}` のリストで「リンク1/リンク2」表記） |
| 署名・送信者 | `campaign.json` の `defaults.sender` / `defaults.signature` |
| 社内cc | `defaults.cc_always`（既定 `marketing@shin-mirai.co.jp`。宛名ブロックには出さない） |
| 同じ会社の複数名を1通に | `to` に複数入れる（宛名も自動で連名になる）。名刺フォロー側は `grouping.json` の `manual_groups` |

いずれも **グループ > イベント > `defaults`** の順で解決される。

## やらないこと

- 送信・送信予約（下書きの作成・更新まで）
- 公開情報で確認できない実績・受賞・取引関係を本文に書くこと
- 宛名の敬称や社名の省略（正式名称＋「様」を守る）
