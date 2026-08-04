-- 企業ディープリサーチ結果を保管するデータベーススキーマ

CREATE TABLE IF NOT EXISTS companies (
    id                    INTEGER PRIMARY KEY AUTOINCREMENT,
    company_name          TEXT NOT NULL,              -- 会社名
    headquarters_location TEXT,                        -- 本社所在地
    num_locations         INTEGER,                     -- 拠点数
    locations_detail      TEXT,                        -- 拠点の内訳(工場・支店・営業所等)
    industry              TEXT,                        -- 業種
    business_description  TEXT,                        -- 事業内容
    products              TEXT,                        -- 扱っている商品
    processing            TEXT,                        -- 扱っている加工
    features              TEXT,                        -- 特徴
    strengths             TEXT,                        -- 強み
    source_urls           TEXT,                        -- 参照元URL(改行区切り)
    researched_at         TEXT NOT NULL,               -- リサーチ実施日(YYYY-MM-DD)
    created_at            TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(company_name)
);

-- 送付先(アポ打診先)企業のリサーチ結果。仕入先の companies とは別テーブルで持つ。
CREATE TABLE IF NOT EXISTS prospects (
    id                    INTEGER PRIMARY KEY AUTOINCREMENT,
    company_name          TEXT NOT NULL,              -- 会社名
    url                   TEXT,                        -- 会社サイト
    headquarters_location TEXT,                        -- 所在地
    industry              TEXT,                        -- 業種(設計事務所/内装/ゼネコン等)
    business_description  TEXT,                        -- 事業内容
    segments              TEXT,                        -- 手がける領域・用途(店舗/オフィス/ホテル等)
    strengths             TEXT,                        -- 特徴・強み
    wood_relevance        TEXT,                        -- 木材との接点(木質化・木造・素材の扱い)
    talking_points        TEXT,                        -- メールで触れる切り口(改行区切り)
    caution               TEXT,                        -- 断定を避けるべき点・未確認事項
    source_urls           TEXT,                        -- 参照元URL(改行区切り)
    researched_at         TEXT NOT NULL,               -- リサーチ実施日(YYYY-MM-DD)
    created_at            TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(company_name)
);
