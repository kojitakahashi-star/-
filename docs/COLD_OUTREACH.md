# 新規アポ打診メールの仕組み（きっかけ無し）

イベントなどの接点がない相手（Salesforce のリードなど）へ、**会社名・担当者名・メールアドレスの3つだけ**から
担当者ごとに1通ずつ Gmail の下書きを作る仕組みです。名刺フォロー用（[docs/OUTREACH.md](OUTREACH.md)）と
同じ描画エンジン（`scripts/render_mails.py`）を使い、テンプレートと既定値だけを差し替えています。

## 全体の流れ

```
担当者リスト(1行1名 / タブ・カンマ区切り)
      │  scripts/cold_import.py
      ▼
data/outreach/cold_campaign.json   ★宛先ごとの「ひとこと」を書く
      │  scripts/render_mails.py --campaign data/outreach/cold_campaign.json
      ▼
out/cold_mails/<id>.txt            確認用
out/cold_mails.json                Gmail下書き作成用
      │  Claude が Gmail コネクタで下書き作成
      ▼
Gmail の下書き(送信は自分で最終確認してから)
```

## 使い方

### 1. リストを用意する

`data/outreach/cold_targets.tsv`（サンプル: `cold_targets.sample.tsv`）

```
# 会社名	氏名	メール	[部署]	[役職]	[ひとこと]
株式会社サンプル設計	山田 太郎	yamada@example.co.jp	設計部	課長
サンプルデザイン株式会社,佐藤 花子,sato@example.jp
```

- 区切りはタブ / カンマ / 全角カンマのいずれでも可
- 氏名は「姓 名」の間に空白（宛名と件名の「〇〇様」に使う）
- ヘッダー行（`会社名` 始まり）と `#` 始まりの行は無視

チャットに貼るだけでも構いません。Claude がこのファイルに書き出します。

### 2. キャンペーンを作る

```bash
python3 scripts/cold_import.py data/outreach/cold_targets.tsv           # 入れ替え
python3 scripts/cold_import.py data/outreach/cold_targets.tsv --append   # 追記
```

- 担当者ごとに1グループ（＝1通）。同じ会社に複数名いても別便になります
- 同じメールアドレスの相手は、既に書いた内容を保持します（二重送信の防止）
- 送信者情報・署名・日程調整リンク・社内ccは `campaign.json` の `defaults` から引き継ぎます

### 3. 宛先ごとの「ひとこと」を書く

`cold_campaign.json` の `talked_about` が本文2段落目です。既定は会社名を差し込んだ汎用文:

> {company}様の設計における木材選定の課題や、今後の素材活用の可能性について、実例を交えて意見交換をさせていただければと思い、ご連絡いたしました。

「調べて書いて」と伝えれば、Claude が各社の公開情報を調べて1〜2文に書き換えます（確認できない実績は書きません）。

### 4. 本文を生成する

```bash
python3 scripts/render_mails.py --campaign data/outreach/cold_campaign.json \
  --outdir out/cold_mails --json out/cold_mails.json
python3 scripts/render_mails.py --campaign data/outreach/cold_campaign.json --check   # 検証のみ
```

### 5. 下書きを作る

「下書き作って」と伝えれば、`out/cold_mails.json` から Gmail の下書きを作成します（**送信はしません**）。
作成後は各グループに `gmail_draft_id` と `status` が記録され、次回は同じ下書きを更新します。

## 文面の構成（templates/cold_mail.txt）

1. 宛名（会社名 / 部署 / 氏名 様）
2. 挨拶と自己紹介
3. **宛先ごとのひとこと**（`talked_about`）
4. ＜事例紹介＞3件（eTREEの施工事例）
5. インパクトレポートのリンク
6. 意見交換の打診（所要時間・オンライン/訪問）
7. 日程調整リンク（リンク1・リンク2）
8. 補足（産地・樹種の選定から加工まで／壁打ちでもOK）
9. 署名

既定値は `cold_campaign.json` の `defaults`。件名は
`【{to_last_name}様】空間デザインにおける木材調達や木質化に関する意見交換のご相談（森未来／高橋 幸司）` です。

## 名刺フォローとの違い

| | 新規打診（本ドキュメント） | 名刺フォロー（OUTREACH.md） |
| --- | --- | --- |
| 入力 | 会社名・氏名・メール | Eight の名刺CSV |
| まとめ方 | 担当者ごとに1通 | 会社＋部署ごとに1通（to/ccを自動振り分け） |
| 冒頭 | 自己紹介から入る | イベントのお礼から入る |
| 事例紹介 | あり | なし（インパクトレポートのみ） |
| キャンペーン | `cold_campaign.json` | `campaign.json` |
