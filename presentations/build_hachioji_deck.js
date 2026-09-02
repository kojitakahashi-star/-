const pptxgen = require("pptxgenjs");
const pptx = new pptxgen();
pptx.layout = "LAYOUT_WIDE"; // 13.333 x 7.5
pptx.author = "株式会社森未来";
pptx.title = "八王子の森を、地域産業に。";

const W = 13.333, H = 7.5, M = 0.72;
const CW = W - M * 2; // 11.893

const INK = "13251A";
const FOREST = "24512F";
const FOREST_DK = "1B3D24";
const MOSS = "8FB566";
const MOSS_DK = "5E7F3C";
const MOSS_LT = "EAF1E0";
const CEDAR = "C1762C";
const CEDAR_LT = "FAEEDF";
const PAPER = "F4F6F1";
const TEXT = "23302A";
const MUTED = "5F6B64";
const WHITE = "FFFFFF";
const LINE = "DCE3D8";

const HEAD = "Meiryo";
const BODY = "Meiryo";

const S = pptx.ShapeType;
let pageNo = 0;
const ALL = [];
function newSlide() { const s = pptx.addSlide(); ALL.push(s); return s; }

/* ---------- helpers ---------- */

function shadow() {
  return { type: "outer", color: "1B3D24", blur: 10, offset: 2, angle: 90, opacity: 0.1 };
}

function card(s, x, y, w, h, fill, opt = {}) {
  const o = { x, y, w, h, rectRadius: 0.09, fill: { color: fill } };
  if (opt.line) o.line = { color: opt.line, width: 1 };
  if (opt.shadow !== false) o.shadow = shadow();
  s.addShape(S.roundRect, o);
}

function txt(s, text, o) {
  s.addText(text, Object.assign({ fontFace: BODY, isTextBox: true, margin: 0, color: TEXT, valign: "top" }, o));
}

// concentric tree-ring motif (repeated visual motif across the deck)
function rings(s, cx, cy, radii, color, width = 1.25, transparency) {
  radii.forEach((r) => {
    const o = {
      x: cx - r, y: cy - r, w: r * 2, h: r * 2,
      fill: { color: "FFFFFF", transparency: 100 },
      line: { color: color, width: width },
    };
    if (transparency !== undefined) o.line.transparency = transparency;
    s.addShape(S.ellipse, o);
  });
}

function numCircle(s, x, y, d, label, fill, col) {
  s.addShape(S.ellipse, { x, y, w: d, h: d, fill: { color: fill } });
  txt(s, label, {
    x, y, w: d, h: d, align: "center", valign: "middle",
    fontSize: Math.round(d * 25), bold: true, color: col, fontFace: HEAD,
  });
}

function head(s, kicker, title, titleSize) {
  if (kicker) {
    txt(s, kicker, {
      x: M, y: 0.40, w: CW, h: 0.26, fontSize: 11.5, bold: true,
      color: MOSS_DK, fontFace: HEAD, charSpacing: 1.5,
    });
  }
  txt(s, title, {
    x: M, y: 0.70, w: CW, h: 0.68, fontSize: titleSize || 26, bold: true,
    color: FOREST_DK, fontFace: HEAD, valign: "top",
  });
}

function footer(s) {
  pageNo++;
  txt(s, "八王子の森を、地域産業に。", {
    x: M, y: H - 0.52, w: 5, h: 0.26, fontSize: 9, color: MUTED,
  });
  txt(s, String(pageNo), {
    x: W - M - 1, y: H - 0.52, w: 1, h: 0.26, fontSize: 9, color: MUTED, align: "right",
  });
}

function content(kicker, title, titleSize) {
  const s = newSlide();
  s.background = { color: WHITE };
  head(s, kicker, title, titleSize);
  footer(s);
  return s;
}

// flow-layout chips
function chips(s, items, x, y, maxW, opt = {}) {
  const fs = opt.fontSize || 10.5;
  const chW = fs * 0.0155;   // approx width of one full-width char in inches
  const h = opt.h || 0.30;
  const gap = opt.gap || 0.11;
  let cx = x, cy = y;
  items.forEach((t) => {
    const w = t.length * chW + 0.30;
    if (cx + w > x + maxW + 0.001) { cx = x; cy += h + gap; }
    s.addShape(S.roundRect, {
      x: cx, y: cy, w, h, rectRadius: 0.14,
      fill: { color: opt.fill || MOSS_LT },
      line: opt.line ? { color: opt.line, width: 0.75 } : undefined,
    });
    txt(s, t, {
      x: cx, y: cy, w, h, align: "center", valign: "middle",
      fontSize: fs, color: opt.color || FOREST_DK, bold: opt.bold || false,
    });
    cx += w + gap;
  });
  return cy + h; // bottom y
}

function bullets(s, items, o) {
  txt(s, items.map((t, i) => ({
    text: t, options: { bullet: { code: "25AA" }, breakLine: i !== items.length - 1 },
  })), Object.assign({ fontSize: 12, color: TEXT, paraSpaceAfter: 7, lineSpacing: 18 }, o));
}

/* =====================================================================
   1. 表紙
   ===================================================================== */
{
  const s = newSlide();
  s.background = { color: INK };
  rings(s, 11.5, 5.6, [1.0, 1.7, 2.4, 3.1, 3.8], MOSS, 1.25, 72);
  rings(s, 11.5, 5.6, [0.42], CEDAR, 5, 30);

  txt(s, "八王子市｜森林・木材の地域内循環づくり　検討資料", {
    x: M, y: 0.85, w: 8.5, h: 0.3, fontSize: 12, color: MOSS, bold: true, charSpacing: 1.2,
  });
  txt(s, "八王子の森を、\n地域産業に。", {
    x: M, y: 1.55, w: 8.6, h: 2.2, fontSize: 46, bold: true, color: WHITE,
    fontFace: HEAD, lineSpacing: 62,
  });
  txt(s, "企業版ふるさと納税を活用した「森の産業化」プロジェクト（案）", {
    x: M, y: 3.95, w: 8.6, h: 0.4, fontSize: 17, color: MOSS, fontFace: HEAD, bold: true,
  });
  txt(s, "「森を守るためにお金を使う」から、\n「森から価値を生み、その価値で森を守る」へ。", {
    x: M, y: 4.6, w: 8.2, h: 0.9, fontSize: 13, color: "C7D6BC", lineSpacing: 24,
  });
  txt(s, "2026年9月　　株式会社森未来", {
    x: M, y: 6.5, w: 6, h: 0.3, fontSize: 11, color: "9CB08F",
  });
}

/* =====================================================================
   2. 提案の核
   ===================================================================== */
{
  const s = content("PROPOSITION", "提案の核｜森への「支出」を、森からの「収入」に変える");

  card(s, M, 1.72, 4.85, 3.02, PAPER, { line: LINE, shadow: false });
  txt(s, "これまでの構造", { x: M + 0.35, y: 2.02, w: 4.1, h: 0.3, fontSize: 12, bold: true, color: MUTED, fontFace: HEAD });
  txt(s, "森を守るために\nお金を使う", { x: M + 0.35, y: 2.42, w: 4.2, h: 0.95, fontSize: 22, bold: true, color: "6B7A70", fontFace: HEAD, lineSpacing: 32 });
  bullets(s, [
    "補助金・森林環境譲与税を原資に整備を継続",
    "財源の上限が、そのまま整備量の上限になる",
    "森が生む価値は、地域の収入になっていない",
  ], { x: M + 0.35, y: 3.55, w: 4.15, h: 1.3, fontSize: 11, color: "6B7A70" });

  s.addShape(S.rightArrow, { x: 5.92, y: 2.98, w: 0.85, h: 0.5, fill: { color: CEDAR } });

  card(s, 6.95, 1.72, 5.67, 3.02, FOREST, { shadow: true });
  txt(s, "これからの構造", { x: 7.3, y: 2.02, w: 5, h: 0.3, fontSize: 12, bold: true, color: MOSS, fontFace: HEAD });
  txt(s, "森から価値を生み、\nその価値で森を守る", { x: 7.3, y: 2.42, w: 5.1, h: 0.95, fontSize: 22, bold: true, color: WHITE, fontFace: HEAD, lineSpacing: 32 });
  bullets(s, [
    "木材と環境価値の販売収益を森林整備へ還流",
    "需要が増えるほど、整備できる森が増える",
    "企業・市民・公共施設が「森の担い手」になる",
  ], { x: 7.3, y: 3.55, w: 5.0, h: 1.3, fontSize: 11, color: "DCE9D2" });

  card(s, M, 5.10, CW, 1.05, CEDAR_LT, { shadow: false });
  txt(s, "企業版ふるさと納税の位置づけ", { x: M + 0.35, y: 5.30, w: 3.3, h: 0.28, fontSize: 11, bold: true, color: CEDAR, fontFace: HEAD });
  txt(s, "単年度の「森林整備費」ではなく、森林から生まれる価値を地域内で循環させる仕組みをつくるための初期投資として活用する。", {
    x: M + 0.35, y: 5.64, w: CW - 0.7, h: 0.36, fontSize: 13, bold: true, color: FOREST_DK, fontFace: HEAD,
  });
}

/* =====================================================================
   3. 本日の流れ
   ===================================================================== */
{
  const s = content("CONTENTS", "本日の流れ");
  const items = [
    ["01", "八王子市の森林の課題", "資源はあるが、担い手・出口・接続の3点が欠けている"],
    ["02", "これまでの取り組み", "森林環境譲与税、多摩の森、多摩産材利用、木育——既に多面的"],
    ["03", "それでも残る課題", "取り組みが足りないのではなく、取り組みがつながっていない"],
    ["04", "企業版ふるさと納税で\n何を変えるか", "循環をつくる初期投資として使う。6つの施策と5年のロードマップ"],
  ];
  const cw = 2.82, gap = 0.235;
  items.forEach((it, i) => {
    const x = M + i * (cw + gap);
    card(s, x, 1.95, cw, 3.30, i === 3 ? FOREST : PAPER, { line: i === 3 ? null : LINE, shadow: i === 3 });
    numCircle(s, x + 0.28, 2.24, 0.72, it[0], i === 3 ? CEDAR : MOSS, WHITE);
    txt(s, it[1], {
      x: x + 0.28, y: 3.18, w: cw - 0.5, h: 0.9, fontSize: 14, bold: true,
      color: i === 3 ? WHITE : FOREST_DK, fontFace: HEAD, lineSpacing: 21,
    });
    txt(s, it[2], {
      x: x + 0.28, y: 4.14, w: cw - 0.5, h: 0.95, fontSize: 10.5,
      color: i === 3 ? "DCE9D2" : MUTED, lineSpacing: 16,
    });
  });
  txt(s, "第1〜3章で現状認識をそろえ、第4章で企業版ふるさと納税を使った具体的な事業案を提示します。", {
    x: M, y: 5.62, w: CW, h: 0.3, fontSize: 11.5, color: MUTED,
  });
}

