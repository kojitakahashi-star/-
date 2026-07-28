/**
 * パシフィコエナジー FSC-FM案件 Google Drive フォルダ再編スクリプト
 *
 * 現行  : マイドライブ / 03_新規取得 / パシフィコエナジー
 * 再編後: マイドライブ / 03_新規取得 / パシフィコエナジー_FSC-FM
 *
 * 使い方
 *   1. https://script.google.com で新規プロジェクトを作成し、このファイルを貼り付ける
 *   2. CONFIG.DRY_RUN = true のまま main() を実行し、実行ログで計画を確認する
 *   3. 問題なければ CONFIG.DRY_RUN = false にして main() を再実行する
 *   4. 40_原則別根拠 のショートカットを作る場合のみ、
 *      エディタ左の「サービス」から Drive API (v3) を追加する（識別子は Drive）
 *
 * 設計方針
 *   - 移動(moveTo)のみを使い、コピーは一切しない。実体は常に1か所
 *   - 削除はしない。不要物は 90_アーカイブ へ移すか、空になった旧フォルダをゴミ箱へ入れるだけ
 *   - 2026-07-25 以降に更新されたファイルは改名しない（第一段階審査 7/27-29 の会期中に
 *     編集中のものがあるため）。該当分は note に理由を書き、ログに改名候補を出力する
 *   - 判断が割れているファイル（事前準備ガイド／書類一覧）は自動で正を決めず、
 *     並べて残したうえで REVIEW ログに出す
 */

var CONFIG = {
  // 03_新規取得 フォルダ。ここに新ルートを作る
  NEW_ROOT_PARENT: '1Z4Jjgz3oGqCfHUNF8b8Ou66Ig0I4zS4G',
  NEW_ROOT_NAME:   'パシフィコエナジー_FSC-FM',

  // 現行の案件ルート（空になった旧フォルダの掃除に使う）
  OLD_ROOT: '1ldRcdxDE71AZZOcL-CGq1PvkvGqBkEt_',

  DRY_RUN:          true,   // true の間は1件も変更しない
  DO_RENAME:        true,   // ファイル・フォルダの改名を行う
  DO_SHORTCUTS:     true,   // 40_原則別根拠 のショートカットを作る（Drive API v3 が必要）
  DO_TRASH_EMPTY:   true,   // 移動後に空になった旧フォルダをゴミ箱へ
  RENAME_FREEZE:    '2026-07-25'  // この日以降に更新されたファイルは改名しない
};

/** 事前に用意する空フォルダ（移動で出来るフォルダはここに書かない） */
var PATHS = [
  '00_案件管理',
  '00_案件管理/スケジュール',
  '10_契約・見積',
  '10_契約・見積/11_パシフィコエナジー',
  '20_審査対応',
  '20_審査対応/21_申込・審査計画',
  '20_審査対応/23_審査記録',
  '30_認証文書（提出成果物）',
  '30_認証文書（提出成果物）/33_手順書・方針',
  '30_認証文書（提出成果物）/34_記録様式',
  '40_原則別根拠',
  '40_原則別根拠/原則01_法令遵守',
  '40_原則別根拠/原則02_労働者の権利',
  '40_原則別根拠/原則04_地域社会との関係',
  '40_原則別根拠/原則06_環境影響',
  '40_原則別根拠/原則07_管理計画',
  '40_原則別根拠/原則09_高い保護価値（HCV）',
  '40_原則別根拠/原則10_施業の実施',
  '50_根拠資料',
  '50_根拠資料/54_図面',
  '50_根拠資料/57_利害関係者・ヒアリング',
  '50_根拠資料/58_HCV',
  '70_規格・参考資料',
  '90_アーカイブ/2025',
  '90_アーカイブ/2026'
];

/**
 * 第1段: フォルダの移動。丸ごと動かせるものは中身を個別に触らない。
 * ここを先に流すことで、後続の to: パスが解決できるようになる。
 */
