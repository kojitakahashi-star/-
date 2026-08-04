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

-- アポ打診先(発注・設計側)企業のリサーチ結果を保管するテーブル。
-- companies は木材サプライヤー、prospects は木材の需要側として分けて管理する。
CREATE TABLE IF NOT EXISTS prospects (
    id                    INTEGER PRIMARY KEY AUTOINCREMENT,
    company_name          TEXT NOT NULL,              -- 会社名
    headquarters_location TEXT,                        -- 本社所在地
    num_locations         INTEGER,                     -- 拠点数
    locations_detail      TEXT,                        -- 拠点の内訳
    industry              TEXT,                        -- 業種
    business_description  TEXT,                        -- 事業内容
    wood_touchpoint       TEXT,                        -- 木材との接点
    mail_angle            TEXT,                        -- 打診メールの切り口
    features              TEXT,                        -- 特徴
    strengths             TEXT,                        -- 強み
    notes                 TEXT,                        -- 特記事項(社名変更・統合・要確認事項等)
    source_urls           TEXT,                        -- 参照元URL(改行区切り)
    researched_at         TEXT NOT NULL,               -- リサーチ実施日(YYYY-MM-DD)
    created_at            TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(company_name)
);

-- 打診先の担当者。1社に複数名が紐づく。
CREATE TABLE IF NOT EXISTS prospect_contacts (
    id                    INTEGER PRIMARY KEY AUTOINCREMENT,
    company_name          TEXT NOT NULL,              -- prospects.company_name
    contact_name          TEXT NOT NULL,              -- 担当者名
    email                 TEXT NOT NULL,              -- メールアドレス
    department            TEXT,                        -- 部署
    title                 TEXT,                        -- 役職
    created_at            TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(email)
);
