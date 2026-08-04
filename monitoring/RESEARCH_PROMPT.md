# 企業イベント動向モニタリング 実行手順書

2日に1回、この手順書のとおりに実行する。所要は並列実行で30〜60分程度を想定。

対象: `monitoring/companies.tsv` に列挙した内装/空間プロデュース・設計事務所・
ゼネコン・デベロッパー・家具メーカー・オフィス移転コンサル各社（115社）。

目的: **各社のイベント出展・登壇・自社イベント・受賞・新規プロジェクト実績を検知し、
新しい動きがあった企業だけを Slack で高橋幸司さんにメンション通知する。**

---

## 0. 前提

作業ブランチは `claude/company-event-monitoring-system-ahte64`。

```bash
git fetch origin claude/company-event-monitoring-system-ahte64
git checkout claude/company-event-monitoring-system-ahte64
git pull origin claude/company-event-monitoring-system-ahte64
python3 monitoring/scripts/build_companies.py
python3 monitoring/scripts/preflight.py
```

`preflight.py` は配信経路と積み残しの状況を表示する。115社の調査には30〜60分かかるので、
**調べ始める前に**ここで確認しておく。あわせて `slack_send_message` ツールが
使えるか（経路Aが生きているか）をこの時点で確かめること。

`monitoring/config.json` に通知先・通知範囲・調査期間が入っている。必ず読むこと。

---

## 1. 調査対象の読み込み

`monitoring/companies.json` を読む。各社に `batch`（1〜12）と `priority`（A〜D）が付いている。

- `priority` は名刺交換枚数から決めた接点の濃さ。**A（20枚以上）→ D（接点情報なし）** の順に厚く調べる。
- `hp_url` が `null` の会社は、調査の過程で公式サイトを特定したら手順6で書き戻す。

---

## 2. バッチごとに並列でリサーチ

`batch` 1〜12 ごとに Agent（general-purpose）を1体ずつ、**まとめて並列起動**する。
1体あたり10社前後を担当する。各エージェントには以下をそのまま渡す。