/* =====================================================================
   章扉
   ===================================================================== */
function section(no, title, lead, points) {
  const s = newSlide();
  s.background = { color: INK };
  rings(s, 11.9, 3.75, [0.9, 1.55, 2.2, 2.85, 3.5], MOSS, 1.25, 76);
  txt(s, no, { x: M, y: 1.90, w: 3, h: 1.45, fontSize: 76, bold: true, color: CEDAR, fontFace: HEAD });
  txt(s, title, { x: M, y: 3.32, w: 8.4, h: 0.9, fontSize: 34, bold: true, color: WHITE, fontFace: HEAD });
  txt(s, lead, { x: M, y: 4.40, w: 7.3, h: 0.7, fontSize: 13.5, color: MOSS, lineSpacing: 22 });
  if (points) {
    let cx = M;
    points.forEach((p) => {
      const w = p.length * 0.165 + 0.36;
      s.addShape(S.roundRect, { x: cx, y: 5.32, w, h: 0.38, rectRadius: 0.18, fill: { color: "1E3327" }, line: { color: MOSS_DK, width: 0.75 } });
      txt(s, p, { x: cx, y: 5.32, w, h: 0.38, align: "center", valign: "middle", fontSize: 10.5, color: "D7E5CB" });
      cx += w + 0.14;
    });
  }
  footer(s);
  return s;
}

section("01", "八王子市の森林の課題", "多摩地域有数の森林資源を持ちながら、それを「資源」として持続的に活用する仕組みが整っていない。",
  ["担い手・所有者の高齢化", "木材の出口不足", "森林と都市需要の分断"]);

/* =====================================================================
   4-1. 森林が持つ4つの価値
   ===================================================================== */
{
  const s = content("PREMISE", "前提｜八王子の森は、すでに4つの価値を生んでいる");
  const v = [
    ["木材生産", "住宅・内装・家具・木製品・エネルギーの原料。整備すれば必ず発生する。"],
    ["CO2吸収・環境価値", "適切な整備によって吸収量が高まり、クレジット等として取引もできる。"],
    ["防災・水源涵養", "土砂災害の抑制、地下水の涵養。都市の安全を支える基盤。"],
    ["教育・レクリエーション", "森林体験、木育、自然観察。市民が森と出会う場になる。"],
  ];
  const cw = 5.79, ch = 1.42, gx = 0.32, gy = 0.28;
  v.forEach((it, i) => {
    const x = M + (i % 2) * (cw + gx);
    const y = 1.88 + Math.floor(i / 2) * (ch + gy);
    card(s, x, y, cw, ch, PAPER, { line: LINE, shadow: false });
    s.addShape(S.ellipse, { x: x + 0.34, y: y + 0.40, w: 0.62, h: 0.62, fill: { color: MOSS } });
    txt(s, String(i + 1), { x: x + 0.34, y: y + 0.40, w: 0.62, h: 0.62, align: "center", valign: "middle", fontSize: 15, bold: true, color: WHITE, fontFace: HEAD });
    txt(s, it[0], { x: x + 1.14, y: y + 0.28, w: cw - 1.5, h: 0.34, fontSize: 15, bold: true, color: FOREST_DK, fontFace: HEAD });
    txt(s, it[1], { x: x + 1.14, y: y + 0.70, w: cw - 1.5, h: 0.62, fontSize: 11, color: MUTED, lineSpacing: 17 });
  });
  card(s, M, 5.30, CW, 0.95, CEDAR_LT, { shadow: false });
  txt(s, "課題は「価値がないこと」ではない。これらの価値が、測られておらず、売られておらず、森に還っていないこと。", {
    x: M + 0.35, y: 5.30, w: CW - 0.7, h: 0.95, fontSize: 14, bold: true, color: FOREST_DK, fontFace: HEAD, valign: "middle",
  });
}

/* =====================================================================
   4-2. 課題①
   ===================================================================== */
{
  const s = content("ISSUE 01", "課題①｜森林を管理する担い手・所有者の高齢化");
  card(s, M, 1.80, 7.0, 3.05, PAPER, { line: LINE, shadow: false });
  txt(s, "起きていること", { x: M + 0.4, y: 2.08, w: 6.2, h: 0.3, fontSize: 12, bold: true, color: MOSS_DK, fontFace: HEAD });
  bullets(s, [
    "森林所有者の高齢化・不在化が進んでいる",
    "森林境界や所有者情報の把握が十分でなく、施業の合意形成に時間がかかる",
    "施業を担う林業事業者・技能者の確保が難しい",
    "市は森林整備計画を策定し、森林施業・路網整備・森林保護を進めている",
  ], { x: M + 0.4, y: 2.50, w: 6.25, h: 2.5, fontSize: 12.5 });

  card(s, 8.05, 1.80, 4.57, 3.05, FOREST, { shadow: true });
  txt(s, "だから必要なこと", { x: 8.42, y: 2.08, w: 3.9, h: 0.3, fontSize: 12, bold: true, color: MOSS, fontFace: HEAD });
  txt(s, "「整備する人」と\n「整備するお金」を\n継続的に確保する仕組み", {
    x: 8.42, y: 2.52, w: 3.9, h: 1.5, fontSize: 18, bold: true, color: WHITE, fontFace: HEAD, lineSpacing: 30, valign: "top",
  });
  txt(s, "計画があっても、担い手と財源が単発では実行が続かない。整備を「事業」として成立させる必要がある。", {
    x: 8.42, y: 4.18, w: 3.9, h: 0.9, fontSize: 11, color: "DCE9D2", lineSpacing: 18, valign: "top",
  });
  txt(s, "※ 市の森林整備計画・森林環境譲与税関連資料に基づく整理。", { x: M, y: 5.15, w: CW, h: 0.3, fontSize: 9.5, color: MUTED });
}

/* =====================================================================
   4-3. 課題②
   ===================================================================== */
{
  const s = content("ISSUE 02", "課題②｜木材を生産しても「売れる先」が不足している");
  const steps = ["森林整備", "木材が出る", "売　る", "収益が森林に戻る"];
  const bw = 2.42, gap = 0.72;
  const startX = M + 0.55;
  steps.forEach((t, i) => {
    const x = startX + i * (bw + gap);
    const last = i === 3;
    card(s, x, 2.28, bw, 1.05, last ? WHITE : MOSS_LT, { line: last ? CEDAR : null, shadow: false });
    txt(s, t, { x, y: 2.28, w: bw, h: 1.05, align: "center", valign: "middle", fontSize: 14.5, bold: true, color: last ? CEDAR : FOREST_DK, fontFace: HEAD });
    if (i < 3) {
      s.addShape(S.rightArrow, { x: x + bw + 0.14, y: 2.66, w: 0.44, h: 0.3, fill: { color: i === 2 ? CEDAR : MOSS } });
    }
  });
  // weak return flow
  s.addShape(S.leftArrow, { x: startX + 1.0, y: 3.72, w: 7.5, h: 0.4, fill: { color: "E9EDE5" } });
  txt(s, "収益が次の整備に還る流れが細い", { x: startX + 1.75, y: 3.72, w: 5.6, h: 0.4, valign: "middle", fontSize: 11.5, bold: true, color: MUTED });
  s.addShape(S.ellipse, { x: startX + 7.62, y: 3.62, w: 0.6, h: 0.6, fill: { color: CEDAR } });
  txt(s, "×", { x: startX + 7.62, y: 3.62, w: 0.6, h: 0.6, align: "center", valign: "middle", fontSize: 20, bold: true, color: WHITE, fontFace: HEAD });

  card(s, M, 4.62, 5.79, 1.55, PAPER, { line: LINE, shadow: false });
  txt(s, "何が起きるか", { x: M + 0.38, y: 4.84, w: 5, h: 0.28, fontSize: 11.5, bold: true, color: MOSS_DK, fontFace: HEAD });
  txt(s, "地域内の循環が閉じないため、森林整備そのものを続ける経済的な動機が弱くなる。整備量は財源の大きさに縛られ続ける。", {
    x: M + 0.38, y: 5.20, w: 5.05, h: 0.8, fontSize: 12, color: TEXT, lineSpacing: 19,
  });
  card(s, 6.83, 4.62, 5.79, 1.55, PAPER, { line: LINE, shadow: false });
  txt(s, "東京都も同じ課題を掲げている", { x: 7.21, y: 4.84, w: 5, h: 0.28, fontSize: 11.5, bold: true, color: MOSS_DK, fontFace: HEAD });
  txt(s, "「多摩の森」活性化プロジェクトも、木材需要を生み出し、その収益を次の森林育成につなげる必要性を課題として挙げている。", {
    x: 7.21, y: 5.20, w: 5.05, h: 0.8, fontSize: 12, color: TEXT, lineSpacing: 19,
  });
}

