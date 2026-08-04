# イベント名刺フォローアップ(アポ打診メール)の仕組み

イベントで名刺交換した方に、**イベントごと・担当者ごとに本文を変えたアポ打診メール**を作るための仕組みです。
Claude との会話で「この会社はこの内容で」「to はこの人、cc はこの人」と指示すれば、設定ファイルの編集からメール本文の生成、Gmail の下書き作成まで一気に進められます。

## 全体の流れ

```
名刺CSV(Eight書き出し / Shift-JIS)
      │  scripts/cards_import.py
      ▼
data/outreach/contacts.json      連絡先を正規化したもの
      │  scripts/campaign_init.py   ← 会社+部署でまとめ、役職から to/cc を推定
      ▼
data/outreach/campaign.json      ★ここを編集する(イベント / 話した内容 / to・cc / 日程調整リンク)
      │  scripts/render_mails.py
      ▼
out/mails/<group_id>.txt         確認用のメール本文
out/mails.json                   Gmail下書き作成用(to / cc / 件名 / 本文)
      │  Claude が Gmail コネクタで下書き作成
      ▼
Gmail の下書き(送信は自分で最終確認してから)
```

## ファイルの役割

| パス | 役割 |
| --- | --- |
| `data/outreach/*.csv` | Eight から書き出した名刺CSV(Shift-JIS のままでOK) |
| `data/outreach/grouping.json` | 会社名の表記ゆれ統一(`company_aliases`)と、手動でまとめたいグループ(`manual_groups`) |
| `data/outreach/contacts.json` | CSVを正規化した連絡先一覧(自動生成) |
| `data/outreach/campaign.json` | **編集する中心ファイル**。イベント定義 + 送信グループごとの設定 |
| `templates/apo_mail.txt` | メール本文のテンプレート。別パターンを作って `template` で切り替え可能 |
| `out/` | 生成物(Git管理外) |

## コマンド

```bash
# 1) 名刺CSVを取り込む(複数イベント分をまとめて渡してもよい)
python3 scripts/cards_import.py data/outreach/cards_20260803.csv

# 2) 送信グループの雛形を生成/更新(既に書いた内容は保持される)
python3 scripts/campaign_init.py
python3 scripts/campaign_init.py --group-by company   # 部署を無視して会社単位にまとめる
python3 scripts/campaign_init.py --force              # 記入内容を捨てて作り直す

# 3) メール本文を生成
python3 scripts/render_mails.py                  # 全グループ
python3 scripts/render_mails.py --only tokumura  # グループ指定
python3 scripts/render_mails.py --event ev-0729  # イベント指定
python3 scripts/render_mails.py --check          # 記入漏れチェックのみ
```

`<<要記入: ...>>` が残っているグループは `ready: false` になり、`--check` で一覧表示されます。

## campaign.json の編集ポイント

### イベント(`events`)

```json
"events": {
  "ev-0729": { "name": "◯◯フェア 2026", "date": "2026-07-29", "place": "インテックス大阪", "card_dates": ["2026-07-29"] },
  "ev-0803": { "name": "△△EXPO 2026",  "date": "2026-08-03", "place": "東京ビッグサイト", "card_dates": ["2026-08-03"] }
}
```

`card_dates` に名刺交換日を書いておくと、`campaign_init.py` が新しい連絡先を自動で該当イベントに割り当てます。

### 送信グループ(`groups`)

```json
{
  "id": "tokumura",
  "label": "株式会社徳村組 / 建設事業本部 営業部",
  "company": "株式会社徳村組",
  "department": "建設事業本部 営業部",
  "event": "ev-0803",
  "to": ["k_aoyagi@tokumura.co.jp"],
  "cc": ["s_endo@tokumura.co.jp"],
  "talked_about": "当日は内装の木質化と防火材料の選定でお困りだとお聞かせいただきました。",
  "purpose": "",
  "scheduling_url": "",
  "subject": "",
  "extra": "",
  "template": "",
  "greeting_override": [],
  "note": "",
  "skip": false,
  "members": [ ... ]
}
```

| 項目 | 説明 |
| --- | --- |
| `event` | `events` のキー。イベントごとに文面の入口が変わる |
| 共通項目の上書き | `purpose` `scheduling_url` `meeting_duration` `meeting_style` `impact_report_url` `subject` `template` は **グループ > イベント > `defaults`** の順で解決される。イベント単位で変えたいときは `events.<id>` に同じキーを書く |
| `to` / `cc` | 同じ会社・部署の複数名を1通にまとめる際の振り分け。既定では役職が上の人が `to` |
| （社内cc） | `defaults.cc_always` に書いたアドレスは全通のccに自動で入る（宛名ブロックには出さない）。既定は `marketing@shin-mirai.co.jp` |
| `talked_about` | **当日話した内容**(担当者ごとに変える主役の部分)。改行可 |
| `purpose` | 提案内容。空なら `defaults.purpose` |
| `scheduling_url` | 日程調整リンク。文字列 / リスト / `{"label","url"}` のリストが使える |
| `meeting_duration` | 所要時間の表記（既定「30分～1時間」） |
| `meeting_style` | 面談形式の一文（東京圏は訪問可、大阪はオンライン提案など） |
| `exchange_word` | 「情報交換」/「意見交換」の言い換え（件名・本文の両方に反映） |
| `scheduling_lead` | 日程調整リンクの前置き（既定は2本のURLどちらからでも予約可という案内） |
| `subject` | 件名。空なら `defaults.subject` |
| `extra` | 追記(添付の案内、紹介者の名前など) |
| `template` | この宛先だけ別テンプレートを使う場合に指定 |
| `greeting_override` | 宛名ブロックを完全に手書きしたいとき(行の配列) |
| `skip` | `true` で対象外にする |
| `gmail_draft_id` | Gmail下書きを作成済みの場合のID(二重作成を防ぐ・更新に使う) |
| `members` | 参考情報(自動生成。氏名・役職・名刺交換日) |