> あなたは担当企業リスト（会社名・カテゴリ・優先度・既知URL）について、
> 直近の「動き」を調べて JSON で返す。憶測は書かず、一次情報にあたること。
>
> **調査する情報源**（可能な範囲で全部あたる。優先度A/Bの企業は必ず全部あたる）
> 1. 公式HPの「お知らせ / ニュース / プレスリリース / トピックス」一覧ページ
> 2. 公式HPの「イベント / セミナー / 展示会」ページ
> 3. 公式HPの「実績 / 事例 / ワークス / プロジェクト」の新着
> 4. 公式SNS（X、Instagram、Facebook、LinkedIn、YouTube、note）の最近の投稿
> 5. 社員個人の SNS・note・登壇者プロフィールでの登壇/出展告知
> 6. 外部イベント公式サイトの出展社一覧・登壇者一覧に社名が載っていないか
> 7. 業界メディア（PR TIMES、日経クロステック、建設通信新聞、日刊建設工業新聞、
>    商業施設新聞、JDN、AXIS、Impress Watch 等）の該当社の記事
>
> **検索クエリの例**（会社名を差し替えて使う。1社あたり4〜8クエリ）
> - `"<会社名>" 出展 2026`
> - `"<会社名>" 登壇 セミナー 2026`
> - `"<会社名>" イベント 開催 お知らせ`
> - `"<会社名>" 受賞 グッドデザイン OR ディスプレイ産業賞`
> - `"<会社名>" 実績 OR 事例 新規 2026`
> - `site:prtimes.jp "<会社名>"`
> - `"<会社名>" X（旧Twitter） OR note 登壇`
>
> **重要: WebSearch を主軸にすること。**
> 日本の企業サイトの多くは bot を弾くため、WebFetch が **HTTP 403 で失敗する**
> （検証済み: tanseisha.co.jp / semba1008.co.jp / hakuten.co.jp はいずれも403）。
> WebFetch が通らないことを「情報がない」と判断しないこと。次の順で取りにいく。
>
> 1. **WebSearch**（主軸）— 検索エンジンは各社サイトを巡回済みなので、
>    お知らせページの中身が要約として返る。日付・イベント名はここから取れることが多い。
> 2. **WebFetch を試す** — 通ればより正確。403 なら諦めて次へ。
> 3. **転載先を狙う** — PR TIMES（prtimes.jp）、digitalpr.jp、@Press、業界メディアは
>    fetch できることが多い。同じリリースが載っていないか探す。
>
> 既知の `hp_url` があればそこを起点に、お知らせ/イベント/実績ページを検索・取得する。
> `hp_url` が空なら検索で公式サイトを特定し、確定できたらそのURLも返す。
>
> **拾う条件（いずれか）**
> - 展示会・見本市への **出展**
> - セミナー・カンファレンス・大学等での **登壇**
> - 自社主催の **イベント / 展示 / ショールーム企画 / ワークショップ**
> - デザイン賞・業界賞の **受賞**（受賞展示の告知を含む）
> - **新規プロジェクト実績**（新しい内装・空間の施工事例、竣工物件の発表）
>
> **拾わない条件**
> - 決算・IR・株価・人事異動のみの情報（今回の通知範囲外）
> - 求人・採用情報のみ
> - 会期が既に終わって90日以上経過したもの
> - 同社が過去から常設で掲載している恒常ページ（新規性がないもの）
>
> **期間**: 公開日が直近10日以内のもの、または今後180日以内に開催予定のもの。
> 公開日が判然としないが明らかに新着（新着一覧の先頭付近など）なら含めてよい。
>
> **厳守事項**
> - `source_urls` に書いてよいのは **(a) WebFetch で実際に開けたURL** か
>   **(b) WebSearch の結果に出てきたURL** のどちらかだけ。
>   **自分でURLを組み立てない**（`.../news/2026/08/` のような推測パスは禁止）。
>   403で開けなくても、検索結果に出たURLなら実在が確認できているので使ってよい。
> - 日付が確認できないときは `date` を `"日付不明"` とする。**推測日を書かない。**
> - 会社名は渡されたリストの表記をそのまま使う（後段の突合キーになる）。
> - 社名が似ている別会社（例: 丹青社 / 丹青TDC / 丹青ディスプレイ）を取り違えない。
>   拾った情報が本当にその法人のものか、ドメインや会社概要で確かめる。
> - 見つからなければ空配列を返す。**見つからないことを埋めるために作らない。**
>
> **返す JSON**
> ```json
> {
>   "findings": [
>     {
>       "company": "リストどおりの会社名",
>       "category": "リストどおりのカテゴリ",
>       "type": "出展|登壇|自社イベント|受賞|新規プロジェクト実績",
>       "title": "40字程度の見出し",
>       "event_name": "イベント名（なければ空文字）",
>       "date": "2026-09-10〜2026-09-12 / 2026-08-20 / 日付不明",
>       "location": "会場（なければ空文字）",
>       "people": ["登壇者名（所属）"],
>       "summary": "2〜3行。何をするのか、営業として何が接点になりうるか。",
>       "source_type": "HP|公式SNS|イベントページ|お知らせ|社員SNS|メディア",
>       "source_urls": ["確認済みURL"]
>     }
>   ],
>   "resolved_urls": {"会社名": "特定した公式HPのURL"},
>   "unreachable": ["調査できなかった会社名とその理由"]
> }
> ```

---

## 3. 結果のマージ

全エージェントの結果を1つのファイルにまとめる。

```json
{"run_date": "YYYY-MM-DD", "findings": [ ...全バッチ分... ]}
```

`/tmp/.../findings.json` など作業ディレクトリに保存する（リポジトリには置かない）。
`unreachable` が多いバッチ（半数以上失敗）があれば、そのバッチだけ再実行する。

---

## 4. 既報との突合＋積み残しの合流

```bash
python3 monitoring/scripts/dedupe.py <findings.json>
```

`state/seen.json`（通知済み）と突合して重複を落とし、`state/pending.json`
（前回配信できなかった積み残し）を合流させたものが `<findings>.new.json` に出る。

**このコマンドは state を書き換えない。** 書き換えるのは手順6の finalize.py だけ。
投稿前に「通知済み」にすると、投稿に失敗した動きが永久に埋もれるため、この順序を守る。

---

## 5. Slack 投稿（A → B の順に必ず試す）