/* =====================================================================
   4-4. 課題③
   ===================================================================== */
{
  const s = content("ISSUE 03", "課題③｜「森林」と「都市側の需要」が分断されている");

  card(s, M, 1.85, 4.6, 3.45, MOSS_LT, { shadow: false });
  txt(s, "森林側（供給）", { x: M + 0.35, y: 2.12, w: 3.9, h: 0.3, fontSize: 13, bold: true, color: FOREST_DK, fontFace: HEAD });
  bullets(s, [
    "どの森林から出るのか",
    "どのような木材が出るのか",
    "どのくらいの量が出るのか",
    "いつ出るのか",
  ], { x: M + 0.35, y: 2.58, w: 3.9, h: 2.0, fontSize: 12.5, color: FOREST_DK });
  txt(s, "→ 十分に可視化されていない", { x: M + 0.35, y: 4.78, w: 3.9, h: 0.35, fontSize: 11.5, bold: true, color: MOSS_DK });

  s.addShape(S.ellipse, { x: 5.92, y: 3.05, w: 1.05, h: 1.05, fill: { color: CEDAR } });
  txt(s, "?", { x: 5.92, y: 3.05, w: 1.05, h: 1.05, align: "center", valign: "middle", fontSize: 34, bold: true, color: WHITE, fontFace: HEAD });
  txt(s, "つなぐ仕組みが\n無い", { x: 5.62, y: 4.25, w: 1.65, h: 0.6, align: "center", fontSize: 10.5, bold: true, color: CEDAR, lineSpacing: 15 });

  card(s, 8.02, 1.85, 4.6, 3.45, PAPER, { line: LINE, shadow: false });
  txt(s, "都市側（需要の可能性）", { x: 8.37, y: 2.12, w: 3.9, h: 0.3, fontSize: 13, bold: true, color: FOREST_DK, fontFace: HEAD });
  chips(s, ["市民", "企業", "学校", "公共施設", "建築・内装", "飲食店・ホテル", "温浴施設", "製造業"], 8.37, 2.60, 3.95, { fontSize: 10.5, fill: WHITE, line: LINE });
  txt(s, "→ 誰が・何に・どれだけ使えるかが\n　 整理されていない", { x: 8.37, y: 4.78, w: 4.0, h: 0.6, fontSize: 11.5, bold: true, color: MOSS_DK, lineSpacing: 17 });

  card(s, M, 5.55, CW, 0.85, CEDAR_LT, { shadow: false });
  txt(s, "八王子に「需要が無い」のではない。需要と森林が、つながっていない。", {
    x: M, y: 5.55, w: CW, h: 0.85, align: "center", valign: "middle", fontSize: 15, bold: true, color: FOREST_DK, fontFace: HEAD,
  });
}

/* =====================================================================
   4-5. 3つの断絶
   ===================================================================== */
{
  const s = content("SUMMARY", "第1章まとめ｜循環を止めている3つの断絶");
  const d = [
    ["断絶 01", "人と資金", "森林を継続的に管理する担い手と財源が、単発でしか確保されない"],
    ["断絶 02", "出　口", "整備で発生した木材の売り先が細く、収益が森に戻らない"],
    ["断絶 03", "供給と需要", "森林の情報と都市側の用途が、互いに見えていない"],
  ];
  const cw = 3.79, gx = 0.28;
  d.forEach((it, i) => {
    const x = M + i * (cw + gx);
    card(s, x, 1.90, cw, 2.75, PAPER, { line: LINE, shadow: false });
    txt(s, it[0], { x: x + 0.35, y: 2.18, w: cw - 0.7, h: 0.28, fontSize: 11, bold: true, color: CEDAR, fontFace: HEAD, charSpacing: 1 });
    txt(s, it[1], { x: x + 0.35, y: 2.55, w: cw - 0.7, h: 0.45, fontSize: 21, bold: true, color: FOREST_DK, fontFace: HEAD });
    txt(s, it[2], { x: x + 0.35, y: 3.18, w: cw - 0.7, h: 1.2, fontSize: 11.5, color: MUTED, lineSpacing: 18, valign: "top" });
  });
  card(s, M, 4.95, CW, 1.35, FOREST, { shadow: true });
  txt(s, "この3つを個別に解くのではなく、ひとつの循環としてつなぎ直すことが、今回の提案の狙い。", {
    x: M + 0.45, y: 5.20, w: CW - 0.9, h: 0.45, fontSize: 15.5, bold: true, color: WHITE, fontFace: HEAD,
  });
  txt(s, "そのための「最初のひと押し」に、企業版ふるさと納税を使う。", {
    x: M + 0.45, y: 5.72, w: CW - 0.9, h: 0.35, fontSize: 12, color: MOSS,
  });
}

/* =====================================================================
   章扉 02
   ===================================================================== */
section("02", "これまでの八王子市の取り組み", "八王子市は、すでに森林・木材に対してかなり多面的な取り組みを行っている。",
  ["森林環境譲与税の活用", "多摩の森活性化プロジェクト", "公共施設の多摩産材利用", "木育・市民参加"]);

/* =====================================================================
   5-1. 4本柱
   ===================================================================== */
{
  const s = content("CURRENT ACTIONS", "すでに走っている4つの取り組み");
  const a = [
    ["01", "森林環境譲与税の活用", "民有林の振興／市有林の管理／森林整備／緑地保全／木材利用／普及啓発を実施。"],
    ["02", "「多摩の森」活性化プロジェクト", "2023年から東京都・多摩地域の自治体と連携。森林整備・保全、CO2吸収量の認証、林業・自然体験、多摩産材の利用。"],
    ["03", "公共施設での多摩産材利用", "「公共建築物等における多摩産材利用推進方針」を策定。2026年度予算でも第二小学校・第四中学校の改築等で木材利用を計上。"],
    ["04", "木育・森林体験・市民参加", "森林体験、自然観察、林業体験、木工。「はち★ベビギフト」では多摩産材の木製玩具を届けている。"],
  ];
  const cw = 5.79, ch = 1.74, gx = 0.32, gy = 0.26;
  a.forEach((it, i) => {
    const x = M + (i % 2) * (cw + gx);
    const y = 1.78 + Math.floor(i / 2) * (ch + gy);
    card(s, x, y, cw, ch, i % 3 === 0 ? MOSS_LT : PAPER, { line: i % 3 === 0 ? null : LINE, shadow: false });
    numCircle(s, x + 0.34, y + 0.36, 0.6, it[0], FOREST, WHITE);
    txt(s, it[1], { x: x + 1.1, y: y + 0.32, w: cw - 1.45, h: 0.34, fontSize: 14.5, bold: true, color: FOREST_DK, fontFace: HEAD });
    txt(s, it[2], { x: x + 1.1, y: y + 0.74, w: cw - 1.45, h: 0.85, fontSize: 11, color: MUTED, lineSpacing: 17, valign: "top" });
  });
  txt(s, "「森林を整備する」「市民に森を知ってもらう」「木材を使う」——3つとも、すでに始まっている。", {
    x: M, y: 5.75, w: CW, h: 0.4, fontSize: 14, bold: true, color: FOREST_DK, fontFace: HEAD,
  });
}

/* =====================================================================
   5-2. 予算の姿
   ===================================================================== */
{
  const s = content("BUDGET", "財源の姿｜2026年度の森林環境施策");

  card(s, M, 1.90, 3.55, 2.22, FOREST, { shadow: true });
  txt(s, "森林環境施策 全体", { x: M + 0.35, y: 2.18, w: 2.9, h: 0.28, fontSize: 11.5, bold: true, color: MOSS, fontFace: HEAD });
  txt(s, "約3.39", { x: M + 0.35, y: 2.60, w: 2.9, h: 0.95, fontSize: 50, bold: true, color: WHITE, fontFace: HEAD });
  txt(s, "億円 ／ 2026年度", { x: M + 0.35, y: 3.66, w: 2.9, h: 0.3, fontSize: 12.5, color: "DCE9D2" });

  card(s, 4.62, 1.90, 3.55, 2.22, MOSS_LT, { shadow: false });
  txt(s, "うち森林環境譲与税 充当可能額", { x: 4.97, y: 2.18, w: 2.9, h: 0.28, fontSize: 11.5, bold: true, color: MOSS_DK, fontFace: HEAD });
  txt(s, "約1.40", { x: 4.97, y: 2.60, w: 2.9, h: 0.95, fontSize: 50, bold: true, color: FOREST_DK, fontFace: HEAD });
  txt(s, "億円 ／ 2026年度", { x: 4.97, y: 3.66, w: 2.9, h: 0.3, fontSize: 12.5, color: MUTED });

  card(s, 8.34, 1.90, 4.28, 2.22, PAPER, { line: LINE, shadow: false });
  txt(s, "読み取れること", { x: 8.69, y: 2.18, w: 3.6, h: 0.28, fontSize: 11.5, bold: true, color: CEDAR, fontFace: HEAD });
  bullets(s, [
    "財源は一定規模で確保されつつある",
    "問われているのは「何に使い、何を生み出すか」",
    "譲与税は使途に制約があり、単年度・整備中心になりやすい",
  ], { x: 8.69, y: 2.60, w: 3.6, h: 1.7, fontSize: 11.5 });

  card(s, M, 4.45, CW, 1.35, CEDAR_LT, { shadow: false });
  txt(s, "だからこそ、既存財源では手が届きにくい「収益化前の仕込み」に、別の財源が要る。", {
    x: M + 0.45, y: 4.71, w: CW - 0.9, h: 0.4, fontSize: 15, bold: true, color: FOREST_DK, fontFace: HEAD,
  });
  txt(s, "調査・データ基盤・構想づくり・需要開拓・制度設計——これらは整備費でも施設費でもない。ここに企業版ふるさと納税を充てる。", {
    x: M + 0.45, y: 5.19, w: CW - 0.9, h: 0.4, fontSize: 11.5, color: MUTED,
  });
  txt(s, "※ 金額は八王子市の公表資料に基づく。提案化にあたり最新の予算資料で最終確認を行う。", {
    x: M, y: 6.00, w: CW, h: 0.3, fontSize: 9.5, color: MUTED,
  });
}

/* =====================================================================
   章扉 03
   ===================================================================== */
section("03", "それでも残る課題", "「取り組みが足りない」のではない。「取り組みを次の段階につなげる仕組み」が不足している。",
  ["知る→支える の接続", "個別利用→継続需要", "整備と需要の分離"]);