var FOLDER_MOVES = [
  { id: '1UDon_jdFzmuDhYwigt4hOaQSZjlv8scj', from: '000_議事録関係',            to: '00_案件管理',   rename: '議事録' },

  { id: '1rUwsnVJLr1l0QkVYyV6QvOArnqBhoSH4', from: '00_ご提案資料',             to: '10_契約・見積/11_パシフィコエナジー', rename: '提案' },
  { id: '1y9z5e8QwZFKl2l7g4POgk6jAu3wpvABc', from: '01/PEK NDA秘密保持契約書',  to: '10_契約・見積/11_パシフィコエナジー', rename: 'NDA' },
  { id: '18y8d7fl2hGGMw26SPFHrjKC2hesDa5dh', from: '01/見積書',                 to: '10_契約・見積/11_パシフィコエナジー', rename: '見積書',
    note: '汐見様ご記入用の見積が同居している。相手先別に分けるか要判断' },
  { id: '1XMurAyI8Q7eyWDCjqjH86VKugr0XstRH', from: '03_ご契約資料（森未来）',    to: '10_契約・見積/11_パシフィコエナジー', rename: '業務委託契約_森未来' },
  { id: '1NFmnqzuW_ip-zLMDz6oQj2Qq2D7Fc_N_', from: '30_FMコンサル汐見様ご契約',  to: '10_契約・見積', rename: '12_汐見様' },

  { id: '1kytQhjgm72me4pDZVdOj8zQUItiiWRqb', from: '01/FSCFM審査申込書',        to: '20_審査対応/21_申込・審査計画', rename: '審査申込書' },
  { id: '1Kehyn40cYmOzOAJeUOlNi1XEmT5IMrxi', from: '04/FM予備審査計画書',       to: '20_審査対応/21_申込・審査計画', rename: '予備審査計画書' },
  { id: '1IepcOHVqVUtJEdsD2OUHJpa_wVwlxeo2', from: '04/事前準備ガイド',         to: '20_審査対応', rename: '22_事前準備ガイド',
    note: '★ 中の2本が並行更新中。正の決定は人が行う（REVIEWログ参照）' },
  { id: '18zeOglBDnEbsHlMda3EicQVF4e5znyIR', from: '04/機密保持宣誓書',         to: '20_審査対応', rename: '24_機密保持宣誓書' },
  { id: '1OtZR-zKOu2HdpoE1N6c6DCQmrWTj8FOI', from: '04/公開用審査報告書',       to: '20_審査対応/23_審査記録', rename: '公開用審査報告書' },
  { id: '1J8bqICcXMjsxz4FXS2vUdUeQ1IpGuEXa', from: '04/インタビュー内容',       to: '20_審査対応/23_審査記録', rename: 'インタビュー内容' },

  { id: '1xhg7HaKvnYX-8Q9jmT53XF5QAC4nRyAJ', from: '06/森林管理計画書',         to: '30_認証文書（提出成果物）', rename: '31_森林管理計画書' },
  { id: '1sAo0xUr0z64gPle1GwDHoGwTbn8Ke2nV', from: '06/森林管理計画書資料編',   to: '30_認証文書（提出成果物）', rename: '32_森林管理計画書_資料編' },
  { id: '1l4zj3d_NPfNIn88NswPU7Z2SzZS6Rrdc', from: '10/方針声明',               to: '30_認証文書（提出成果物）/33_手順書・方針', rename: '方針声明' },

  { id: '1gbQ3yfQkrL3qHDVq7TR0P5MG-AF-s7E1', from: '08_森林簿',                 to: '50_根拠資料', rename: '51_森林情報' },
  { id: '1EztNJgYOiP6-UBazf8x_YOk8rL6bJ8N8', from: '09_地域森林計画',           to: '50_根拠資料', rename: '52_地域森林計画' },
  { id: '1Yf23e52YOucscBLefvjvuqbeomGl0N7q', from: '02/5_森林経営計画書',       to: '50_根拠資料', rename: '53_森林経営計画書' },
  { id: '1Xc-C4A-WB5gGBjvuN_Z0uY3jXWuPg2Uu', from: '02/1_土地利用計画図',       to: '50_根拠資料/54_図面', rename: '土地利用計画図' },
  { id: '1Rar-7h05BFXJXm6-0QB_8WbCAtqIpO4H', from: '02/2_伐採・主伐・植林計画', to: '50_根拠資料/54_図面', rename: '伐採・主伐・植林計画' },
  { id: '1uNKEv-Ok2YgnFp-3TqHdKCbLwZaP_T_B', from: '02/3_主伐エリア',           to: '50_根拠資料/54_図面', rename: '主伐エリア' },
  { id: '1IVuHuqprVV0Zl7Oj1fxQRudvvNjYFsJd', from: '02/4_環境アセス評価書',     to: '50_根拠資料', rename: '55_環境アセス' },
  { id: '1vC0lsrKwD8fYnxzLtK1IwNzyjqQwGyCE', from: '10_労務関係',               to: '50_根拠資料', rename: '56_労務' },
  { id: '1mUGta_RFOOFSlOJMHjVV8Mva2olcY1fR', from: '06/東京都最低賃金',         to: '50_根拠資料/56_労務', rename: '最低賃金' },
  { id: '1DQO5RSkrVSUSkyKnl1A6MQK39uLa9lPv', from: '33/原則2_パシフィコさん作成', to: '50_根拠資料/56_労務', rename: '原則2_コンプライアンス関連' },
  { id: '1SV5B3XTiIxnGrXdef3YeRJQPO03IYyuL', from: '06/放射能',                 to: '50_根拠資料/55_環境アセス', rename: '放射能' },
  { id: '1_HZ8fTgjetmhy_7jHfIfcGhMiNlkOpGB', from: '06/原生林景観',             to: '50_根拠資料/58_HCV', rename: '原生林景観' },

  { id: '18PpdYtmDFxHpHFBLyZtB5bu1rMAZ4T0E', from: '07_教育訓練',               to: '',            rename: '60_教育訓練' },

  { id: '1Y0S5PLQKFg28XtSUlhLy0RUMgriBiAHE', from: '05_ FM国内規格チェックリスト', to: '70_規格・参考資料', rename: 'FM国内規格チェックリスト' },
  { id: '1PGXnNMpY_48bk3zzQRRq-o7EoEglr617', from: '04/FSC日本国内森林管理基準', to: '70_規格・参考資料', rename: 'FSC日本国内森林管理基準' },
  { id: '1ZN3nFH31ra7mn5EEQhyT4CH90np41ZDs', from: '04/審査方針',               to: '70_規格・参考資料', rename: '審査方針' },
  { id: '1cR1ZzqBb_PnM0OQCRJP9WV9x-LlX7Q0X', from: '06/サンプル',               to: '70_規格・参考資料', rename: 'サンプル' },

  // 散在していた「旧」を1か所へ集約
  { id: '1bETWHz3SEN2okZlcVJ4Fj7J97cClLBGz', from: '30/旧',                     to: '90_アーカイブ/2026', rename: '旧_30_汐見様ご契約' },
  { id: '1AwN4v0zeJNZu1UKk9tHVuuOmW04Og_IR', from: '32/旧',                     to: '90_アーカイブ/2026', rename: '旧_32_HARDWOOD様資料' },
  { id: '1XFRsfEIU95HQMQxmDZvH9UXErc8ykQ54', from: '33/旧',                     to: '90_アーカイブ/2026', rename: '旧_33_書類一覧' },
  { id: '1bXe3iNN2aaYTnqDmEQIoEMQYs7d9exrf', from: '04/事前準備ガイド/旧',      to: '90_アーカイブ/2026', rename: '旧_事前準備ガイド' }
];