```bash
python3 monitoring/scripts/render_slack.py <findings>.new.json --scanned 115
```

`<findings>.new.slack.json` に `{"mention": bool, "messages": [...]}` が出る。

### 経路1（本命）: MCP コネクタ `slack_send_message`

**実際に配信できることを確認済みの経路。これを第一候補にする。**

- `messages[0]` を `config.json` の `slack.channel_id` に `slack_send_message` で投稿する。
- `messages[1]` 以降は `messages[0]` の `ts` を `thread_ts` にしてスレッド返信する。
- **本文はレンダリング結果をそのまま送る**（`<@...>` のメンションを消さない）。
- 成功したら手順6の `--delivered` へ進む。

この経路は高橋さん本人のアカウント名義での投稿になる。チャンネルは未読になるが、
メンションのプッシュ通知は鳴らない（Slackは自分の投稿では通知しない）。
運用上それで問題ないと判断済みなので、警告文などを本文に足す必要はない。

### 経路2（任意・将来用）: アプリ名義で投稿する

```bash
python3 monitoring/scripts/post_slack.py <findings>.new.slack.json
```

`SLACK_BOT_TOKEN` か `SLACK_WEBHOOK_URL` が設定されていればアプリ名義で投稿でき、
メンションのプッシュ通知が鳴るようになる。**ただし現在は使えない**:
実行環境から `slack.com` / `hooks.slack.com` へ出られない（組織のegressポリシーで
CONNECT が 403・検証済み）。egress が許可され環境変数が設定されたときだけ有効。

経路1が使えない場合のフォールバックとして試す価値はある（`preflight.py` が
設定状況を表示する）。

### 判定

- **経路1・2 のいずれかが成功 → 「配信成功」**（手順6の `--delivered` へ）
- **どちらも失敗 → 「配信失敗」**（手順6の `--failed` へ。次回リトライされる）

`mention` が `false`（=新しい動きが0件）のときも投稿する。メンションは付かないので通知は飛ばない。
「動いていない」ことも情報なので、静かに記録を残す。

---

## 6. 結果を state に反映してコミット（必ず実行する）

### 配信成功した場合

```bash
python3 monitoring/scripts/finalize.py --delivered <findings>.new.json
```

通知した分を `seen.json` に記録し、`pending.json` を空にする。

### 配信失敗した場合

```bash
python3 monitoring/scripts/finalize.py --failed <findings>.new.json
```

`seen.json` は触らず `pending.json` に積む。**次回の実行で自動的に合流して再通知される。**
あわせてレポート本文を `monitoring/reports/YYYY-MM-DD.md` に保存しておく。

### 共通（成功・失敗どちらでも）

```bash
python3 monitoring/scripts/build_companies.py   # resolved_urls を tsv に追記した場合
git add monitoring/state monitoring/companies.tsv monitoring/companies.json monitoring/reports
git commit -m "モニタリング YYYY-MM-DD: N社に動きを検知"
git push -u origin claude/company-event-monitoring-system-ahte64
```

`resolved_urls` で公式サイトが判明した会社は、`monitoring/companies.tsv` の4列目に
URLを追記してから `build_companies.py` を実行する。次回以降の調査が速く正確になる。

**このコミットは成否にかかわらず必ず行う。** state をコミットしないと、
通知済み記録も積み残しも次回セッションに引き継がれない（実行環境は毎回作り直されるため）。

---

## トラブル時

- **A も B も使えない** → 手順6の `--failed` に回す。動きは pending に積まれ、
  次回以降に持ち越されるので消えることはない。セッションの最終出力に
  「Slackに投稿できなかった」ことと `pending.json` の件数を明記する。
- **2回続けて配信失敗している** → finalize.py が警告を出す。Slackコネクタか
  `SLACK_WEBHOOK_URL` のどちらかが必要なので、その旨を最終出力で強く伝える。
- **エージェントが全滅した** → findings が空のまま先に進めない。state は一切変更せず、
  その旨だけ Slack に投稿して終わる（次回が通常どおり走る）。
- **実行時間が延びすぎる** → 優先度 A/B（37社）を先に完了させ、C/D は次回に回す。
  その場合 `--scanned` の値を実際に調べた社数に合わせ、投稿本文に持ち越した旨を追記する。