/* =====================================================================
   6-1. 足りないのではなく、つながっていない
   ===================================================================== */
{
  const s = content("REFRAME", "課題の捉え直し");
  txt(s, "「足りない」のではなく、\n「つながっていない」。", {
    x: M, y: 1.95, w: 6.6, h: 1.9, fontSize: 33, bold: true, color: FOREST_DK, fontFace: HEAD, lineSpacing: 50,
  });
  txt(s, "森林整備も、木育も、多摩産材利用も、それぞれ着実に進んでいる。\nしかし、それぞれが独立した事業として実施されているため、\n一つの活動の成果が、次の活動の原資にならない。", {
    x: M, y: 4.05, w: 6.6, h: 1.4, fontSize: 13, color: TEXT, lineSpacing: 25,
  });
  txt(s, "この提案は、既存の取り組みを否定するものではなく、\nそれらを一本の循環につなぐためのもの。", {
    x: M, y: 5.55, w: 6.6, h: 0.8, fontSize: 12, bold: true, color: MOSS_DK, lineSpacing: 21,
  });

  const boxes = [["森林整備の事業", 2.05], ["木育・森林体験の事業", 3.35], ["木材利用の事業", 4.65]];
  boxes.forEach(([t, y]) => {
    card(s, 7.85, y, 4.77, 1.0, PAPER, { line: LINE, shadow: false });
    txt(s, t, { x: 7.85, y, w: 4.77, h: 1.0, align: "center", valign: "middle", fontSize: 14, bold: true, color: FOREST_DK, fontFace: HEAD });
  });
  [3.15, 4.45].forEach((y) => {
    s.addShape(S.ellipse, { x: 10.05, y, w: 0.36, h: 0.36, fill: { color: WHITE }, line: { color: CEDAR, width: 1.25 } });
    txt(s, "×", { x: 10.05, y, w: 0.36, h: 0.36, align: "center", valign: "middle", fontSize: 13, bold: true, color: CEDAR, fontFace: HEAD });
  });
  txt(s, "つながっていない", { x: 7.85, y: 5.85, w: 4.77, h: 0.3, align: "center", fontSize: 11, bold: true, color: CEDAR });
}

/* =====================================================================
   6-2. 残る課題 A/B/C
   ===================================================================== */
{
  const s = content("REMAINING ISSUES", "次の段階につなげるための3つの課題");
  const d = [
    ["課題 A", "「森を知る」から\n「森を支える」への接続", [
      "森林体験・木育で「森を知る・興味を持つ」までは進んだ",
      "そこから「八王子産材を使う→買う→整備にお金が戻る」という経済的な循環まで設計する余地がある",
    ]],
    ["課題 B", "木材利用が\n「個別利用」にとどまる", [
      "公共施設での木材利用は進むが、単発の施設整備が中心",
      "必要なのは「使う場所を増やす」ことより、「使い続ける企業・市民・施設を増やす」こと",
    ]],
    ["課題 C", "「森林整備」と「木材需要」が\n別々の事業になっている", [
      "整備の事業と利用の事業が、それぞれ並行して存在している",
      "調査→整備→木材把握→利用先確保→販売→還元を、ひとつの事業サイクルにする必要がある",
    ]],
  ];
  const cw = 3.79, gx = 0.28;
  d.forEach((it, i) => {
    const x = M + i * (cw + gx);
    card(s, x, 1.82, cw, 4.0, PAPER, { line: LINE, shadow: false });
    s.addShape(S.roundRect, { x: x + 0.35, y: 2.10, w: 1.0, h: 0.32, rectRadius: 0.15, fill: { color: CEDAR } });
    txt(s, it[0], { x: x + 0.35, y: 2.10, w: 1.0, h: 0.32, align: "center", valign: "middle", fontSize: 10.5, bold: true, color: WHITE, fontFace: HEAD });
    txt(s, it[1], { x: x + 0.32, y: 2.60, w: cw - 0.62, h: 1.0, fontSize: 14, bold: true, color: FOREST_DK, fontFace: HEAD, lineSpacing: 22 });
    bullets(s, it[2], { x: x + 0.35, y: 3.62, w: cw - 0.7, h: 2.1, fontSize: 11, color: TEXT, lineSpacing: 17 });
  });
}

/* =====================================================================
   6-3. あるべき循環（リング図）
   ===================================================================== */
{
  const s = content("TARGET MODEL", "目指す姿｜ひとつながりの事業サイクルにする");
  const cx = 6.667, cy = 4.15, rx = 3.62, ry = 1.98;
  const nodes = [
    ["01", "森を調べる", "森のカルテ"],
    ["02", "50年後の森を描く", "ビジョン"],
    ["03", "整備し、木材と\n環境価値を生む", ""],
    ["04", "企業・市民・公共が\n買う／使う", ""],
    ["05", "売上と環境価値が\n生まれる", ""],
    ["06", "森林整備に還元する", "次の森へ"],
  ];
  const nw = 2.62, nh = 1.05;
  const ctr = [];
  nodes.forEach((n, i) => {
    const a = (-90 + i * 60) * Math.PI / 180;
    const px_ = cx + rx * Math.cos(a), py_ = cy + ry * Math.sin(a);
    ctr.push([px_, py_]);
    const x = px_ - nw / 2, y = py_ - nh / 2;
    card(s, x, y, nw, nh, i % 2 === 0 ? MOSS_LT : PAPER, { line: i % 2 === 0 ? null : LINE, shadow: false });
    txt(s, n[0], { x: x + 0.18, y: y + 0.11, w: 0.6, h: 0.22, fontSize: 10, bold: true, color: CEDAR, fontFace: HEAD });
    txt(s, n[1], { x: x + 0.18, y: y + 0.34, w: nw - 0.36, h: 0.52, fontSize: 12, bold: true, color: FOREST_DK, fontFace: HEAD, lineSpacing: 17 });
    if (n[2]) txt(s, n[2], { x: x + nw - 1.05, y: y + 0.11, w: 0.9, h: 0.22, fontSize: 9, color: MUTED, align: "right" });
  });
  for (let i = 0; i < 6; i++) {
    const a = ctr[i], b = ctr[(i + 1) % 6];
    const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
    s.addShape(S.rightArrow, { x: mx - 0.26, y: my - 0.14, w: 0.52, h: 0.28, fill: { color: MOSS }, rotate: (-60 + i * 60) + 90 });
  }
  s.addShape(S.ellipse, { x: cx - 1.14, y: cy - 1.14, w: 2.28, h: 2.28, fill: { color: FOREST } });
  rings(s, cx, cy, [1.0], MOSS, 1, 55);
  txt(s, "森の\n地域内循環", { x: cx - 1.14, y: cy - 1.14, w: 2.28, h: 2.28, align: "center", valign: "middle", fontSize: 15, bold: true, color: WHITE, fontFace: HEAD, lineSpacing: 24 });
}

/* =====================================================================
   章扉 04
   ===================================================================== */
section("04", "企業版ふるさと納税で何を変えるか", "森林から生まれる価値を、地域内で循環させる仕組みをつくるための初期投資として活用する。",
  ["事業コンセプト", "制度上の3つの制約", "6つの施策", "5年のロードマップ"]);

/* =====================================================================
   7-1. 事業コンセプト
   ===================================================================== */
{
  const s = content("CONCEPT", "事業コンセプト");
  card(s, M, 1.80, CW, 1.55, FOREST, { shadow: true });
  txt(s, "CONCEPT", { x: M + 0.45, y: 2.02, w: 3, h: 0.26, fontSize: 10.5, bold: true, color: MOSS, fontFace: HEAD, charSpacing: 1.5 });
  txt(s, "八王子の森を、地域産業の資源に再設計する", {
    x: M + 0.45, y: 2.38, w: CW - 0.9, h: 0.7, fontSize: 29, bold: true, color: WHITE, fontFace: HEAD,
  });

  txt(s, "なぜ、企業版ふるさと納税なのか", { x: M, y: 3.62, w: CW, h: 0.34, fontSize: 15, bold: true, color: FOREST_DK, fontFace: HEAD });
  const r = [
    ["収益化前の\n「仕込み」に使える", "調査・構想・データ基盤・需要開拓・制度設計——整備費でも施設費でもない部分に充てられる。"],
    ["資金だけでなく\n「企業」が入ってくる", "需要・販路・技術・人材を持つ企業との関係が同時に生まれる。人材派遣型を使えば人も迎えられる。"],
    ["単年度ではなく\n「複数年度」で描ける", "5年スパンの事業として設計でき、循環が自走するまでの助走期間を確保できる。"],
  ];
  const cw = 3.79, gx = 0.28;
  r.forEach((it, i) => {
    const x = M + i * (cw + gx);
    card(s, x, 4.05, cw, 2.12, PAPER, { line: LINE, shadow: false });
    numCircle(s, x + 0.35, 4.32, 0.55, String(i + 1), CEDAR, WHITE);
    txt(s, it[0], { x: x + 1.05, y: 4.28, w: cw - 1.4, h: 0.7, fontSize: 13.5, bold: true, color: FOREST_DK, fontFace: HEAD, lineSpacing: 20, valign: "top" });
    txt(s, it[1], { x: x + 0.35, y: 5.12, w: cw - 0.7, h: 0.95, fontSize: 11, color: MUTED, lineSpacing: 17, valign: "top" });
  });
}