/** 第2段: 個別ファイルの移動と改名 */
var FILE_MOVES = [
  // ---- 00_案件管理 ----
  { id: '12CFsarRGa8ERYiJZqVy6IUnjDzVUQX9n', from: '33/書類一覧_ver.2.xlsx', to: '00_案件管理',
    review: '★ 索引が ver.1 と ver.2 に分岐。統合して1本にすること。統合まで改名しない' },
  { id: '1HjYcFbU1iAe7Tfqzipf0Rrls3prgazFC', from: '33/書類一覧_ver.1.xlsx', to: '00_案件管理',
    review: '★ 上と対。差分を突き合わせ、負けた側を 90_アーカイブ/2026 へ移すこと' },
  { id: '1lKzQF5NIKexl7ehPqmTRW0zW-iWMkdEXcbu0OACn9Aw', from: '01/認証取得に向けたスケジュール',
    to: '00_案件管理/スケジュール', rename: '20260316_認証取得スケジュール_v1.0' },
  { id: '1c6wOb3SZ1mMLo8B3AYtQs4ikD5Tfb07-T_NDkUdpmHg', from: '04/FSC審査日程表',
    to: '00_案件管理/スケジュール', rename: '20260708_FSC審査日程表_v1.0' },

  // 第一段階審査の記録だけ議事録から分ける（審査中の生きた文書なので改名しない）
  { id: '1X2hCL5-AGZ8ALOslcSSZDyTwW4AMZ_Yi7-OJlZ1cDVg', from: '000/0727_FM第一段階審査',
    to: '20_審査対応/23_審査記録', note: '審査中に更新中のため改名しない' },

  // ---- 10_契約・見積 ----
  { id: '1FgLLRWnVEs3ynLZLdiyAFVewVeTTZOn16IynWkLIIic', from: '01/別紙　旅費交通費_最終版',
    to: '10_契約・見積/11_パシフィコエナジー', rename: '20260217_別紙_旅費交通費_v1.0_確定' },
  { id: '15Kevucs1AWYyi-FgyNQc_JmasIMsZxdr', from: '01/FM認証_コンサルティング内容一覧.xlsx',
    to: '10_契約・見積/11_パシフィコエナジー', rename: '20260217_FM認証_コンサルティング内容一覧_v1.0.xlsx' },

  // 業務委託契約（森未来）: 確定版を残し、ドラフト2本をアーカイブ
  { id: '1XefHIbFcT_5v5O2XwPLSsQ6gIY6k0dfm', from: '03/…契約書_ドラフト_final.docx',
    to: '10_契約・見積/11_パシフィコエナジー/業務委託契約_森未来',
    rename: '20260225_FM認証コンサルティング_業務委託基本契約書_v1.0_確定.docx' },
  { id: '1OlatarvTWzu55twiTDNB2S4ZY6rNVwfd', from: '03/…ドラフトver.1.docx',      to: '90_アーカイブ/2026', rename: '20260216_業務委託基本契約書_v0.1_旧.docx' },
  { id: '1sm7x09RwVebpfEmBX9Ld5ggvgGWWAFHh', from: '03/…ドラフトver.1_PEK.docx',  to: '90_アーカイブ/2026', rename: '20260225_業務委託基本契約書_v0.2_PEK確認_旧.docx' },

  // 汐見様: 確定版を残し、ドラフト3本をアーカイブ
  { id: '1A7IgmLStUm1K-nni06lH_o3an6rGTAAh', from: '30/…基本契約_確定版.docx',
    to: '10_契約・見積/12_汐見様', rename: '20260323_汐見様_業務委託基本契約_v1.0_確定.docx' },
  { id: '1_SZ2dBuGZ3HIREbBpdUpZyz_p8sGcrDG', from: '30/…基本契約_ドラフト.docx',        to: '90_アーカイブ/2026', rename: '20260303_汐見様_業務委託基本契約_v0.1_旧.docx' },
  { id: '1sr22rBGPZeqHX6JXZgiviTbvdmfXhKzc', from: '30/…ドラフト_高橋記入.docx',        to: '90_アーカイブ/2026', rename: '20260310_汐見様_業務委託基本契約_v0.2_旧.docx' },
  { id: '1StSEJFxfN9vSX4VBNWJVwOxzratdeviv', from: '30/…ドラフト_final.docx',           to: '90_アーカイブ/2026', rename: '20260319_汐見様_業務委託基本契約_v0.3_旧.docx' },
  { id: '1n70MphySpwqdn_qLdKYb4WWtICk98D-1', from: '30/…支援業務の御見積書.pdf',
    to: '10_契約・見積/12_汐見様', rename: '20260206_汐見様_FM認証コンサル支援_見積書.pdf' },
  { id: '1faOhxV0lFXZXnguIhArQbuWlDkgrUfqt', from: '30/20260305123605840.pdf',
    to: '10_契約・見積/12_汐見様', rename: '20260305_汐見様_スキャン書類_内容要確認.pdf',
    review: 'スキャナ既定名のため内容を特定できず。中身を見て正式名に直すこと' },

  // 12_契約関連 に1枚だけ残っていた出典不明の画像
  { id: '1UBN_ULt0p2MiL9ou7-3_UHR7zWTCtttp', from: '12_契約関連/image001.png',
    to: '90_アーカイブ/2026', rename: '20260707_出典不明画像_旧12_契約関連.png',
    review: '内容不明のため削除せずアーカイブ。不要と判断できれば捨てる' },

  // ---- 30_認証文書 ----
  { id: '1yPqaAXhYy9vulCAQ7ty7MHeZV9n5VOle', from: '06/森林管理計画書/ver.1.docx',
    to: '90_アーカイブ/2026', rename: '20260716_森林管理計画書_v1.0_旧.docx' },
  { id: '11ASO8KQ4IzTdOrIlBDCj3YDVeR0AUgSy', from: '06/森林管理計画書/ver.1.1_In連絡先追記.docx',
    to: '90_アーカイブ/2026', rename: '20260716_森林管理計画書_v1.1_旧.docx' },
  { id: '1qz1gg5wjFDPErTGd5bXco7e8MM-tlokcH_orCMO8dWk', from: '06/森林管理計画書/確認事項',
    to: '30_認証文書（提出成果物）/31_森林管理計画書', rename: '20260514_森林管理計画書_確認事項' },
  // ver.2 (1cPa-mK3tzJbh7Eq6FuKipsUaJwtmc79G) は 7/27 更新のため改名せず現状のまま 31 に残る

  { id: '1yG3CC6JZ4pSLrKdVQcVGJEGPS7LCEiTN', from: '06/資料編/ver.1.docx',
    to: '90_アーカイブ/2026', rename: '20260714_森林管理計画書_資料編_v1.0_旧.docx' },
  { id: '1NBlxttl9IfeyxqbjdfaFrPHqRSMPizTl', from: '06/資料編/ver.1.1_In連絡先追記.docx',
    to: '90_アーカイブ/2026', rename: '20260714_森林管理計画書_資料編_v1.1_旧.docx' },
  { id: '1BbGLmqgEM8ipMwFu9qh7kTlFEBBxKxu5', from: '06/資料編/ver.2.docx',
    to: '30_認証文書（提出成果物）/32_森林管理計画書_資料編', rename: '20260723_森林管理計画書_資料編_v2.0.docx' },

  { id: '1WJRDEJGk8pZrQSgS30y_ftmaZdo-RTtI', from: '06/森林作業共通仕様書_ver.1.docx',
    to: '30_認証文書（提出成果物）/33_手順書・方針', rename: '20260714_森林作業共通仕様書_v1.0.docx' },
  { id: '1vybhekndb-z4p-uG0bObaxtImAKSclzhuXI5fCZIOiI', from: '06/安全衛生管理の実施方針',
    to: '30_認証文書（提出成果物）/33_手順書・方針', rename: '20260413_安全衛生管理の実施方針_v1.0' },

  // 方針声明（拡張子の二重付与も直す）
  { id: '1YO3EG2giVZoYBX1DQ-JFWceHbOsa1cdt', from: '10/方針声明/パシフィコ・エナジー様….docx.docx',
    to: '30_認証文書（提出成果物）/33_手順書・方針/方針声明',
    rename: '20260710_パシフィコエナジー様_FSC中核的労働要求事項_方針声明_v1.0.docx' },
  { id: '13Yu4Oyp8QaEexD7ZZ5nko68rhMhsL8Iy', from: '10/方針声明/山口県東部森林組合様….docx',
    to: '30_認証文書（提出成果物）/33_手順書・方針/方針声明',
    rename: '20260709_山口県東部森林組合様_FSC中核的労働要求事項_方針声明_v1.0.docx' },
  { id: '1ia1B5jHC8tLYbgXQ5a6A_wNOMdYjBFJX', from: '10/方針声明/HARDWOOD様….docx',
    to: '30_認証文書（提出成果物）/33_手順書・方針/方針声明',
    rename: '20260708_HARDWOOD様_FSC中核的労働要求事項_方針声明_v1.0.docx' },

  { id: '1wua9WVRejW4DQRNy_nNwtXmNZBxuL9qe', from: '07/森林組合様_教育訓練実施記録.xlsx',
    to: '30_認証文書（提出成果物）/34_記録様式', note: '7/28 更新のため改名しない' },
  { id: '1l9TNDa6FgSSYFuPBIq1hao8Wln6badncxCxkyi7Q8ys', from: '06/森林管理関係者資格一覧',
    to: '30_認証文書（提出成果物）/34_記録様式', rename: '20260710_森林管理関係者資格一覧_v1.0' },
  { id: '1WNtc0y_kIYGSdDpuKgN_szbVL2lmy6RBJh_Y4nBKPIg', from: '06/別紙_管理目的を達成するための活動…',
    to: '30_認証文書（提出成果物）/34_記録様式', note: '7/28 更新のため改名しない' },

  // ---- 50_根拠資料 ----
  { id: '1ZSt3WF9hOUNvFaPD67hfwxoRFRmULYSd', from: '08/TKYM_森林簿_材齢_20240705.pptx',
    to: '50_根拠資料/51_森林情報', rename: '20240705_徳山_森林簿_材齢_v1.0.pptx',
    note: '02/0 の同一実体(257,639B)を正とし、こちらを残す' },
  { id: '1AwluCoPnhRS-wHneK78LAq4Ob-9Or-nO', from: '02/0/森林簿_徳山_材齢_20240705.pptx',
    to: '90_アーカイブ/2026', rename: '20240705_徳山_森林簿_材齢_重複コピー.pptx' },
  { id: '1ctzcqfr9kQEGgH1fLoziTDV9TzrhiEq8', from: '08/20240618_周南市森林簿.xlsx',
    to: '50_根拠資料/51_森林情報', rename: '20240618_周南市森林簿_全域_v1.0.xlsx',
    review: '57MB。長穂版があるので、全域版は 90_アーカイブ へ回せるか要判断' },
  { id: '1KdntNqktsojgqDD3Lcb9lm2FMub-S_60', from: '08/20240618_周南市森林簿_【長穂】.xlsx',
    to: '50_根拠資料/51_森林情報', rename: '20240618_周南市森林簿_長穂_v1.0.xlsx' },
  { id: '11kHP-DwW-5bTqhk3OGBXBmIGIqJoHpgg', from: '08/林班リスト.xlsx',
    to: '50_根拠資料/51_森林情報', rename: '20260414_林班リスト_v1.0.xlsx',
    review: '同名フォルダ「林班リスト/」が併存。中身を確認して片方に寄せること' },
  { id: '1PKsOOqhn5ODPya_qYskQdUTp8Ao4bLul', from: '08/高橋記載済み森林簿.pdf',
    to: '50_根拠資料/51_森林情報', rename: '20260409_森林簿_記載済_v1.0.pdf' },

  { id: '1RoOUftGqF9eNntrMP3mFPcHWsQWBun8y', from: '09/周南市.pdf',
    to: '50_根拠資料/52_地域森林計画', rename: '20260406_地域森林計画_周南市.pdf' },
  { id: '16JFy3Mew2Tl_O-prmTgxfoDKxppken0U', from: '09/山口県.pdf',
    to: '50_根拠資料/52_地域森林計画', rename: '20260406_地域森林計画_山口県.pdf' },

  { id: '1-KnY3MvfUvzMgamtyNS3qP7UysjzjZmJ', from: '02/0/土地利用計画図_r5地番重ね図_墨消.pdf',
    to: '50_根拠資料/54_図面/土地利用計画図', rename: '20251107_土地利用計画図_r5地番重ね図_墨消_v1.0.pdf' },
  { id: '14CTiVRsqCqrYxakKdm2cv0WOH-tqxYYt', from: '02/0/2024月6月6日～7日における重要な種….pdf',
    to: '50_根拠資料/55_環境アセス', rename: '20240806_重要な種及び重要な群落の確認結果_v1.0.pdf' },
  { id: '1pjnAv7Bu-5XcGw1L-l86gulbLS3TxQYN9-Q9a6Vf_zo', from: 'ルート直下/環境アセスIA（CR）・IB（EN）抽出リスト',
    to: '50_根拠資料/55_環境アセス', rename: '20260610_環境アセス_IA-CR・IB-EN抽出リスト_v1.0' },

  // 環境アセス: PDF と Google ドキュメント変換版が同名で並列していたので変換版を分ける
  { id: '1D31TiLu-m4jTvVn4Iyalbbqb4-iaAxK-SsS0ULXIkP0', from: '02/4/資料編（…SWS）[変換版]',
    to: '50_根拠資料/55_環境アセス/テキスト変換版', rename: '20240906_資料編_動植物確認種一覧ほか_テキスト変換版' },
  { id: '1CqImLbhBnR5Qtw-_DpLFGr3G2mEVciMOnqaEYlz7KFg', from: '02/4/…評価書_植物[変換版]',
    to: '50_根拠資料/55_環境アセス/テキスト変換版', rename: '20260604_周南市長穂_環境影響評価書_植物_テキスト変換版' },
  { id: '11wFlTsGO9IaJJEE0sfJAKyqaIdMN8pW5em5wSu1H79A', from: '02/4/…評価書_重要な種[変換版]',
    to: '50_根拠資料/55_環境アセス/テキスト変換版', rename: '20260604_周南市長穂_環境影響評価書_重要な種_テキスト変換版' },

  // 利害関係者リスト: 06側(44,212B / 7-28更新)を正とし、11側(15,256B / 6-9更新)をアーカイブ
  { id: '1i2PVk-JXnc7hPfC3ts-702E3oxG9nGPn', from: '06/利害関係者リスト_20260608_r0.1_In.xlsx',
    to: '50_根拠資料/57_利害関係者・ヒアリング',
    note: '7/28 更新のため改名しない。これを正本とする' },
  { id: '19QPe4Jom9IY818fX6fe-p33QfAOjn-Dh', from: '11/利害関係者リスト_20260608_r0.1_In.xlsx',
    to: '90_アーカイブ/2026', rename: '20260609_利害関係者リスト_r0.1_旧_11側.xlsx',
    review: '同名別内容だった2本のうち古い側。統合漏れがないか確認してから捨てること' },
  // ヒアリング記録: 同一実体が2部。11側を残し 02/6 側をアーカイブ
  { id: '1m4B6vmVsOqHzNkprcG8uVpN-7hI8qRox', from: '11/徳山森林事業_ヒアリング記録…rev.0.4.xlsx',
    to: '50_根拠資料/57_利害関係者・ヒアリング', note: '7/27 更新のため改名しない。これを正本とする' },
  { id: '1PBi0m6M0tm_s60wrE_KjunYWvr00s2q9', from: '02/6/徳山森林事業_ヒアリング記録…rev.0.4.xlsx',
    to: '90_アーカイブ/2026', rename: '20260723_ヒアリング記録_rev.0.4_重複コピー.xlsx' },

  { id: '1Gj34MMW_Ef6_-hLlPd-aDp0v3RCuiNr59HadQJDDiOk', from: '06/HCV評価シート',
    to: '50_根拠資料/58_HCV', note: '7/28 更新のため改名しない' },
  { id: '16apCkliQsU4raYzSw6tAl5EU9764dcFI41Zd7yEf4nA', from: '06/HCVについて',
    to: '50_根拠資料/58_HCV', rename: '20260619_HCVについて_v1.0' },

  // ---- 60_教育訓練 ----
  { id: '1p0NrmvilZ3WDbWj-i_S39zYoI7dafF7lKZHdPguuods', from: '07/パシフィコ・エナジー様_森林認証教育訓練',
    to: '60_教育訓練', rename: '20260402_パシフィコエナジー様_森林認証教育訓練_v1.0' },
  { id: '1mRwltJ_q3wB040bAMYt60bvLpXTd3FoL', from: '31/FSC FM認証の概要.pdf',
    to: '60_教育訓練', rename: '20260305_FSC-FM認証の概要_v1.0.pdf' },

  // ---- 70_規格・参考資料 ----
  { id: '1MHF0tnAuQ0DoFpPeMtZtdNsGLFMw3S1D', from: '05/FM国内規格チェックリスト_森谷確認用.xlsx',
    to: '70_規格・参考資料/FM国内規格チェックリスト', rename: '20260701_FM国内規格チェックリスト_v1.1.xlsx',
    note: '後発かつ大きい側を現行とする' },
  { id: '1IwkTGgSA3J508zpEUdLo8c9xQ5kctoHe', from: '05/FM国内規格チェックリスト.xlsx',
    to: '90_アーカイブ/2026', rename: '20260604_FM国内規格チェックリスト_v1.0_旧.xlsx' },
  { id: '1f_gxIcUne3QAIEitOCcFe6qlIPIegdC7', from: '04/FSC-FM規格文書等のダウンロード先26.2.18.xlsx',
    to: '70_規格・参考資料', rename: '20260218_FSC-FM規格文書ダウンロード先_v1.0.xlsx' },
  { id: '14HMMv4bL-g16EZyVr90dN1Af-3AG0j0R', from: '32/260429_森林経営計画書策定のための指針（案）(修正版).pdf',
    to: '70_規格・参考資料', rename: '20260429_森林経営計画書策定のための指針（案）_修正版_v1.0.pdf' },
  { id: '1mHhRjws1YZZuZ24LzLN5AnLgIv04quEi', from: '06/サンプル/224537.pdf',
    to: '70_規格・参考資料/サンプル', rename: '20260622_サンプル_内容要確認_1.pdf',
    review: '無意味な名前。中身を見て正式名に直すこと' },
  { id: '1grh4x_21LzDmj7AVHTHwGz4a_xtRllpK', from: '06/サンプル/224540.pdf',
    to: '70_規格・参考資料/サンプル', rename: '20260622_サンプル_内容要確認_2.pdf',
    review: '無意味な名前。中身を見て正式名に直すこと' },

  // ---- 出典不明・重複の画像はアーカイブへ ----
  { id: '1r-25N4vkmqpnKTol7I61WE76Db4O5y-e', from: '06/スクリーンショット 2026-06-16 9.26.17.png',
    to: '90_アーカイブ/2026', rename: '20260616_出典不明スクリーンショット_1.png' },
  { id: '1jk9ZfJ5kdpeV40CvLlmpc9y_yq2l-9nW', from: '06/スクリーンショット 2026-06-16 9.20.42.png',
    to: '90_アーカイブ/2026', rename: '20260616_出典不明スクリーンショット_2.png' },
  { id: '11yOgMOiG4VS-B9JnR4oO35VyJJ18jo7d', from: '06/放射能/スクリーンショット…8.29.09.png',
    to: '90_アーカイブ/2026', rename: '20260728_重複スクリーンショット_放射能側_1.png',
    note: '原生林景観 側と同一(1,028,077B)' },
  { id: '1sMUn-6sNbdpvdcHCdhOPrtH9jdSFFLmz', from: '06/放射能/スクリーンショット…8.29.02.png',
    to: '90_アーカイブ/2026', rename: '20260728_重複スクリーンショット_放射能側_2.png',
    note: '原生林景観 側と同一(1,026,143B)' }
];

