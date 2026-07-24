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
    fireproof_materials   TEXT,                        -- 扱っている不燃(不燃材料・準不燃材料・難燃材料等の区分)
    wood_species          TEXT,                        -- 対応樹種
    fireproof_paint_combination      TEXT,             -- 不燃商品と塗料の組み合わせ
    certified_substrate_combination  TEXT,             -- 大臣認定をとっている不燃木材と下地材の組み合わせ
    fireproof_product_paint_names    TEXT,             -- 扱っている不燃商品・不燃塗料の名称(ブランド名・商品名)
    features              TEXT,                        -- 特徴
    strengths             TEXT,                        -- 強み
    source_urls           TEXT,                        -- 参照元URL(改行区切り)
    researched_at         TEXT NOT NULL,               -- リサーチ実施日(YYYY-MM-DD)
    created_at            TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(company_name)
);