/* =====================================================================
   7-2. 制度上の制約（★再考ポイント）
   ===================================================================== */
{
  const s = content("PRECONDITIONS", "設計を左右する、制度上の3つの制約");
  txt(s, "企業版ふるさと納税は「寄付を集める」制度である前に「事業を認定してもらう」制度。設計の前に前提を押さえる。", {
    x: M, y: 1.48, w: CW, h: 0.3, fontSize: 11.5, color: MUTED,
  });
  const c = [
    ["制約 01", "本社所在地の自治体には\n寄付できない",
      "八王子市に本社を置く企業からは、この制度で寄付を受けられない。",
      "寄付の相手は「市外に本社を持つ企業」。八王子に事業所・工場・顧客・従業員を持つ企業が有力候補。市内企業は“寄付者”ではなく“八王子の木を買うパートナー”として設計する。"],
    ["制約 02", "寄付企業への\n経済的な見返りは禁止",
      "返礼品や便宜供与は認められない。",
      "企業への価値は、共同発信・ロゴ掲出・CO2等の環境価値レポートといった非経済的なものに限る。木材の購入やクレジット取得は、寄付とは別建ての商取引として明確に切り分ける。"],
    ["制約 03", "地域再生計画への位置づけと\n適用期限",
      "市の地域再生計画に事業を位置づけ、国の認定を受ける必要がある。",
      "税額控除の特例には適用期限があるため、認定申請の時期から逆算した準備が要る。第4章の施策は、この認定単位に収まるよう組み立てる。"],
  ];
  const cw = 3.79, gx = 0.28;
  c.forEach((it, i) => {
    const x = M + i * (cw + gx);
    card(s, x, 1.92, cw, 3.95, CEDAR_LT, { shadow: false });
    s.addShape(S.roundRect, { x: x + 0.35, y: 2.18, w: 1.06, h: 0.32, rectRadius: 0.15, fill: { color: CEDAR } });
    txt(s, it[0], { x: x + 0.35, y: 2.18, w: 1.06, h: 0.32, align: "center", valign: "middle", fontSize: 10.5, bold: true, color: WHITE, fontFace: HEAD });
    txt(s, it[1], { x: x + 0.35, y: 2.66, w: cw - 0.7, h: 0.95, fontSize: 14.5, bold: true, color: FOREST_DK, fontFace: HEAD, lineSpacing: 23, valign: "top" });
    txt(s, it[2], { x: x + 0.35, y: 3.72, w: cw - 0.7, h: 0.62, fontSize: 11, bold: true, color: CEDAR, lineSpacing: 17, valign: "top" });
    txt(s, "→ " + it[3], { x: x + 0.35, y: 4.44, w: cw - 0.7, h: 1.45, fontSize: 10.5, color: TEXT, lineSpacing: 16.5, valign: "top" });
  });
  txt(s, "※ 制度要件（対象事業・寄付下限額・税額控除の水準・適用期限等）は、内閣府「企業版ふるさと納税ポータルサイト」および東京都・八王子市の運用で最終確認する。", {
    x: M, y: 6.25, w: CW, h: 0.3, fontSize: 9.5, color: MUTED,
  });
}

/* =====================================================================
   7-3. 事業全体像
   ===================================================================== */
{
  const s = content("OVERVIEW", "事業の全体像｜6つの施策");
  const groups = [
    ["STEP 1", "基盤をつくる", MOSS_LT, FOREST_DK, [
      ["①", "八王子「森の50年ビジョン」"],
      ["②", "「森のカルテ」森林データ基盤"],
    ]],
    ["STEP 2", "出口をつくる", PAPER, FOREST_DK, [
      ["③", "八王子産材の需要先を“先に”つくる"],
      ["④", "人生の節目 × 八王子の森"],
      ["⑤", "「森のパートナー企業」制度"],
    ]],
    ["STEP 3", "価値を売り、森に還す", MOSS_LT, FOREST_DK, [
      ["⑥", "J-クレジット・環境価値との接続"],
      ["", "収益の森林整備への還元スキーム"],
    ]],
  ];
  const cw = 3.79, gx = 0.28;
  groups.forEach((g, i) => {
    const x = M + i * (cw + gx);
    card(s, x, 1.82, cw, 3.5, g[2], { line: g[2] === PAPER ? LINE : null, shadow: false });
    txt(s, g[0], { x: x + 0.35, y: 2.08, w: cw - 0.7, h: 0.26, fontSize: 10.5, bold: true, color: CEDAR, fontFace: HEAD, charSpacing: 1.2 });
    txt(s, g[1], { x: x + 0.35, y: 2.40, w: cw - 0.7, h: 0.4, fontSize: 18, bold: true, color: g[3], fontFace: HEAD });
    g[4].forEach((it, j) => {
      const y = 3.02 + j * 0.78;
      s.addShape(S.roundRect, { x: x + 0.35, y, w: cw - 0.7, h: 0.65, rectRadius: 0.08, fill: { color: WHITE } });
      txt(s, it[0], { x: x + 0.45, y, w: 0.4, h: 0.65, valign: "middle", fontSize: 13, bold: true, color: CEDAR, fontFace: HEAD });
      txt(s, it[1], { x: x + 0.88, y, w: cw - 1.28, h: 0.65, valign: "middle", fontSize: 10.5, bold: true, color: FOREST_DK, lineSpacing: 15 });
    });
    if (i < 2) s.addShape(S.rightArrow, { x: x + cw + 0.02, y: 3.35, w: 0.24, h: 0.24, fill: { color: CEDAR } });
  });
  card(s, M, 5.52, CW, 0.85, FOREST, { shadow: false });
  txt(s, "調べる　→　描く　→　整備する　→　売る　→　還す　　この一連を、ひとつの事業として設計・運営する。", {
    x: M, y: 5.52, w: CW, h: 0.85, align: "center", valign: "middle", fontSize: 14, bold: true, color: WHITE, fontFace: HEAD,
  });
}

/* =====================================================================
   7-4. 施策①②
   ===================================================================== */
{
  const s = content("ACTION 01 / 02", "基盤をつくる｜森の50年ビジョンと「森のカルテ」");

  card(s, M, 1.80, 5.79, 4.35, PAPER, { line: LINE, shadow: false });
  numCircle(s, M + 0.35, 2.08, 0.6, "①", FOREST, WHITE);
  txt(s, "八王子「森の50年ビジョン」", { x: M + 1.12, y: 2.16, w: 4.3, h: 0.36, fontSize: 16, bold: true, color: FOREST_DK, fontFace: HEAD });
  bullets(s, [
    "森林所有者・林業事業者・市民・企業・専門家を巻き込み、「50年後の八王子の森をどうするか」を描く",
    "「伐る／伐らない」の二択ではなく、森林ごとに役割を配分する",
  ], { x: M + 0.35, y: 2.85, w: 5.1, h: 1.35, fontSize: 11.5 });
  txt(s, "森林ごとに整理する役割", { x: M + 0.35, y: 4.28, w: 5.1, h: 0.28, fontSize: 11, bold: true, color: MOSS_DK, fontFace: HEAD });
  chips(s, ["木材生産", "生物多様性", "防災", "水源涵養", "景観", "レクリエーション", "教育", "CO2吸収"], M + 0.35, 4.62, 5.1, { fontSize: 10.5, fill: MOSS_LT });

  card(s, 6.83, 1.80, 5.79, 4.35, PAPER, { line: LINE, shadow: false });
  numCircle(s, 7.18, 2.08, 0.6, "②", FOREST, WHITE);
  txt(s, "「森のカルテ」＝森林データ基盤", { x: 7.95, y: 2.16, w: 4.3, h: 0.36, fontSize: 16, bold: true, color: FOREST_DK, fontFace: HEAD });
  txt(s, "森林ごとに、次の情報を可視化する。", { x: 7.18, y: 2.85, w: 5.1, h: 0.28, fontSize: 11.5, color: TEXT });
  chips(s, ["樹種", "林齢", "面積", "所有者", "森林の状態", "施業可能性", "搬出可能性", "将来的な木材量", "木材としての用途", "環境価値"], 7.18, 3.22, 5.1, { fontSize: 10.5, fill: MOSS_LT });
  card(s, 7.18, 4.62, 5.1, 1.25, FOREST, { shadow: false });
  txt(s, "「八王子のどこに、どんな森があり、そこから何を生み出せるのか」をデータにする。ビジョンづくりと需要設計、双方の共通言語になる。", {
    x: 7.4, y: 4.80, w: 4.66, h: 0.95, fontSize: 11, color: WHITE, lineSpacing: 17, valign: "top",
  });
}

/* =====================================================================
   7-5. 施策③ 需要の先付け
   ===================================================================== */
{
  const s = content("ACTION 03", "出口をつくる｜八王子産材の「需要先」を先につくる");
  txt(s, "「出せる木材」から売り先を探すのではなく、「買う人」を先に決めてから森を整備する。ここが今回の事業の中心。", {
    x: M, y: 1.48, w: CW, h: 0.3, fontSize: 11.5, color: MUTED,
  });
  const dm = [
    ["建築・内装", ["公共施設", "学校", "オフィス", "店舗", "ホテル", "住宅"]],
    ["暮らし", ["家具", "木製品", "出産・結婚記念品", "ノベルティ"]],
    ["エネルギー", ["薪", "チップ", "バイオマス熱"]],
    ["企業活動", ["オフィス家具", "展示会・イベント什器", "製品・パッケージ", "CSR・環境価値"]],
  ];
  const cw = 2.82, gx = 0.235;
  dm.forEach((g, i) => {
    const x = M + i * (cw + gx);
    card(s, x, 1.92, cw, 3.15, i % 2 === 0 ? MOSS_LT : PAPER, { line: i % 2 === 0 ? null : LINE, shadow: false });
    numCircle(s, x + 0.33, 2.18, 0.52, String(i + 1), FOREST, WHITE);
    txt(s, g[0], { x: x + 0.33, y: 2.86, w: cw - 0.66, h: 0.34, fontSize: 15, bold: true, color: FOREST_DK, fontFace: HEAD });
    let cy = 3.30;
    g[1].forEach((t) => {
      s.addShape(S.roundRect, { x: x + 0.33, y: cy, w: cw - 0.66, h: 0.32, rectRadius: 0.15, fill: { color: WHITE } });
      txt(s, t, { x: x + 0.33, y: cy, w: cw - 0.66, h: 0.32, align: "center", valign: "middle", fontSize: 10.5, color: FOREST_DK });
      cy += 0.4;
    });
  });
  card(s, M, 5.28, CW, 1.05, CEDAR_LT, { shadow: false });
  txt(s, "企業版ふるさと納税の使いどころ", { x: M + 0.4, y: 5.46, w: 3.6, h: 0.26, fontSize: 10.5, bold: true, color: CEDAR, fontFace: HEAD });
  txt(s, "「誰が八王子の木を買うのか」を、企業と一緒に先に設計する。この需要開拓と合意形成のプロセスこそ、既存財源では手当てしにくい部分。", {
    x: M + 0.4, y: 5.76, w: CW - 0.8, h: 0.36, fontSize: 12.5, bold: true, color: FOREST_DK, fontFace: HEAD,
  });
}