/**
 * 第3段: 40_原則別根拠 のショートカット。実体は複製せず参照だけ置く。
 * Drive API (v3) を「サービス」から追加していない場合はスキップされる。
 */
var SHORTCUTS = [
  { at: '40_原則別根拠/原則01_法令遵守',            target: '50_根拠資料/52_地域森林計画' },
  { at: '40_原則別根拠/原則01_法令遵守',            target: '50_根拠資料/56_労務/原則2_コンプライアンス関連' },
  { at: '40_原則別根拠/原則02_労働者の権利',        target: '50_根拠資料/56_労務' },
  { at: '40_原則別根拠/原則02_労働者の権利',        target: '30_認証文書（提出成果物）/33_手順書・方針/方針声明' },
  { at: '40_原則別根拠/原則04_地域社会との関係',    target: '50_根拠資料/57_利害関係者・ヒアリング' },
  { at: '40_原則別根拠/原則06_環境影響',            target: '50_根拠資料/55_環境アセス' },
  { at: '40_原則別根拠/原則07_管理計画',            target: '30_認証文書（提出成果物）/31_森林管理計画書' },
  { at: '40_原則別根拠/原則07_管理計画',            target: '50_根拠資料/53_森林経営計画書' },
  { at: '40_原則別根拠/原則09_高い保護価値（HCV）', target: '50_根拠資料/58_HCV' },
  { at: '40_原則別根拠/原則10_施業の実施',          target: '50_根拠資料/54_図面' }
];

