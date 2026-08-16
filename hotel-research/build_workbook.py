# -*- coding: utf-8 -*-
"""
商店建築 ホテル設計者データベース 2011-2026 の組み立てスクリプト。
Phase1-6の調査結果(hotels_data.py / design_firms_data.py)を集約し、
- OUTPUT1: 全件リスト
- OUTPUT2: 営業優先順位ランキング
- OUTPUT3: 設計会社ランキング
- OUTPUT4: TOP20(森未来が狙うべき設計会社)
を1つのExcelワークブックにまとめる。
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent / "data"))

from hotels_data import HOTELS, EXCLUDED_UNCERTAIN
from design_firms_data import DESIGN_FIRMS

import openpyxl
from openpyxl.styles import Font, Alignment, PatternFill, Border, Side
from openpyxl.utils import get_column_letter

UNKNOWN = "不明"

def is_known(v):
    if v is None:
        return False
    v = str(v)
    return v != "不明" and not v.startswith("不明")

def find_firm(name_field):
    """hotelのarch/interior文字列から既知design firmキーを検索(部分一致)"""
    if not name_field or name_field == UNKNOWN:
        return None
    for key in DESIGN_FIRMS:
        if key in name_field:
            return key
    return None

def hotel_related_firms(h):
    firms = []
    for field in (h["arch"], h["interior"], h["other_design"]):
        f = find_firm(field)
        if f and f not in firms:
            firms.append(f)
    return firms

def compute_affinity(h, firms):
    """地域材との親和性 1-5 + 理由(ルールベース、事実ベースの根拠のみを使用)"""
    wood_known = is_known(h["wood_usage"])
    regional_wood_known = is_known(h["regional_wood"])
    domestic_wood_known = is_known(h["domestic_wood"])
    material_known = is_known(h["material_focus"])
    regionality_known = is_known(h["regionality"])
    strong_firm = any(DESIGN_FIRMS[f]["wood_level"] == "strong" for f in firms)

    if wood_known and (regional_wood_known or domestic_wood_known or strong_firm):
        return 5, "本物件固有の木材使用の記述があり、地域材/国産材または木材親和性の高い設計会社との関連が確認できる"
    if material_known and regionality_known:
        return 4, "地域の素材・工芸・景観を明確なコンセプトとして設計に取り込んでいることが確認できる(木材以外の地域素材含む)"
    if wood_known or (material_known and not regionality_known):
        return 3, "木材または素材へのこだわりの記述はあるが、地域材との明確な関係までは確認できない"
    if regionality_known:
        return 2, "地域性を意識したコンセプトの言及はあるが、素材面の具体的記述は乏しい"
    return 1, "本物件固有の木材・地域材・地域性に関する記述が確認できない(不明が大半)"

def compute_priority(h, firms):
    """営業優先度 S/A/B/C + 理由(設計会社の木材エンゲージメントを主軸に判定)"""
    if not firms:
        return "C", "設計者情報が確認できず、アプローチ経路が特定できない"
    strong = [f for f in firms if DESIGN_FIRMS[f]["wood_level"] == "strong"]
    moderate = [f for f in firms if DESIGN_FIRMS[f]["wood_level"] == "moderate"]
    if strong:
        return "S", f"{'/'.join(strong)}が木材・国産材・地域材で確認済みの実績を持ち、ホテル案件にも継続的に関与している"
    if moderate:
        return "A", f"{'/'.join(moderate)}に地域素材・地域性への関心が部分的に確認できる"
    return "B", "設計者は特定できるが、木材・地域材との関連は現時点で確認できない"

def build_hotel_rows():
    rows = []
    for i, h in enumerate(HOTELS, start=1):
        firms = hotel_related_firms(h)
        score, reason = compute_affinity(h, firms)
        priority, preason = compute_priority(h, firms)
        synergy_parts = []
        for f in firms:
            fd = DESIGN_FIRMS[f]
            if fd["wood_level"] in ("strong", "moderate"):
                synergy_parts.append(f"{f}:{fd['wood_note']}")
        synergy = " / ".join(synergy_parts) if synergy_parts else "不明(木材関連の接点が現時点で確認できない)"

        approach = ""
        if priority in ("S", "A"):
            if any(DESIGN_FIRMS[f]["wood_level"] == "strong" and "FSC" in DESIGN_FIRMS[f]["wood_note"] for f in firms):
                approach = "既にFSC認証等の実績を持つため、森未来のFSC/SGEC認証材の調達・トレーサビリティ支援を提案し、次のホテル案件での標準採用を働きかける。"
            elif any("古材" in DESIGN_FIRMS[f]["wood_note"] or "古木" in DESIGN_FIRMS[f]["wood_note"] for f in firms):
                approach = "古材・古木の調達網を持つ実務パートナーであり、森未来の新材(国産材・地域材)の調達・加工ネットワークと組み合わせた提案で、古材が確保できない部材(構造材・大断面材等)を補完する提案を行う。"
            elif any("木造" in DESIGN_FIRMS[f]["wood_note"] or "木質" in DESIGN_FIRMS[f]["wood_note"] for f in firms):
                approach = "大規模木造・木質建築の技術を持つが、地域材の量産的な調達・トレーサビリティ確保が課題になりやすいため、森未来の木材データベース・調達ネットワークによる地域材の探索から加工・供給までの一気通貫支援を提案する。"
            else:
                approach = "地域性・素材へのこだわりが強い設計思想を持つため、コンセプトに即した地域材の逆引き提案(産地・樹種・加工可否の一括提示)を行う。"

        rows.append(dict(
            no=i, name=h["name"], pub_year=h["pub_year"], pub_issue=h["pub_issue"], page=h["page"], sk_url=h["sk_url"],
            arch=h["arch"], interior=h["interior"], landscape=h["landscape"], other_design=h["other_design"],
            construction=h["construction"], operator=h["operator"], developer=h["developer"], brand=h["brand"],
            location=h["location"], opening_year=h["opening_year"], reno_or_new=h["reno_or_new"],
            principal_designer=h["principal_designer"], project_lead=h["project_lead"],
            firm_url=h["firm_url"], firm_location=h["firm_location"], firm_specialty=h["firm_specialty"],
            wood_usage=h["wood_usage"], regional_wood=h["regional_wood"], domestic_wood=h["domestic_wood"],
            forestry_relation=h["forestry_relation"], regionality=h["regionality"], material_focus=h["material_focus"],
            affinity_score=score, affinity_reason=reason, synergy=synergy, priority=priority, priority_reason=preason,
            approach=approach, confidence=h["confidence"],
            sources="; ".join(f"{k}: {v}" for k, v in h["sources"].items()),
            remarks=h["remarks"], firms=firms,
        ))
    return rows

def build_firm_rollup(hotel_rows):
    counts = {}
    for r in hotel_rows:
        for f in r["firms"]:
            counts.setdefault(f, {"count": 0, "hotels": [], "scores": []})
            counts[f]["count"] += 1
            counts[f]["hotels"].append(r["name"])
            counts[f]["scores"].append(r["affinity_score"])
    rollup = []
    for f, data in counts.items():
        fd = DESIGN_FIRMS[f]
        avg_score = round(sum(data["scores"]) / len(data["scores"]), 1)
        if fd["wood_level"] == "strong":
            priority = "S" if data["count"] >= 1 else "A"
        elif fd["wood_level"] == "moderate":
            priority = "A"
        else:
            priority = "B" if data["count"] >= 2 else "C"
        rollup.append(dict(
            firm=f, count=data["count"], hotels=data["hotels"], avg_score=avg_score,
            representative=fd["representative"], hq=fd["hq"], url=fd["url"], specialty=fd["specialty"],
            wood_level=fd["wood_level"], wood_note=fd["wood_note"], priority=priority,
            confidence=fd["confidence"],
        ))
    rollup.sort(key=lambda x: (-x["count"], {"S": 0, "A": 1, "B": 2, "C": 3}[x["priority"]]))
    return rollup

# ---------- スタイル ----------
FONT_NAME = "Meiryo UI"
HEADER_FILL = PatternFill("solid", fgColor="2F4858")
HEADER_FONT = Font(name=FONT_NAME, size=10, bold=True, color="FFFFFF")
BODY_FONT = Font(name=FONT_NAME, size=9)
TITLE_FONT = Font(name=FONT_NAME, size=14, bold=True, color="2F4858")
THIN = Side(style="thin", color="CCCCCC")
BORDER = Border(left=THIN, right=THIN, top=THIN, bottom=THIN)
PRIORITY_FILL = {
    "S": PatternFill("solid", fgColor="C6EFCE"),
    "A": PatternFill("solid", fgColor="FFEB9C"),
    "B": PatternFill("solid", fgColor="DDEBF7"),
    "C": PatternFill("solid", fgColor="F2F2F2"),
}

def style_header(ws, row, ncols):
    for c in range(1, ncols + 1):
        cell = ws.cell(row=row, column=c)
        cell.fill = HEADER_FILL
        cell.font = HEADER_FONT
        cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
        cell.border = BORDER

def write_table(ws, headers, data_rows, start_row=1, col_widths=None, priority_col=None):
    for j, htext in enumerate(headers, start=1):
        ws.cell(row=start_row, column=j, value=htext)
    style_header(ws, start_row, len(headers))
    ws.freeze_panes = ws.cell(row=start_row + 1, column=1).coordinate
    for i, row in enumerate(data_rows, start=start_row + 1):
        for j, val in enumerate(row, start=1):
            cell = ws.cell(row=i, column=j, value=val)
            cell.font = BODY_FONT
            cell.alignment = Alignment(vertical="top", wrap_text=True)
            cell.border = BORDER
            if priority_col and j == priority_col and val in PRIORITY_FILL:
                cell.fill = PRIORITY_FILL[val]
    if col_widths:
        for j, w in enumerate(col_widths, start=1):
            ws.column_dimensions[get_column_letter(j)].width = w

def main():
    hotel_rows = build_hotel_rows()
    firm_rollup = build_firm_rollup(hotel_rows)

    wb = openpyxl.Workbook()

    # ---------- 0. 表紙・方法論 ----------
    ws0 = wb.active
    ws0.title = "方法論・注記"
    ws0.sheet_view.showGridLines = False
    ws0["B2"] = "商店建築 ホテル設計者データベース 2011–2026"
    ws0["B2"].font = TITLE_FONT
    ws0["B4"] = "株式会社森未来 営業・PR・アライアンス開拓用リサーチ"
    ws0["B4"].font = Font(name=FONT_NAME, size=11, bold=True)

    notes = [
        "",
        "■ 確認できた件数",
        f"商店建築(2011年1月号〜2026年8月号)への掲載が確認できたホテル・旅館・宿泊施設: {len(hotel_rows)}件",
        f"(目標100〜300件に対し、下記の制約により{len(hotel_rows)}件にとどまった。無理な水増しは行っていない)",
        f"施設名自体が確認できず本体リストから除外した候補: {len(EXCLUDED_UNCERTAIN)}件(別シート「除外候補」参照)",
        "",
        "■ 調査環境の制約(重要)",
        "本調査は自動化されたリサーチエージェントによりWeb検索のみで実施した。実行環境の制約上、",
        "・WebFetch(Webページを直接開いて本文を読む機能)は shotenkenchiku.com を含むほぼ全ドメインで使用不可だった。",
        "・WebSearch(検索エンジン経由の調査)は1エージェントあたり呼び出し回数の上限があり、複数回、上限到達により調査を打ち切っている。",
        "この制約により、商店建築 公式サイトの「年間総目次」「月刊総目次」ページを直接閲覧して号ごとの掲載物件を網羅的に確認する、という",
        "本来最も確実な調査手順(依頼書のSTEP1)を実行できていない。そのため、掲載号・ページ番号等の一次情報が未確認(「不明」)の項目が多い。",
        "特に「木材利用実績」「地域材利用実績」「国産材利用実績」は、商店建築本文からの直接引用が得られたケースは少数にとどまり、",
        "多くの物件で設計会社側の一般的な実績・方針からの参考情報、または「不明」となっている。",
        "",
        "■ 情報の確度区分",
        "確認済み: 商店建築の掲載号・ページ等が具体的なURL/記述で確認できたもの",
        "一部確認: 掲載自体は複数の独立した情報源(検索結果・関連メディア等)から推認できるが、号数・ページ等の一次情報に一部不明点があるもの",
        "不明瞭: 施設名・掲載自体の特定が困難なもの(本体リストからは除外し、別シートに記載)",
        "",
        "■ 推測の扱い",
        "本データベースでは、確定情報と推測情報を明確に区別している。推測を行った場合は必ずその旨(「推定」)を該当セルに明記している。",
        "確認できない場合はすべて「不明」としており、断定的な推測記載は行っていない。",
        "",
        "■ 地域材との親和性(1〜5点)の評価基準",
        "5点: 本物件固有の木材使用の記述があり、地域材/国産材または木材親和性の高い設計会社との関連が確認できる",
        "4点: 地域の素材・工芸・景観を明確なコンセプトとして設計に取り込んでいる(木材以外の地域素材を含む)",
        "3点: 木材または素材へのこだわりの記述はあるが、地域材との明確な関係までは確認できない",
        "2点: 地域性を意識したコンセプトの言及はあるが、素材面の具体的記述は乏しい",
        "1点: 本物件固有の木材・地域材・地域性に関する記述が確認できない",
        "",
        "■ 営業優先度(S/A/B/C)の評価基準",
        "S: 設計を担当した会社(建築設計または内装設計)が、木材・国産材・地域材について確認済みの実績を持ち、ホテル案件にも継続的に関与している",
        "A: 設計会社に地域素材・地域性への関心が部分的に確認できる",
        "B: 設計者は特定できるが、木材・地域材との関連は現時点で確認できない",
        "C: 設計者情報自体が確認できず、アプローチ経路が特定できない",
        "※ 地域材親和性(モノ・コンセプトの評価)と営業優先度(森未来がアプローチすべきか)は別軸であり、両者は必ずしも一致しない。",
        "",
        "■ 各Phaseの実施結果サマリー",
        "Phase1(2011-2015): 確認3件(WebSearch上限到達により打ち切り)",
        "Phase2(2016-2020): 確認24件(WebSearch上限到達により打ち切り)",
        "Phase3(2021-2023): 確認7件(WebSearch上限到達により打ち切り)",
        "Phase4(2024-2026): 確認40件、うち2件は施設名不確定のため除外(WebSearch上限到達により打ち切り)",
        "Phase5(設計会社深掘り): 2グループ計32社を調査(WebSearch上限未到達で完了)",
        "Phase6(本シート): スコアリング・アウトプット統合",
        "",
        "■ 追加調査の推奨",
        "・WebFetchが利用可能な環境、またはshotenkenchiku.com公式の年間総目次データ(PDF等)の直接提供があれば、",
        "  掲載号・ページ・設計者クレジットの網羅的確認が可能になり、件数・精度とも大幅な向上が見込める。",
        "・国立国会図書館等でのバックナンバー現物確認も有効。",
    ]
    for i, line in enumerate(notes, start=6):
        ws0.cell(row=i, column=2, value=line).font = Font(name=FONT_NAME, size=10, bold=line.startswith("■"))
    ws0.column_dimensions["B"].width = 130

    # ---------- 1. OUTPUT1 全件リスト ----------
    ws1 = wb.create_sheet("OUTPUT1_全件リスト")
    headers1 = [
        "No.", "ホテル・施設名", "掲載年", "掲載号", "掲載ページ", "商店建築掲載URL",
        "建築設計", "内装設計", "ランドスケープ設計", "その他設計・デザイン会社", "施工会社",
        "運営会社", "デベロッパー・事業主", "ホテルブランド", "所在地", "開業年", "リニューアル／新築",
        "設計者・代表者", "担当者・プロジェクト責任者", "設計会社URL", "設計会社所在地", "設計会社の得意分野",
        "木材利用実績", "地域材利用実績", "国産材利用実績", "森林・林業との関係", "地域性を重視した設計か",
        "素材へのこだわり", "地域材との親和性(1-5)", "親和性の理由", "森未来との事業シナジー",
        "営業優先度", "優先度の理由", "アプローチ仮説", "情報の確度", "情報ソース", "備考",
    ]
    rows1 = []
    for r in hotel_rows:
        rows1.append([
            r["no"], r["name"], r["pub_year"], r["pub_issue"], r["page"], r["sk_url"],
            r["arch"], r["interior"], r["landscape"], r["other_design"], r["construction"],
            r["operator"], r["developer"], r["brand"], r["location"], r["opening_year"], r["reno_or_new"],
            r["principal_designer"], r["project_lead"], r["firm_url"], r["firm_location"], r["firm_specialty"],
            r["wood_usage"], r["regional_wood"], r["domestic_wood"], r["forestry_relation"], r["regionality"],
            r["material_focus"], r["affinity_score"], r["affinity_reason"], r["synergy"],
            r["priority"], r["priority_reason"], r["approach"], r["confidence"], r["sources"], r["remarks"],
        ])
    write_table(ws1, headers1, rows1, col_widths=[5, 22] + [16] * 4 + [18] * 6 + [10, 14] + [16] * 3 + [10, 10] + [18] * 3 + [10, 22, 12] * 1 + [22, 10, 22, 26, 10, 30, 20], priority_col=31)

    # ---------- 2. OUTPUT2 営業優先順位ランキング ----------
    ws2 = wb.create_sheet("OUTPUT2_営業優先順位")
    order = {"S": 0, "A": 1, "B": 2, "C": 3}
    sorted_hotels = sorted(hotel_rows, key=lambda r: (order[r["priority"]], r["name"]))
    headers2 = ["営業優先度", "ホテル・施設名", "建築設計", "内装設計", "運営会社", "所在地", "掲載年/号",
                "地域材親和性", "森未来との事業シナジー", "優先度の理由", "アプローチ仮説", "情報の確度"]
    rows2 = [[r["priority"], r["name"], r["arch"], r["interior"], r["operator"], r["location"],
              f"{r['pub_year']}/{r['pub_issue']}", r["affinity_score"], r["synergy"], r["priority_reason"],
              r["approach"], r["confidence"]] for r in sorted_hotels]
    write_table(ws2, headers2, rows2, col_widths=[8, 22, 18, 18, 18, 16, 18, 10, 34, 30, 34, 14], priority_col=1)

    # ---------- 3. OUTPUT3 設計会社ランキング ----------
    ws3 = wb.create_sheet("OUTPUT3_設計会社ランキング")
    headers3 = ["順位", "設計会社", "掲載ホテル数", "代表者", "本社所在地", "公式URL", "得意分野",
                "木材/地域材エンゲージメント", "平均地域材親和性", "営業優先度", "情報の確度", "掲載ホテル一覧"]
    rows3 = []
    for i, f in enumerate(firm_rollup, start=1):
        rows3.append([i, f["firm"], f["count"], f["representative"], f["hq"], f["url"], f["specialty"],
                      f["wood_note"], f["avg_score"], f["priority"], f["confidence"], "、".join(f["hotels"])])
    write_table(ws3, headers3, rows3, col_widths=[6, 22, 10, 26, 22, 26, 30, 44, 12, 10, 22, 40], priority_col=10)

    # ---------- 4. OUTPUT4 TOP20 ----------
    ws4 = wb.create_sheet("OUTPUT4_TOP20")
    # シナジー基準: strong(木材確認済み) > moderate、その中でホテル案件数が多い順
    synergy_rank = sorted(
        firm_rollup,
        key=lambda f: (
            {"strong": 0, "moderate": 1, "weak": 2}[f["wood_level"]],
            -f["count"],
        ),
    )[:20]
    headers4 = ["順位", "設計会社", "なぜ狙うべきか", "森未来との接点", "想定課題", "提案", "最初のアプローチ", "代表者", "掲載ホテル数", "情報の確度"]
    rows4 = []
    for i, f in enumerate(synergy_rank, start=1):
        why = f"{f['specialty']}。商店建築掲載ホテル実績{f['count']}件。{f['wood_note']}"
        contact_point = f["wood_note"]
        if f["wood_level"] == "strong":
            if "FSC" in f["wood_note"] or "認証" in f["wood_note"]:
                issue = "FSC/SGEC等の認証材を安定的に、かつプロジェクトごとの意匠要求に合う樹種・品質で調達し続けることが課題になりやすい。"
                proposal = "森未来の認証材データベース・調達ネットワークを使い、認証材の樹種・数量・加工可否を事前に一括提示する『認証材コーディネートサービス』を提案。"
            elif "古材" in f["wood_note"] or "古木" in f["wood_note"]:
                issue = "古材・古木は個体差が大きく、大規模案件では必要な数量・断面が確保できないことがある。"
                proposal = "森未来の地域材ネットワークで、古材の意匠を活かしつつ構造材・大断面材を国産材で補完する『新旧木材ミックス調達』を提案。"
            else:
                issue = "国産材・地域材の量産的な調達、樹種ごとの品質・供給量の見極めに時間がかかりやすい。"
                proposal = "森未来の木材データベースと調達ネットワークで、設計意図から地域材を逆引きし、調達から加工までを一気通貫で支援する提案。"
        else:
            issue = "地域性・素材へのこだわりは強いが、木材そのものの調達先(産地・製材所・加工事業者)を自社で探すノウハウが限られる。"
            proposal = "地域材の探索・調達・加工までを一括支援できることを提案し、次のホテル・旅館案件での標準的な木材調達パートナーとしての採用を目指す。"
        first_approach = f"過去に手掛けたホテル案件({f['hotels'][0] if f['hotels'] else '該当案件'})の素材選定・設計思想についてヒアリングしたい、という切り口でアプローチする。"
        rows4.append([i, f["firm"], why, contact_point, issue, proposal, first_approach, f["representative"], f["count"], f["confidence"]])
    write_table(ws4, headers4, rows4, col_widths=[6, 22, 40, 40, 36, 36, 36, 26, 12, 22])

    # ---------- 5. 除外候補 ----------
    ws5 = wb.create_sheet("除外候補(要再確認)")
    headers5 = ["施設名(表記不確定)", "除外理由"]
    rows5 = [[e["name"], e["reason"]] for e in EXCLUDED_UNCERTAIN]
    write_table(ws5, headers5, rows5, col_widths=[30, 70])

    out_path = str(Path(__file__).resolve().parent / "商店建築_ホテル設計者データベース_2011-2026.xlsx")
    wb.save(out_path)
    print("Saved:", out_path)
    print("Hotels:", len(hotel_rows))
    print("Firms in rollup:", len(firm_rollup))

if __name__ == "__main__":
    main()
