# ディープリサーチ・データベース

指定した対象をディープリサーチし、結果を SQLite データベースに保管する仕組みです。

- **企業DB** (`db/companies.db`) … 木材・建材関連企業
- **空間デザイナーDB** (`db/designers.db`) … 日本の空間デザイナー(→ 詳細は[後半](#空間デザイナーデータベース))

---

## 企業データベース

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

## 空間デザイナーデータベース

日本の空間デザイナーをディープリサーチし、結果を SQLite データベース (`db/designers.db`) に保管します。

### 保管している項目

| カラム | 内容 |
| --- | --- |
| `designer_name` / `designer_name_en` | 名前 / ローマ字表記 |
| `company` | 所属会社 |
| `title` | 肩書き |
| `company_genre` | 会社ジャンル（下記6分類） |
| `company_genre_detail` | 会社ジャンルの補足（業態の細分） |
| `headquarters_location` | 所属会社の本社所在地 |
| `num_locations` / `locations_detail` | 所属会社の拠点数 / 拠点の内訳 |
| `target_spaces` | 主な対象とする空間 |
| `signature_projects` | 代表的な事例（素材・特徴の根拠） |
| `materials` | 事例をもとによく使う素材 |
| `features` | 特徴 |
| `strengths` | 強み |
| `source_urls` / `researched_at` | 参照元URL / リサーチ実施日 |

### 会社ジャンルの分類

リサーチを通じて、業態の違いが発注の仕方・素材選定の自由度・意思決定の速さに直結すると判断し、次の6分類に整理しました。

| ジャンル | 定義 | 該当例 |
| --- | --- | --- |
| 組織設計 | 構造・設備まで抱える大規模な組織系設計事務所 | 日建設計 |
| アトリエ(建築設計) | 建築家が主宰し、建築を軸に内装まで手がける設計事務所 | スキーマ建築計画、SUPPOSE DESIGN OFFICE、隈研吾建築都市設計事務所 |
| アトリエ(デザインオフィス) | プロダクト／アートと空間を横断するデザインオフィス | nendo、吉岡徳仁デザイン事務所 |
| アトリエ系内装 | インテリア／商環境デザインを主業とする少数精鋭事務所 | Wonderwall、GLAMOROUS、CASE-REAL、Puddle |
| 大手内装(ディスプレイ業) | 企画〜デザイン〜施工〜運営を一貫して担う大手ディスプレイ企業 | 乃村工藝社、丹青社、博展 |
| 施工(設計施工) | 施工を自社で持ち、設計と施工を分離しないデザインビルド | TANK |

### 構成

```
db/schema_designers.sql       テーブル定義
db/designers.db               SQLiteデータベース本体
data/designers/*.json         デザイナーごとのリサーチ結果(JSON)
scripts/init_designers_db.py  DB初期化
scripts/add_designer.py       リサーチ結果JSONをDBに登録(UPSERT、複数ファイル可)
scripts/query_designer.py     DBの内容を一覧・詳細表示・絞り込み
```

### 使い方

```bash
python3 scripts/init_designers_db.py                   # 初期化(初回のみ)
python3 scripts/add_designer.py data/designers/*.json  # 登録
python3 scripts/query_designer.py                      # 一覧表示
python3 scripts/query_designer.py 長坂常                # 詳細表示
python3 scripts/query_designer.py --genre アトリエ系内装  # 会社ジャンルで絞り込み
python3 scripts/query_designer.py --material 古材        # よく使う素材で絞り込み
```

### 登録済みデザイナー(28名)

#### アトリエ(デザインオフィス)

- 佐藤オオキ（株式会社nendo(ネンド)／代表 / チーフデザイナー）
- 吉岡徳仁（吉岡徳仁デザイン事務所(TOKUJIN YOSHIOKA INC.)／代表 / デザイナー・アーティスト）

#### アトリエ(建築設計)

- 中村拓志（株式会社NAP建築設計事務所(Hiroshi Nakamura & NAP)／代表取締役 / 建築家）
- 吉田愛（SUPPOSE DESIGN OFFICE株式会社／共同主宰 / 建築家）
- 永山祐子（永山祐子建築設計／代表 / 建築家）
- 禿真哉（トラフ建築設計事務所(TORAFU ARCHITECTS)／共同主宰 / 建築家）
- 芦沢啓治（株式会社芦沢啓治建築設計事務所(Keiji Ashizawa Design)/ 石巻工房／代表 / 建築家・デザイナー(石巻工房 代表)）
- 谷尻誠（SUPPOSE DESIGN OFFICE株式会社／共同主宰 / 建築家）
- 鈴野浩一（トラフ建築設計事務所(TORAFU ARCHITECTS)／共同主宰 / 建築家）
- 長坂常（有限会社スキーマ建築計画(Schemata Architects)／代表取締役 / 建築家）
- 隈研吾（株式会社隈研吾建築都市設計事務所(Kengo Kuma and Associates)／代表 / 建築家(東京大学特別教授・名誉教授)）

#### アトリエ系内装

- 中原慎一郎（ランドスケーププロダクツ(Landscape Products)／代表 / デザイナー(BEAMSこどもディレクター)）
- 二俣公一（ケース・リアル(CASE-REAL)/ 二俣スタジオ(KOICHI FUTATSUMATA STUDIO)／代表 / 空間・プロダクトデザイナー）
- 五十嵐久枝（イガラシデザインスタジオ(IGARASHI DESIGN STUDIO)／主宰 / インテリアデザイナー(武蔵野美術大学 空間演出デザイン学科 教授)）
- 加藤匡毅（株式会社Puddle(パドル)／代表 / 一級建築士）
- 小林マナ（設計事務所ima(イマ)／共同主宰 / インテリアデザイナー）
- 小林恭（設計事務所ima(イマ)／共同主宰 / インテリアデザイナー）
- 森田恭通（株式会社グラマラス(GLAMOROUS co.,ltd.)／代表取締役社長 / デザイナー）
- 片山正通（株式会社ワンダーウォール(Wonderwall)／代表取締役 / インテリアデザイナー(武蔵野美術大学 空間演出デザイン学科 教授)）
- 窪田茂（Degins JP株式会社(旧・窪田建築都市研究所)／代表 / デザイナー(一般社団法人日本商環境デザイン協会(JCD)理事長)）
- 緒方慎一郎（株式会社SIMPLICITY(シンプリシティ)／代表 / デザイナー）
- 間宮吉彦（株式会社インフィクス(infix design inc.)／代表取締役 / インテリアデザイナー）
- 関祐介（YUSUKE SEKI STUDIO／主宰 / デザイナー）

#### 大手内装(ディスプレイ業)

- 小坂竜（株式会社乃村工藝社(A.N.D. / AOYAMA NOMURA DESIGN)／商環境事業本部 A.N.D. エグゼクティブクリエイティブディレクター(A.N.D.代表)）
- 高橋久弥（株式会社丹青社／デザインセンター センター長(元・カルチャー&コミュニケーションデザイン局長)）
- 高橋匠（株式会社博展(HAKUTEN)／空間デザイナー / クリエイティブディレクター）

#### 施工(設計施工)

- 福元成武（TANK株式会社／代表 / デザイナー・施工者）

#### 組織設計

- 勝矢武之（株式会社日建設計(NIKKEN SEKKEI)／NAD(Nikken Activity Design lab)ダイレクター / 設計者）