/** 第4段: 空になったら片付ける旧フォルダ（空でなければ残す） */
var TRASH_IF_EMPTY = [
  { id: '1NlaVO4gB7iad7IkInloQcxv7gGklZSL1', name: '02/0_11月 打合せ時資料' },
  { id: '1Kz6ztyQga6mYzYCPpD8khLUknPjiHxy5', name: '02/6_ヒアリング記録' },
  { id: '1FTnexRBNfIrZlDg6si7dE7b-QzPGAvBJ', name: '02_先方関連資料' },
  { id: '1dy8ZfLgKl_Cw8_Y9Hc2m3iplOSoys8fA', name: '01_審査見積もり関連資料' },
  { id: '11A5r8g2qtP2Pm6JBLcg6PK1iMSdbL1wi', name: '04_審査関係書類' },
  { id: '1exitoFcZ-8G48UwM7t6OcafDppRrJC6v', name: '06_マニュアル' },
  { id: '1HBnMBagMK62SeO05i8zq2GuZC8WOolZj', name: '11_利害関係者リスト' },
  { id: '1j2-Y2KBp4pJTTuwEzZ9wq4FoDINRRTGk', name: '12_契約関連' },
  { id: '1CLqi2K2Yz0e6sGy01ymk8TD2QkeYbtcA', name: '31_汐見さん教育訓練資料' },
  { id: '1VM4OTSAiPzEuyvuRfIiIUDSgaCHs-f15', name: '32_HARDWOODさん資料' },
  { id: '1Pm9JooaO1hWMcHK2_Ev8z-JRsA9EeQyT', name: '33_書類一覧' },
  { id: '1ldRcdxDE71AZZOcL-CGq1PvkvGqBkEt_', name: 'パシフィコエナジー（旧ルート）' }
];

