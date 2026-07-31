-- 空間デザイナーのディープリサーチ結果を保管するデータベーススキーマ

CREATE TABLE IF NOT EXISTS designers (
    id                    INTEGER PRIMARY KEY AUTOINCREMENT,
    designer_name         TEXT NOT NULL,               -- 名前
    designer_name_en      TEXT,                        -- ローマ字表記
    company               TEXT NOT NULL,               -- 所属会社
    title                 TEXT,                        -- 肩書き
    company_genre         TEXT,                        -- 会社ジャンル(組織設計/アトリエ(建築設計)/アトリエ(デザインオフィス)/アトリエ系内装/大手内装(ディスプレイ業)/施工(設計施工))
    company_genre_detail  TEXT,                        -- 会社ジャンルの補足(業態の細分)
    headquarters_location TEXT,                        -- 所属会社の本社所在地
    num_locations         INTEGER,                     -- 所属会社の拠点数
    locations_detail      TEXT,                        -- 拠点の内訳
    target_spaces         TEXT,                        -- 主な対象とする空間
    signature_projects    TEXT,                        -- 代表的な事例
    materials             TEXT,                        -- 事例をもとによく使う素材
    features              TEXT,                        -- 特徴
    strengths             TEXT,                        -- 強み
    source_urls           TEXT,                        -- 参照元URL(改行区切り)
    researched_at         TEXT NOT NULL,               -- リサーチ実施日(YYYY-MM-DD)
    created_at            TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(designer_name, company)
);

CREATE INDEX IF NOT EXISTS idx_designers_genre ON designers(company_genre);
CREATE INDEX IF NOT EXISTS idx_designers_company ON designers(company);