/* =====================================================================
   7-6. 施策④ 人生 × 森
   ===================================================================== */
{
  const s = content("ACTION 04", "出口をつくる｜人生の節目 × 八王子の森");
  const life = ["出生", "入園・入学", "成人", "結婚", "子育て"];
  const bw = 2.02, gp = 0.42;
  life.forEach((t, i) => {
    const x = M + i * (bw + gp);
    const on = i === 0 || i === 3;
    card(s, x, 1.80, bw, 0.62, on ? FOREST : PAPER, { line: on ? null : LINE, shadow: false });
    txt(s, t, { x, y: 1.80, w: bw, h: 0.62, align: "center", valign: "middle", fontSize: 13, bold: true, color: on ? WHITE : MUTED, fontFace: HEAD });
    if (i < 4) s.addShape(S.rightArrow, { x: x + bw + 0.06, y: 1.99, w: 0.3, h: 0.24, fill: { color: MOSS } });
  });

  card(s, M, 2.72, 7.35, 3.45, PAPER, { line: LINE, shadow: false });
  s.addShape(S.roundRect, { x: M + 0.38, y: 3.00, w: 1.5, h: 0.32, rectRadius: 0.15, fill: { color: CEDAR } });
  txt(s, "中核メニュー", { x: M + 0.38, y: 3.00, w: 1.5, h: 0.32, align: "center", valign: "middle", fontSize: 10, bold: true, color: WHITE, fontFace: HEAD });
  txt(s, "森の結婚証明書", { x: M + 0.38, y: 3.46, w: 6.6, h: 0.45, fontSize: 22, bold: true, color: FOREST_DK, fontFace: HEAD });
  txt(s, "年間約1,600組の婚姻がある八王子で、婚姻届を提出した方に八王子産材の証明書を贈る。単なる記念品ではなく、森とのつながりを可視化する媒体にする。", {
    x: M + 0.38, y: 4.02, w: 6.6, h: 0.62, fontSize: 11.5, color: TEXT, lineSpacing: 18, valign: "top",
  });
  txt(s, "記載する情報", { x: M + 0.38, y: 4.78, w: 6.6, h: 0.26, fontSize: 10.5, bold: true, color: MOSS_DK, fontFace: HEAD });
  chips(s, ["木の産地", "樹種", "森林所有者", "森林整備への還元額", "QRコードで森の情報へ"], M + 0.38, 5.10, 6.6, { fontSize: 10.5, fill: MOSS_LT });

  card(s, 8.42, 2.72, 4.2, 3.45, FOREST, { shadow: true });
  txt(s, "既存事業からの発展", { x: 8.78, y: 3.00, w: 3.5, h: 0.28, fontSize: 11, bold: true, color: MOSS, fontFace: HEAD });
  txt(s, "八王子には「はち★ベビギフト」で多摩産材の木製玩具を届ける取り組みがある。これを起点に、人生と森をつなぐ仕組みへ発展させる。", {
    x: 8.78, y: 3.36, w: 3.5, h: 1.1, fontSize: 11, color: "DCE9D2", lineSpacing: 17, valign: "top",
  });
  txt(s, "この施策が効く理由", { x: 8.78, y: 4.52, w: 3.5, h: 0.28, fontSize: 11, bold: true, color: MOSS, fontFace: HEAD });
  bullets(s, [
    "毎年発生する、予測可能な小口需要になる",
    "市民が「森の当事者」になる入口になる",
    "寄付企業にも成果が説明しやすい",
  ], { x: 8.78, y: 4.88, w: 3.5, h: 1.2, fontSize: 10.5, color: "DCE9D2", lineSpacing: 15 });
}

/* =====================================================================
   7-7. 施策⑤⑥
   ===================================================================== */
{
  const s = content("ACTION 05 / 06", "買う関係へ｜パートナー企業制度と環境価値の販売");

  card(s, M, 1.80, 5.79, 4.35, PAPER, { line: LINE, shadow: false });
  numCircle(s, M + 0.35, 2.08, 0.6, "⑤", FOREST, WHITE);
  txt(s, "「八王子の森パートナー企業」", { x: M + 1.12, y: 2.16, w: 4.3, h: 0.36, fontSize: 16, bold: true, color: FOREST_DK, fontFace: HEAD });
  const flow5 = ["年間○m³の八王子産材を利用する", "利用量に応じて森林整備へ一定額を還元", "地域材利用・森林保全・CO2として企業が発信"];
  flow5.forEach((t, i) => {
    const y = 2.86 + i * 0.62;
    s.addShape(S.roundRect, { x: M + 0.35, y, w: 5.1, h: 0.5, rectRadius: 0.08, fill: { color: MOSS_LT } });
    txt(s, t, { x: M + 0.5, y, w: 4.8, h: 0.5, valign: "middle", fontSize: 11, color: FOREST_DK });
    if (i < 2) s.addShape(S.downArrow, { x: M + 2.78, y: y + 0.5, w: 0.24, h: 0.12, fill: { color: MOSS } });
  });
  txt(s, "寄付で終わらせず、将来的に「企業が森の木を買う」関係へ変えていく。※制度上、寄付と取引は別建てで設計する（制約02）。", {
    x: M + 0.35, y: 4.82, w: 5.1, h: 1.1, fontSize: 11, bold: true, color: CEDAR, lineSpacing: 17, valign: "top",
  });

  card(s, 6.83, 1.80, 5.79, 4.35, PAPER, { line: LINE, shadow: false });
  numCircle(s, 7.18, 2.08, 0.6, "⑥", FOREST, WHITE);
  txt(s, "J-クレジット・環境価値との接続", { x: 7.95, y: 2.16, w: 4.4, h: 0.36, fontSize: 16, bold: true, color: FOREST_DK, fontFace: HEAD });
  const flow6 = ["八王子の森林整備", "CO2吸収・J-クレジット等の環境価値", "企業が購入し、自社の環境価値として活用", "収益を森林整備へ還元"];
  flow6.forEach((t, i) => {
    const y = 2.86 + i * 0.56;
    s.addShape(S.roundRect, { x: 7.18, y, w: 5.1, h: 0.46, rectRadius: 0.08, fill: { color: i === 3 ? FOREST : MOSS_LT } });
    txt(s, t, { x: 7.33, y, w: 4.8, h: 0.46, valign: "middle", fontSize: 11, color: i === 3 ? WHITE : FOREST_DK });
    if (i < 3) s.addShape(S.downArrow, { x: 9.61, y: y + 0.46, w: 0.24, h: 0.1, fill: { color: MOSS } });
  });
  txt(s, "木材が出しにくい森（急傾斜地・保安林など）も「稼ぐ森」にできる。多摩の森活性化プロジェクトのCO2吸収量認証とも接続できる。", {
    x: 7.18, y: 5.24, w: 5.1, h: 0.9, fontSize: 11, bold: true, color: CEDAR, lineSpacing: 17, valign: "top",
  });
}

/* =====================================================================
   8-1. ロードマップ
   ===================================================================== */
{
  const s = content("ROADMAP", "5年のロードマップ");
  const ph = [
    ["PHASE 1", "1〜2年目", "基盤づくり", FOREST, WHITE, MOSS, [
      "森のカルテ（モデル林から着手）",
      "「森の50年ビジョン」の策定",
      "需要企業の発掘・意向調査",
      "地域再生計画への位置づけ・認定申請",
    ]],
    ["PHASE 2", "2〜4年目", "出口づくり", MOSS_LT, FOREST_DK, MOSS_DK, [
      "パートナー企業制度の運用開始",
      "森の結婚証明書など生活シーンへの実装",
      "公共・民間の利用先マッチング",
      "流通・加工体制の整備",
    ]],
    ["PHASE 3", "4〜5年目〜", "循環の定着", PAPER, FOREST_DK, MOSS_DK, [
      "収益の森林還元スキームを確立",
      "J-クレジット等の運用開始",
      "対象林分の段階的な拡大",
      "自走化（寄付依存度の低減）",
    ]],
  ];
  const cw = 3.79, gx = 0.28;
  ph.forEach((p, i) => {
    const x = M + i * (cw + gx);
    card(s, x, 1.85, cw, 3.35, p[3], { line: p[3] === PAPER ? LINE : null, shadow: i === 0 });
    txt(s, p[0], { x: x + 0.35, y: 2.12, w: cw - 0.7, h: 0.26, fontSize: 10.5, bold: true, color: p[5], fontFace: HEAD, charSpacing: 1.2 });
    txt(s, p[2], { x: x + 0.35, y: 2.44, w: cw - 0.7, h: 0.45, fontSize: 21, bold: true, color: p[4], fontFace: HEAD });
    txt(s, p[1], { x: x + 0.35, y: 2.95, w: cw - 0.7, h: 0.3, fontSize: 11.5, color: p[3] === FOREST ? "DCE9D2" : MUTED });
    bullets(s, p[6], { x: x + 0.35, y: 3.42, w: cw - 0.7, h: 2.2, fontSize: 11, color: p[3] === FOREST ? "EAF1E0" : TEXT, lineSpacing: 17 });
  });
  s.addShape(S.rightArrow, { x: M, y: 5.52, w: CW, h: 0.44, fill: { color: MOSS_LT } });
  txt(s, "寄付への依存度を下げながら、木材と環境価値の収益で回る構造へ", {
    x: M, y: 5.52, w: CW - 0.5, h: 0.44, align: "center", valign: "middle", fontSize: 11.5, bold: true, color: FOREST_DK,
  });
}