// ===========================================================================

var LOG = [];
var REVIEW = [];
var FAIL = [];
var newRoot = null;
var folderCache = {};

function main() {
  LOG = []; REVIEW = []; FAIL = []; folderCache = {};

  say('=== パシフィコエナジー FSC-FM フォルダ再編 ===');
  say(CONFIG.DRY_RUN ? '[DRY RUN] 変更は行いません' : '[実行] Drive を実際に変更します');

  newRoot = ensureNewRoot();
  PATHS.forEach(function (p) { ensureFolder(p); });

  say('--- 第1段: フォルダ移動 (' + FOLDER_MOVES.length + '件) ---');
  FOLDER_MOVES.forEach(function (m) { moveOne(m, true); });

  say('--- 第2段: ファイル移動・改名 (' + FILE_MOVES.length + '件) ---');
  FILE_MOVES.forEach(function (m) { moveOne(m, false); });

  say('--- 第3段: 原則別ショートカット ---');
  if (CONFIG.DO_SHORTCUTS) { SHORTCUTS.forEach(makeShortcut); }
  else { say('  スキップ (DO_SHORTCUTS = false)'); }

  say('--- 第4段: 空になった旧フォルダの片付け ---');
  if (CONFIG.DO_TRASH_EMPTY) { TRASH_IF_EMPTY.forEach(trashIfEmpty); }
  else { say('  スキップ (DO_TRASH_EMPTY = false)'); }

  say('');
  say('=== 人の判断が必要な項目 (' + REVIEW.length + '件) ===');
  REVIEW.forEach(function (r) { say('  * ' + r); });

  if (FAIL.length) {
    say('');
    say('=== 失敗 (' + FAIL.length + '件) ===');
    FAIL.forEach(function (f) { say('  ! ' + f); });
  }

  say('');
  say('完了。' + (CONFIG.DRY_RUN ? 'CONFIG.DRY_RUN = false にして再実行してください。' : ''));
  Logger.log(LOG.join('\n'));
  return LOG.join('\n');
}