### テンプレートで使えるプレースホルダ

`{header}` `{company}` `{department}`
`{event_name}` `{event_date}` `{event_date_jp}` `{event_place}`
`{purpose}` `{talked_about}` `{scheduling_url}` `{impact_report_url}` `{meeting_duration}` `{meeting_style}` `{exchange_word}` `{scheduling_lead}` `{extra}` `{signature}`

- `{header}` は「会社名 / 部署 / to の氏名 様 / (CC: cc の氏名 様)」を自動で組み立てます。
- `defaults.sender` の項目はすべて `{sender_<キー>}` で使えます（`{sender_company}` `{sender_name}` `{sender_short_name}` `{sender_email}` `{sender_mobile}` `{sender_tel}` `{sender_address}` `{sender_url}` など）。
- `defaults` に文字列項目を足せば、そのキー名でそのままプレースホルダになります（`impact_report_url` がこの仕組み）。

## テンプレートの種類

| ファイル | 内容 |
| --- | --- |
| `templates/apo_mail_short.txt` | **既定**。お礼 → イベント後に調べた内容 → インパクトレポート → 情報交換の打診 → 日程調整リンク。短く端的 |
| `templates/apo_mail.txt` | 情報交換型のやや丁寧・長め |
| `templates/apo_mail_formal.txt` | 打ち合わせ依頼型（かっちりした文面） |

グループの `template` にパスを書けば、その宛先だけ別テンプレートで出せます。

## 登録済みのイベント

| イベントID | 名称 | 名刺交換日 | 対象グループ数 |
| --- | --- | --- | --- |
| `ev-fabcafe` | FabCafe | 2026-07-29（大阪の企業） | 4 |
| `ev-designers-edge` | デザイナーズエッジ | 2026-08-03（東京の企業） | 8 |

正式名称（例: 「DESIGNERS EDGE 2026」）が決まっている場合は `events.<id>.name` を書き換えるだけで、件名・本文の両方に反映されます。

## チャットで選択式に操作する

設定を変えたいときは、Claude が**選択肢付きの質問**を出すので、チャット欄でクリックして選べます。文章で細かく指定する必要はありません。選択式で扱う主な項目:

| 選ぶこと | 選択肢の例 |
| --- | --- |
| イベントの割り当て | どの名刺交換日をどのイベントにするか |
| まとめ方 | 会社+部署ごと / 会社ごと / 個別に送る |
| to と cc | 同じ会社の誰を to にするか（残りは自動で cc） |
| 日程調整リンク | 2イベント共通 / イベントごとに分ける |
| メールの方向性 | 打ち合わせ依頼 / まず資料送付 / 軽い挨拶のみ |
| 送信の進め方 | 全件まとめて下書き / イベント単位 / 1通ずつ確認 |
| 送信対象 | 今回送らない相手（`skip`）の指定 |

「変えたい」とだけ伝えれば、その項目の選択肢を出します。

## Claude への指示例

そのまま話しかければ、該当ファイルの編集とコマンド実行までやります。

- 「7/29 のイベント名は『◯◯フェア 2026』、8/3 は『△△EXPO 2026』で登録して」
- 「日程調整リンクは https://timerex.net/s/xxxx 。署名の氏名は 高橋 洸司、電話は 03-xxxx-xxxx で」
- 「徳村組は、当日『不燃木材の意匠性』の相談を受けたので、その話を本文に入れて」
- 「ソーシャルインテリアの2部署は1通にまとめて。to は新妻さん、cc は後藤さんで」
- 「UNION TEC は英語で送りたいので、英文テンプレートを作って union-tec だけそれを使って」
- 「アルファーテクノは今回送らないので skip にして」
- 「記入漏れがないか確認して」→ `render_mails.py --check`
- 「準備できた分の Gmail 下書きを作って」→ `out/mails.json` を読んで Gmail コネクタで下書きを作成(送信はしません)

## 運用上の注意

- 送信は必ず自分で最終確認してから。スクリプトと Claude が作るのは **下書きまで**。
- `to` / `cc` の人数が多いグループは、宛名の順序(役職順)が正しいか確認する。
- 名刺CSVには氏名・メール・携帯番号などの個人情報が含まれます。リポジトリの公開範囲に注意してください。