/* =====================================================================
   8-2. KPI
   ===================================================================== */
{
  const s = content("KPI", "成果指標（案）");
  txt(s, "目標値そのものはPhase 1の「森のカルテ」整備によって初めて確定できる。まず測る対象を決める。", {
    x: M, y: 1.48, w: CW, h: 0.3, fontSize: 11.5, color: MUTED,
  });
  const k = [
    ["森のカルテ整備", "対象森林面積（ha）／市内森林に占めるカバー率", "Phase 1"],
    ["八王子産材の出材量", "年間出材量（m³）／うち市内で消費された量", "Phase 2"],
    ["継続利用の主体数", "八王子産材を継続的に利用する企業・施設数（社・件）", "Phase 2"],
    ["市民との接点", "森林由来製品が市民に届いた件数（結婚証明書・ベビギフト等）", "Phase 2"],
    ["森林への還元額", "木材販売・環境価値の収益から森林整備に還元された額（円／年）", "Phase 3"],
    ["環境価値", "CO2吸収量・クレジット創出量（t-CO2）と販売量", "Phase 3"],
  ];
  const cw = 5.79, ch = 1.28, gx = 0.32, gy = 0.2;
  k.forEach((it, i) => {
    const x = M + (i % 2) * (cw + gx);
    const y = 1.92 + Math.floor(i / 2) * (ch + gy);
    card(s, x, y, cw, ch, PAPER, { line: LINE, shadow: false });
    numCircle(s, x + 0.32, y + 0.34, 0.58, String(i + 1), i < 2 ? FOREST : MOSS, WHITE);
    txt(s, it[0], { x: x + 1.06, y: y + 0.22, w: cw - 2.4, h: 0.32, fontSize: 14, bold: true, color: FOREST_DK, fontFace: HEAD });
    txt(s, it[1], { x: x + 1.06, y: y + 0.60, w: cw - 1.4, h: 0.55, fontSize: 10.5, color: MUTED, lineSpacing: 16, valign: "top" });
    s.addShape(S.roundRect, { x: x + cw - 1.22, y: y + 0.22, w: 0.9, h: 0.3, rectRadius: 0.14, fill: { color: CEDAR_LT } });
    txt(s, it[2], { x: x + cw - 1.22, y: y + 0.22, w: 0.9, h: 0.3, align: "center", valign: "middle", fontSize: 9.5, bold: true, color: CEDAR });
  });
  txt(s, "※ 各指標の目標水準は、カルテ整備の結果と需要側企業の意向調査を踏まえて設定する。", {
    x: M, y: 6.32, w: CW, h: 0.3, fontSize: 9.5, color: MUTED,
  });
}

/* =====================================================================
   8-3. 財源の役割分担
   ===================================================================== */
{
  const s = content("FUNDING", "財源の役割分担｜3つを重ねず、役割で分ける");
  const f = [
    ["企業版ふるさと納税", "収益化前の投資", ["森のカルテ・データ基盤", "50年ビジョンの策定", "需要開拓・企業との合意形成", "制度設計・事務局機能", "人材派遣型による人の受け入れ"], FOREST, WHITE, MOSS],
    ["森林環境譲与税・市費", "継続的な整備と利用", ["森林整備・路網整備・森林保護", "公共施設での多摩産材利用", "木育・普及啓発", "所有者・境界の把握"], MOSS_LT, FOREST_DK, MOSS_DK],
    ["事業収益", "循環の自走", ["木材販売の収益", "環境価値・クレジットの収益", "森林整備への還元原資", "次期の需要開拓費"], PAPER, FOREST_DK, MOSS_DK],
  ];
  const cw = 3.79, gx = 0.28;
  f.forEach((g, i) => {
    const x = M + i * (cw + gx);
    card(s, x, 1.82, cw, 3.15, g[3], { line: g[3] === PAPER ? LINE : null, shadow: i === 0 });
    txt(s, g[0], { x: x + 0.35, y: 2.08, w: cw - 0.7, h: 0.36, fontSize: 15.5, bold: true, color: g[4], fontFace: HEAD });
    txt(s, g[1], { x: x + 0.35, y: 2.52, w: cw - 0.7, h: 0.28, fontSize: 11.5, bold: true, color: g[5], fontFace: HEAD });
    bullets(s, g[2], { x: x + 0.35, y: 2.92, w: cw - 0.7, h: 2.3, fontSize: 11, color: g[3] === FOREST ? "EAF1E0" : TEXT, lineSpacing: 17 });
  });
  card(s, M, 5.28, CW, 0.9, CEDAR_LT, { shadow: false });
  txt(s, "役割を分けることで、寄付が終わっても回る構造をつくる。企業版ふるさと納税は「呼び水」であって「運営費」ではない。", {
    x: M, y: 5.28, w: CW, h: 0.9, align: "center", valign: "middle", fontSize: 13.5, bold: true, color: FOREST_DK, fontFace: HEAD,
  });
}

/* =====================================================================
   8-4. 推進体制
   ===================================================================== */
{
  const s = content("STRUCTURE", "推進体制のイメージ");
  const cx = 4.35, cy = 4.15, hrx = 2.85, hry = 1.95;
  const around = ["森林所有者・森林組合", "市民・学校", "東京都・多摩地域自治体", "需要側企業", "木材流通・加工事業者", "林業事業者"];
  around.forEach((t, i) => {
    const a = (-90 + i * 60) * Math.PI / 180;
    const x = cx + hrx * Math.cos(a) - 1.15;
    const y = cy + hry * Math.sin(a) - 0.25;
    s.addShape(S.roundRect, { x, y, w: 2.3, h: 0.5, rectRadius: 0.1, fill: { color: MOSS_LT } });
    txt(s, t, { x, y, w: 2.3, h: 0.5, align: "center", valign: "middle", fontSize: 10.5, bold: true, color: FOREST_DK });
  });
  s.addShape(S.ellipse, { x: cx - 1.15, y: cy - 1.15, w: 2.3, h: 2.3, fill: { color: FOREST } });
  rings(s, cx, cy, [1.0], MOSS, 1, 55);
  txt(s, "八王子市\n（森林・産業・企画）", { x: cx - 1.15, y: cy - 1.15, w: 2.3, h: 2.3, align: "center", valign: "middle", fontSize: 12.5, bold: true, color: WHITE, fontFace: HEAD, lineSpacing: 20 });

  card(s, 8.55, 1.82, 4.07, 4.45, PAPER, { line: LINE, shadow: false });
  txt(s, "事務局機能（民間パートナー）", { x: 8.9, y: 2.10, w: 3.4, h: 0.34, fontSize: 14.5, bold: true, color: FOREST_DK, fontFace: HEAD });
  txt(s, "行政だけでも事業者だけでも回らない部分を担う中間機能を置く。", { x: 8.9, y: 2.52, w: 3.4, h: 0.6, fontSize: 10.5, color: MUTED, lineSpacing: 16, valign: "top" });
  const fn = ["森のカルテの構築・運用", "供給と需要のマッチング", "寄付・連携企業への窓口", "木材の調達・加工の手配", "効果測定と対外発信"];
  fn.forEach((t, i) => {
    const y = 3.22 + i * 0.58;
    s.addShape(S.roundRect, { x: 8.9, y, w: 3.4, h: 0.46, rectRadius: 0.08, fill: { color: WHITE } });
    s.addShape(S.ellipse, { x: 9.02, y: y + 0.15, w: 0.16, h: 0.16, fill: { color: CEDAR } });
    txt(s, t, { x: 9.3, y, w: 2.9, h: 0.46, valign: "middle", fontSize: 10.5, color: FOREST_DK });
  });
  txt(s, "※ 企業版ふるさと納税（人材派遣型）を使えば、企業人材を推進体制に迎えることもできる。", {
    x: M, y: 6.62, w: 7.6, h: 0.3, fontSize: 9.5, color: MUTED,
  });
}

/* =====================================================================
   8-5. 企業から見た参加価値
   ===================================================================== */
{
  const s = content("FOR COMPANIES", "企業から見た参加価値");
  const v = [
    ["取引として示せる森林保全", "「寄付しました」ではなく「八王子の木を使っています」と言える。グリーン購入や情報開示の実績としても扱いやすい。"],
    ["定量化できる環境価値", "CO2吸収量やJ-クレジットとして、数値で示せる。多摩の森活性化プロジェクトの認証とも接続できる。"],
    ["地域との具体的な関係", "従業員の森林体験、地域の学校との連携など、八王子という特定の場所との継続的な関わりが持てる。"],
    ["税制上のメリット", "企業版ふるさと納税は、損金算入と税額控除を合わせて最大約9割の負担軽減となる（制度要件の確認が前提）。"],
  ];
  const cw = 5.79, ch = 1.72, gx = 0.32, gy = 0.26;
  v.forEach((it, i) => {
    const x = M + (i % 2) * (cw + gx);
    const y = 1.80 + Math.floor(i / 2) * (ch + gy);
    card(s, x, y, cw, ch, i === 3 ? CEDAR_LT : PAPER, { line: i === 3 ? null : LINE, shadow: false });
    numCircle(s, x + 0.34, y + 0.34, 0.6, String(i + 1), i === 3 ? CEDAR : MOSS, WHITE);
    txt(s, it[0], { x: x + 1.1, y: y + 0.30, w: cw - 1.45, h: 0.34, fontSize: 15, bold: true, color: FOREST_DK, fontFace: HEAD });
    txt(s, it[1], { x: x + 1.1, y: y + 0.72, w: cw - 1.45, h: 0.85, fontSize: 11, color: MUTED, lineSpacing: 17, valign: "top" });
  });
  txt(s, "寄付の相手は市外に本社を持つ企業（制約01）。八王子に事業所・従業員・顧客を持つ企業を軸にアプローチする。", {
    x: M, y: 5.72, w: CW, h: 0.4, fontSize: 13, bold: true, color: FOREST_DK, fontFace: HEAD,
  });
}

/* =====================================================================
   8-6. 論点・リスク
   ===================================================================== */
{
  const s = content("OPEN ISSUES", "想定される論点と対応の方向");
  const rows = [
    ["供給の確度", "整備で出る木材の量・質・時期を、どこまで見通せるか", "Phase 1の「森のカルテ」で先に把握する。モデル林から始め、精度を上げながら対象を広げる。"],
    ["価格競争力", "八王子産材は、他産地材と価格で戦えるか", "価格だけで戦わない。産地・物語・環境価値を含めた価値で売る。小口・高付加価値の用途から入る。"],
    ["寄付企業の開拓", "市外に本社を持つ企業に、どう届けるか", "八王子に事業所・従業員・顧客を持つ企業を軸にする。市内企業は購入パートナーとして別建てで巻き込む。"],
    ["推進の人員と体制", "市の担当リソースだけで運営できるか", "事務局機能を外部化する。人材派遣型の活用も選択肢に入れる。"],
  ];
  let y = 1.82;
  rows.forEach((r, i) => {
    card(s, M, y, CW, 1.03, i % 2 === 0 ? PAPER : WHITE, { line: LINE, shadow: false });
    txt(s, r[0], { x: M + 0.35, y, w: 2.1, h: 1.03, valign: "middle", fontSize: 13.5, bold: true, color: FOREST_DK, fontFace: HEAD });
    txt(s, r[1], { x: M + 2.6, y, w: 3.85, h: 1.03, valign: "middle", fontSize: 11, color: MUTED, lineSpacing: 17 });
    s.addShape(S.rightArrow, { x: M + 6.62, y: y + 0.44, w: 0.3, h: 0.18, fill: { color: CEDAR } });
    txt(s, r[2], { x: M + 7.12, y, w: 4.4, h: 1.03, valign: "middle", fontSize: 11, color: TEXT, lineSpacing: 17 });
    y += 1.12;
  });
}