function say(s) { LOG.push(s); }

function ensureNewRoot() {
  var parent = DriveApp.getFolderById(CONFIG.NEW_ROOT_PARENT);
  var it = parent.getFoldersByName(CONFIG.NEW_ROOT_NAME);
  if (it.hasNext()) {
    var f = it.next();
    say('新ルート: 既存を使用 ' + CONFIG.NEW_ROOT_NAME);
    return f;
  }
  say('新ルート: 作成 ' + CONFIG.NEW_ROOT_NAME);
  if (CONFIG.DRY_RUN) { return parent; }   // dry run 中は親を仮に返す
  return parent.createFolder(CONFIG.NEW_ROOT_NAME);
}

/** 新ルート配下の相対パスを解決し、無ければ作る */
function ensureFolder(path) {
  if (!path) { return newRoot; }
  if (folderCache[path]) { return folderCache[path]; }

  var parts = path.split('/');
  var cur = newRoot;
  var walked = [];

  for (var i = 0; i < parts.length; i++) {
    walked.push(parts[i]);
    var key = walked.join('/');
    if (folderCache[key]) { cur = folderCache[key]; continue; }

    var it = cur.getFoldersByName(parts[i]);
    if (it.hasNext()) {
      cur = it.next();
    } else {
      say('  フォルダ作成: ' + key);
      if (CONFIG.DRY_RUN) { folderCache[key] = cur; continue; }
      cur = cur.createFolder(parts[i]);
    }
    folderCache[key] = cur;
  }
  return cur;
}

