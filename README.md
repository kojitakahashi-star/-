# 企業ディープリサーチ・データベース

指定した企業をディープリサーチし、結果を SQLite データベース (`db/companies.db`) に保管する仕組みです。

## 保管している項目

- 会社名
- 拠点数、本社所在地
- 業種
- 事業内容
- 扱っている商品
- 扱っている加工
- 特徴
- 強み

## 構成

```
db/schema.sql              テーブル定義
db/companies.db            SQLiteデータベース本体
data/researched/*.json      企業ごとのリサーチ結果(JSON)
scripts/init_db.py          DB初期化
scripts/add_company.py      リサーチ結果JSONをDBに登録(UPSERT)
scripts/query_company.py    DBの内容を一覧・詳細表示
```

## 使い方

### 1. DBの初期化(初回のみ)

```bash
python3 scripts/init_db.py
```

### 2. 新しい企業をリサーチしてJSONを作成

`data/researched/<会社名>.json` を以下の形式で作成する。

```json
{
  "company_name": "会社名",
  "headquarters_location": "本社所在地",
  "num_locations": 7,
  "locations_detail": "拠点の内訳",
  "industry": "業種",
  "business_description": "事業内容",
  "products": "扱っている商品",
  "processing": "扱っている加工",
  "features": "特徴",
  "strengths": "強み",
  "source_urls": "参照元URL(改行区切り)",
  "researched_at": "YYYY-MM-DD"
}
```

### 3. DBへ登録

```bash
python3 scripts/add_company.py data/researched/<会社名>.json
```

### 4. 登録内容の確認

```bash
python3 scripts/query_company.py                  # 一覧表示
python3 scripts/query_company.py "<会社名>"        # 詳細表示
```

## 登録済み企業

- 越井木材工業株式会社(大阪府大阪市)
- 細田木材工業株式会社(東京都江東区)
- 株式会社ウッドパーツ(北海道旭川市)
- 株式会社モリアン(大阪府岸和田市)
- 株式会社榎戸材木店(東京都江東区)
- VUILD株式会社(神奈川県川崎市)
- 西垣林業株式会社(奈良県桜井市)
- 株式会社ティンバークルー(東京都調布市)
- 森庄銘木産業株式会社(奈良県宇陀市)
- 藤島木材工業株式会社(秋田県北秋田市)
- 株式会社nojimoku(三重県熊野市)
- 大和ツキ板産業株式会社(広島県福山市)
- 安多化粧合板株式会社(大阪府八尾市、指定表記「安田化粧合板」の近似企業)
- 朝日ウッドテック株式会社(大阪府大阪市)
- 株式会社東京チェンソーズ(東京都檜原村)
- 株式会社マルホン(静岡県浜松市)
- 株式会社山崎商事(静岡県静岡市)
- ボード株式会社(東京都新宿区)
- 加賀木材株式会社(石川県金沢市、指定表記「加賀木材工業」の近似企業)
- 物林株式会社(東京都江東区)
- 吉田製材株式会社(奈良県桜井市)
- 森林組合おわせ(三重県北牟婁郡紀北町)
- 吉野中央木材株式会社(奈良県吉野町)
- 株式会社森未来(東京都港区)
- トマト工業株式会社(岐阜県関市)

---

# タスク優先度管理

`tasks/tasks.json` にタスクを保存し、締切と重要度から優先度を算出して `TASKS.md` に一覧を出力します。

- 区分: 営業 / 認証コンサル / その他
- 作業種類: 資料作成 / 打合せ・訪問 / 連絡・メール / 調査・リサーチ / 見積・契約 / 事務処理 / その他
- 緊急度(締切までの日数): ⚫期限超過 / 🔴至急(1日以内) / 🟠緊急(3日以内) / 🟡今週中(7日以内) / 🟢余裕あり / 🔵締切なし
- 優先度: 緊急度×2 + 重要度(高3・中2・低1) → S / A / B / C

```bash
python3 scripts/task_manager.py add "提案書作成" --due 2026-10-25 --category 営業 --work-type 資料作成 --importance 高
python3 scripts/task_manager.py update 1 --due 2026-10-28
python3 scripts/task_manager.py done 1
python3 scripts/task_manager.py list      # ターミナルに優先度順で表示
python3 scripts/task_manager.py render    # TASKS.md を今日基準で再生成
```