/* =====================================================================
   9. まとめ
   ===================================================================== */
{
  const s = newSlide();
  s.background = { color: INK };
  rings(s, 11.7, 5.3, [0.9, 1.6, 2.3, 3.0, 3.7], MOSS, 1.25, 76);
  txt(s, "CONCLUSION", { x: M, y: 0.82, w: 5, h: 0.3, fontSize: 11.5, bold: true, color: MOSS, fontFace: HEAD, charSpacing: 1.5 });
  txt(s, "「森を守るためにお金を使う」から、\n「森から価値を生み、その価値で森を守る」へ。", {
    x: M, y: 1.35, w: 9.6, h: 1.7, fontSize: 27, bold: true, color: WHITE, fontFace: HEAD, lineSpacing: 44,
  });
  txt(s, "既存の「多摩の森」や森林環境譲与税の取り組みを否定せず、それらを次の段階へ発展させる\n企業版ふるさと納税事業として提案する。", {
    x: M, y: 3.15, w: 9.0, h: 0.8, fontSize: 13, color: "C7D6BC", lineSpacing: 24,
  });
  txt(s, "次のアクション", { x: M, y: 4.25, w: 5, h: 0.3, fontSize: 13, bold: true, color: MOSS, fontFace: HEAD });
  const na = [
    ["01", "庁内・関係者での構想共有と論点整理"],
    ["02", "森のカルテを試行するモデル林の設定"],
    ["03", "寄付・連携候補企業のロングリスト作成と意向打診"],
  ];
  na.forEach((n, i) => {
    const y = 4.72 + i * 0.62;
    s.addShape(S.ellipse, { x: M, y: y + 0.04, w: 0.4, h: 0.4, fill: { color: CEDAR } });
    txt(s, n[0], { x: M, y: y + 0.04, w: 0.4, h: 0.4, align: "center", valign: "middle", fontSize: 10.5, bold: true, color: WHITE, fontFace: HEAD });
    txt(s, n[1], { x: M + 0.62, y, w: 8.5, h: 0.48, valign: "middle", fontSize: 14, bold: true, color: WHITE, fontFace: HEAD });
  });
  footer(s);
}

/* =====================================================================
   10. 注記・出典
   ===================================================================== */
{
  const s = content("NOTES", "注記・主な参照資料");
  card(s, M, 1.85, CW, 1.5, CEDAR_LT, { shadow: false });
  txt(s, "本資料の位置づけ", { x: M + 0.4, y: 2.08, w: 5, h: 0.28, fontSize: 11.5, bold: true, color: CEDAR, fontFace: HEAD });
  txt(s, "本資料の施策・ロードマップ・KPIは検討用の案であり、確定した事業計画ではない。記載した数値・事実関係は八王子市および東京都の公表資料に基づく整理であり、提案化にあたっては最新資料での最終確認を行う。", {
    x: M + 0.4, y: 2.44, w: CW - 0.8, h: 0.75, fontSize: 11.5, color: TEXT, lineSpacing: 18, valign: "top",
  });

  txt(s, "主な参照資料", { x: M, y: 3.62, w: 5, h: 0.3, fontSize: 14, bold: true, color: FOREST_DK, fontFace: HEAD });
  const refs = [
    ["八王子市", ["森林整備計画", "森林環境譲与税関連資料", "2026年度予算（森林環境施策）", "公共建築物等における多摩産材利用推進方針", "はち★ベビギフト"]],
    ["東京都・国", ["「多摩の森」活性化プロジェクト", "多摩産材の利用促進に関する施策", "内閣府「企業版ふるさと納税ポータルサイト」", "J-クレジット制度（森林分野）"]],
  ];
  refs.forEach((g, i) => {
    const x = M + i * (5.79 + 0.32);
    card(s, x, 4.05, 5.79, 2.15, PAPER, { line: LINE, shadow: false });
    txt(s, g[0], { x: x + 0.35, y: 4.28, w: 5, h: 0.28, fontSize: 12, bold: true, color: MOSS_DK, fontFace: HEAD });
    bullets(s, g[1], { x: x + 0.35, y: 4.66, w: 5.1, h: 1.4, fontSize: 10.5, lineSpacing: 16 });
  });
}


/* ---------- speaker notes ---------- */
const NOTES = [
  "本日は、八王子市の森林・木材を「守る対象」から「地域産業の資源」へ位置づけ直す構想をご説明します。企業版ふるさと納税を、単年度の整備費ではなく、仕組みづくりの初期投資として使う提案です。",
  "最初に結論から。現在は財源の大きさが整備量の上限になっていますが、木材と環境価値の販売収益が森に還る構造をつくれば、需要が増えるほど森を整備できるようになります。",
  "前半3章で現状認識をそろえ、第4章で具体的な事業案に入ります。第1〜3章は既存の取り組みを否定するためではなく、次の段階につなぐための整理です。",
  "第1章では、資源はあるのに循環していないという構造を、3つの課題として整理します。",
  "議論の出発点として、八王子の森がすでに4つの価値を生んでいることを確認します。問題は価値がないことではなく、その価値が測られず、売られず、森に還っていないことです。",
  "担い手と財源が単発でしか確保できないため、計画があっても実行が続きません。整備を「事業」として成立させる必要がある、という論点につなげます。",
  "整備すれば木材は必ず出ます。しかし売り先が細いため収益が森に戻らず、整備を続ける経済的動機が生まれません。東京都の「多摩の森」活性化プロジェクトも同じ課題を挙げています。",
  "八王子には需要の芽が数多くあります。足りないのは需要そのものではなく、森林側の情報と都市側の用途をつなぐ仕組みです。",
  "3つの断絶を個別に解くのではなく、ひとつの循環としてつなぎ直すことが提案の狙いです。その最初のひと押しに企業版ふるさと納税を使います。",
  "第2章では、八王子市がすでに行っている取り組みを確認します。「足りない」という話ではないことを、ここで明確にします。",
  "森林整備・木育・木材利用の3つとも、すでに始まっています。提案はこれらを置き換えるものではありません。",
  "財源は一定規模で確保されています。論点は「何に使い、何を生み出すか」です。金額は市の公表資料に基づく整理のため、提案化の前に最新の予算資料で最終確認します。",
  "第3章がこの提案の肝になる部分です。課題の捉え方を一度組み替えます。",
  "「取り組みが足りない」のではなく「取り組みがつながっていない」。ここを共有できるかどうかで、提案の受け取られ方が変わります。",
  "3つとも「次の段階への接続」の話です。A は経済的循環、B は継続需要、C は事業サイクルの一体化。",
  "調べる→描く→整備する→売る→還す。この6段階をバラバラの事業ではなく、ひとつの事業サイクルとして運営します。",
  "第4章から具体的な事業案に入ります。",
  "企業版ふるさと納税が他の財源と違うのは、収益化前の仕込みに使えること、資金だけでなく企業との関係が生まれること、複数年度で描けることの3点です。",
  "ここは設計前に必ず押さえる部分です。特に「本社所在地の自治体には寄付できない」ため、市内企業は寄付者ではなく“八王子の木を買うパートナー”として位置づけます。返礼品禁止のため、木材購入やクレジット取得は寄付とは別建ての商取引として切り分けます。制度要件は内閣府ポータル等で最終確認してください。",
  "6つの施策を「基盤をつくる／出口をつくる／価値を売り、森に還す」の3ステップに整理しています。",
  "ビジョンとカルテは、行政・事業者・企業が同じ絵を見るための共通言語になります。カルテはモデル林から着手します。",
  "出口を先につくるのが今回の中心です。需要開拓と合意形成のプロセスこそ、既存財源では手当てしにくい部分になります。",
  "毎年発生する、予測可能な小口需要をつくり、市民を森の当事者にします。既存の「はち★ベビギフト」からの発展として説明できます。婚姻件数は最新の統計で確認してください。",
  "寄付から取引へ、という移行がこの2施策の狙いです。ただし寄付と取引は制度上、別建てで設計します。環境価値は、木材が出しにくい森を「稼ぐ森」にできる点が重要です。",
  "5年で寄付依存度を下げ、木材と環境価値の収益で回る構造にします。Phase 1 に地域再生計画への位置づけ・認定申請を入れている点がポイントです。",
  "目標値はカルテ整備後に確定します。まず「何を測るか」を決めることが先である、という説明をします。",
  "3つの財源を重ねるのではなく、役割で分けます。企業版ふるさと納税は呼び水であって運営費ではありません。",
  "行政と事業者の間をつなぐ事務局機能が要になります。企業版ふるさと納税の人材派遣型も選択肢です。",
  "寄付先となるのは市外に本社を持つ企業です。八王子に事業所・従業員・顧客を持つ企業が有力候補になります。税制メリットは制度要件の確認が前提です。",
  "想定される反論に、あらかじめ対応方針を示しています。特に価格競争力は必ず問われるため、価格だけで戦わない設計を明示しています。",
  "既存の取り組みを否定せず、次の段階へ発展させる提案として締めます。次のアクションは3点です。",
  "数値・事実関係は公表資料に基づく整理であり、提案化の前に最終確認が必要である旨を明記しています。"
];
NOTES.forEach((t, i) => { if (ALL[i]) ALL[i].addNotes(t); });

const out = process.argv[2] || "hachioji_forest.pptx";
pptx.writeFile({ fileName: out }).then(() => console.log("written:", out, "slides:", pageNo));