function moveOne(m, isFolder) {
  var label = (m.from || m.id) + ' -> ' + (m.to || '(ルート)') + (m.rename ? ' / 改名: ' + m.rename : '');
  try {
    var item = isFolder ? DriveApp.getFolderById(m.id) : DriveApp.getFileById(m.id);
    var dest = ensureFolder(m.to);

    var freeze = false;
    if (!isFolder && m.rename) {
      var mod = item.getLastUpdated();
      if (mod && mod >= new Date(CONFIG.RENAME_FREEZE + 'T00:00:00Z')) {
        freeze = true;
      }
    }

    say('  ' + label + (freeze ? '  [改名保留: ' + CONFIG.RENAME_FREEZE + ' 以降に更新]' : ''));

    if (!CONFIG.DRY_RUN) {
      item.moveTo(dest);
      if (CONFIG.DO_RENAME && m.rename && !freeze) { item.setName(m.rename); }
    }
    if (freeze) {
      REVIEW.push('改名保留: ' + m.from + ' → 審査後に「' + m.rename + '」へ');
    }
    if (m.note)   { say('      note: ' + m.note); }
    if (m.review) { REVIEW.push(m.from + ' : ' + m.review); }
  } catch (e) {
    FAIL.push(label + '  (' + e.message + ')');
  }
}

function makeShortcut(s) {
  try {
    var at = ensureFolder(s.at);
    var target = ensureFolder(s.target);
    var name = s.target.split('/').pop();
    say('  ショートカット: ' + s.at + ' -> ' + s.target);
    if (CONFIG.DRY_RUN) { return; }

    // 既存があれば作らない
    var existing = at.getFoldersByName(name);
    if (existing.hasNext()) { return; }

    Drive.Files.create({
      name: name,
      mimeType: 'application/vnd.google-apps.shortcut',
      parents: [at.getId()],
      shortcutDetails: { targetId: target.getId() }
    }, null, { supportsAllDrives: true });
  } catch (e) {
    FAIL.push('ショートカット ' + s.at + ' -> ' + s.target + '  (' + e.message +
              ') ※ Drive API (v3) をサービスに追加してください');
  }
}

function trashIfEmpty(t) {
  try {
    var f = DriveApp.getFolderById(t.id);
    var hasFile = f.getFiles().hasNext();
    var hasDir  = f.getFolders().hasNext();
    if (hasFile || hasDir) {
      say('  残置: ' + t.name + ' (中身が残っています)');
      REVIEW.push('未処理の中身が残っている旧フォルダ: ' + t.name);
      return;
    }
    say('  ゴミ箱へ: ' + t.name);
    if (!CONFIG.DRY_RUN) { f.setTrashed(true); }
  } catch (e) {
    FAIL.push('片付け ' + t.name + '  (' + e.message + ')');
  }
}
