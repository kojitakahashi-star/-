const pptxgen = require("pptxgenjs");

const pres = new pptxgen();
pres.layout = "LAYOUT_WIDE"; // 13.333 x 7.5
const W = 13.333, H = 7.5;

const C = {
  dark: "1E3524",
  green: "2C5F2D",
  moss: "97BC62",
  sakura: "C4707F",
  text: "2E332C",
  muted: "6E7266",
  tint: "F0F4EC",
  cream: "F8F6F1",
  white: "FFFFFF",
  line: "DCE2D6",
};
const F = "Meiryo";

const sh = () => ({ type: "outer", color: "1E3524", blur: 10, offset: 2, angle: 90, opacity: 0.1 });

function base(slide, bg) {
  slide.background = { color: bg || C.white };
}

function header(slide, kicker, title, opts) {
  const o = opts || {};
  slide.addText(kicker, {
    x: 0.7, y: 0.42, w: 8, h: 0.3, margin: 0,
    fontFace: F, fontSize: 12, bold: true, color: o.kickerColor || C.green, charSpacing: 1.5,
  });
  slide.addText(title, {
    x: 0.7, y: 0.75, w: 11.9, h: 0.8, margin: 0,
    fontFace: F, fontSize: o.size || 28, bold: true, color: o.color || C.text,
  });
}

function card(slide, x, y, w, h, fill) {
  slide.addShape(pres.ShapeType.roundRect, {
    x, y, w, h, rectRadius: 0.08,
    fill: { color: fill || C.tint }, line: { color: fill ? fill : C.line, width: 1 },
    shadow: sh(),
  });
}

function numCircle(slide, x, y, n, d, bg, fg) {
  const dia = d || 0.5;
  slide.addShape(pres.ShapeType.ellipse, {
    x, y, w: dia, h: dia, fill: { color: bg || C.green }, line: { color: bg || C.green, width: 0 },
  });
  slide.addText(String(n), {
    x, y, w: dia, h: dia, margin: 0, align: "center", valign: "middle",
    fontFace: F, fontSize: dia > 0.55 ? 16 : 13, bold: true, color: fg || C.white,
  });
}

function footer(slide, page) {
  slide.addText("株式会社森未来", {
    x: 0.7, y: 6.95, w: 4, h: 0.3, margin: 0,
    fontFace: F, fontSize: 9, color: C.muted,
  });
  slide.addText(String(page), {
    x: 12.1, y: 6.95, w: 0.55, h: 0.3, margin: 0, align: "right",
    fontFace: F, fontSize: 9, color: C.muted,
  });
}

/* ---------------------------------------------------------------- 1. 表紙 */
{
  const s = pres.addSlide();
  base(s, C.dark);
  // 装飾：桜色と苔色の円モチーフ（右側）
  s.addShape(pres.ShapeType.ellipse, { x: 9.9, y: -1.15, w: 4.9, h: 4.9, fill: { color: C.green }, line: { width: 0 }, transparency: 35 });
  s.addShape(pres.ShapeType.ellipse, { x: 11.2, y: 3.5, w: 2.9, h: 2.9, fill: { color: C.sakura }, line: { width: 0 }, transparency: 55 });
  s.addShape(pres.ShapeType.ellipse, { x: 8.9, y: 4.9, w: 1.5, h: 1.5, fill: { color: C.moss }, line: { width: 0 }, transparency: 55 });

  s.addText("EBISU / WOOD UTILIZATION PROPOSAL", {
    x: 0.9, y: 1.5, w: 8.6, h: 0.35, margin: 0,
    fontFace: F, fontSize: 12, bold: true, color: C.moss, charSpacing: 2,
  });
  s.addText("恵比寿の「まちの木」を、\n資産に変える", {
    x: 0.9, y: 2.05, w: 8.9, h: 1.75, margin: 0, lineSpacing: 46,
    fontFace: F, fontSize: 36, bold: true, color: C.white,
  });
  s.addText("エリア内で発生する樹木の利活用と、施設での木材利用のご提案", {
    x: 0.9, y: 3.95, w: 8.6, h: 0.4, margin: 0,
    fontFace: F, fontSize: 15, color: C.moss,
  });
  s.addShape(pres.ShapeType.roundRect, {
    x: 0.9, y: 4.85, w: 6.5, h: 1.25, rectRadius: 0.08,
    fill: { color: "2A4630" }, line: { color: C.moss, width: 1 },
  });
  s.addText([
    { text: "サッポロ不動産開発株式会社　開発本部長 様", options: { fontSize: 15, bold: true, color: C.white, breakLine: true } },
    { text: "2026年8月　株式会社森未来", options: { fontSize: 12, color: C.moss } },
  ], { x: 1.15, y: 5.0, w: 6.1, h: 0.95, margin: 0, fontFace: F, valign: "middle" });
  s.addNotes("開発本部長様への打診用。冒頭は「先日 藤原様・権瓶様にお時間をいただいた件の続き」として位置づける。目的は受注ではなく、恵比寿エリアで発生する樹木の情報連携と、施設木質化の検討機会をいただくこと。");
}

/* ------------------------------------------------------------ 2. ご提案の要旨 */
{
  const s = pres.addSlide();
  base(s);
  header(s, "SUMMARY", "本日ご相談したいこと");
  s.addText("恵比寿エリアで「これから発生する樹木」と「これからつくる施設」の2つの接点から、御社のエリア価値向上にお役立ていただけると考えております。", {
    x: 0.7, y: 1.62, w: 11.9, h: 0.4, margin: 0, fontFace: F, fontSize: 13, color: C.muted,
  });

  const items = [
    { n: "01", t: "樹木を「処分」から\n「資産」へ", b: "開発・改修・公園管理で発生する伐採木や剪定枝を、内装材・家具・アートに転換。処分費が掛かっていた木を、エリアの物語を語る素材に変えます。" },
    { n: "02", t: "施設の木質化を\nデザイン起点で", b: "セットアップオフィスや共用部で、まず“ワンポイント”から。デザイン性で差別化し、賃料・テナント訴求につなげる使い方をご提案します。" },
    { n: "03", t: "まずは情報連携から\nご一緒したい", b: "伐採・剪定のご予定を早い段階で共有いただければ、活用の選択肢が広がります。30分のお打ち合わせをお願いできませんでしょうか。" },
  ];
  items.forEach((it, i) => {
    const x = 0.7 + i * 4.05;
    card(s, x, 2.25, 3.75, 3.5);
    numCircle(s, x + 0.35, 2.6, it.n, 0.62);
    s.addText(it.t, {
      x: x + 0.35, y: 3.42, w: 3.05, h: 0.95, margin: 0, lineSpacing: 26,
      fontFace: F, fontSize: 17, bold: true, color: C.green,
    });
    s.addText(it.b, {
      x: x + 0.35, y: 4.35, w: 3.05, h: 1.6, margin: 0, lineSpacing: 20,
      fontFace: F, fontSize: 12, color: C.text,
    });
  });
  footer(s, 2);
  s.addNotes("この1枚で全体を伝える。数字目標や見積の話はせず、まず情報連携の入口をつくることを主眼に。");
}

/* -------------------------------------------- 3. 御社の取り組みへの理解 */
{
  const s = pres.addSlide();
  base(s);
  header(s, "UNDERSTANDING", "御社の取り組みへの理解");
  s.addText("これまでのお打ち合わせと公開情報から、以下のように理解しております。", {
    x: 0.7, y: 1.62, w: 11.9, h: 0.35, margin: 0, fontFace: F, fontSize: 13, color: C.muted,
  });

  const cells = [
    { t: "「ひらめきが生まれるまち」", b: "働く・遊ぶ・住むが混在し、刺激とゆとりが共存する環境づくり。緑や余白が新しい発見を生み、恵比寿のブランド価値を高めていく。" },
    { t: "エリアに根ざした開発", b: "恵比寿・銀座・札幌というゆかりの地を軸に、オフィス／商業／レジデンスを開発・運営。跡地活用や小規模ビルのリノベーションも積極的に展開。" },
    { t: "デザイン性による差別化", b: "セットアップオフィスでは家具什器・内装に木を使ったデザインを採用。デザイン性を入口に、賃料やテナント満足度の向上を図られている。" },
    { t: "環境・地域への取り組み", b: "DBJ Green Building認証の最高評価取得、恵比寿ガーデンプレイスの緑地の自然共生サイト登録、恵比寿南一公園の指定管理など。" },
  ];
  cells.forEach((c, i) => {
    const x = 0.7 + (i % 2) * 6.15;
    const y = 2.25 + Math.floor(i / 2) * 2.1;
    card(s, x, y, 5.85, 1.85, C.cream);
    s.addShape(pres.ShapeType.ellipse, { x: x + 0.35, y: y + 0.42, w: 0.16, h: 0.16, fill: { color: C.sakura }, line: { width: 0 } });
    s.addText(c.t, {
      x: x + 0.62, y: y + 0.3, w: 4.95, h: 0.4, margin: 0,
      fontFace: F, fontSize: 15, bold: true, color: C.green,
    });
    s.addText(c.b, {
      x: x + 0.62, y: y + 0.78, w: 4.95, h: 0.9, margin: 0, lineSpacing: 19,
      fontFace: F, fontSize: 11.5, color: C.text,
    });
  });
  footer(s, 3);
  s.addNotes("認識ずれがあればこの場で訂正いただく前提で提示する。相手の言葉（ひらめきが生まれるまち／デザイン性が入口）をそのまま使うのがポイント。");
}

/* ------------------------------------------------------ 4. 課題仮説 */
{
  const s = pres.addSlide();
  base(s);
  header(s, "ISSUES", "私たちが感じている「もったいなさ」");

  const rows = [
    { n: "1", t: "伐採・剪定で出た木が、費用をかけて廃棄されている", b: "恵比寿南一公園の桜のように、まちの記憶を持つ木が処分されてしまう。活用を前提に段取りできれば、処分費の一部を素材費に振り替えられます。" },
    { n: "2", t: "木材は「高い・手間がかかる」印象が残っている", b: "従来の商流では相談が何社も経由し、都度バッファが積まれて価格が膨らみます。結果として「木は諦める」判断になりがちです。" },
    { n: "3", t: "サステナビリティの説明素材が、後付けになりやすい", b: "デザインが先、環境価値は後からついてくる。だからこそ“地域の木を使った”という事実は、後付けでない説明材料になります。" },
  ];
  rows.forEach((r, i) => {
    const y = 1.85 + i * 1.62;
    card(s, 0.7, y, 11.9, 1.42, i === 0 ? C.tint : C.cream);
    numCircle(s, 1.05, y + 0.42, r.n, 0.58, i === 0 ? C.sakura : C.green);
    s.addText(r.t, {
      x: 1.85, y: y + 0.22, w: 10.4, h: 0.4, margin: 0,
      fontFace: F, fontSize: 16, bold: true, color: C.text,
    });
    s.addText(r.b, {
      x: 1.85, y: y + 0.68, w: 10.4, h: 0.6, margin: 0, lineSpacing: 19,
      fontFace: F, fontSize: 12, color: C.muted,
    });
  });
  footer(s, 4);
  s.addNotes("「御社が悪い」という論調にしない。業界構造の問題として提示し、当社が入ることで解ける、という流れにする。");
}

/* -------------------------------------------------- 5. ご提案の全体像 */
{
  const s = pres.addSlide();
  base(s);
  header(s, "PROPOSAL", "ご提案の全体像：2つの入口");

  const cols = [
    { tag: "A", ttl: "まちの樹木の資産化", sub: "エリア内で発生する木を使い切る", li: ["開発・改修時の既存樹、公園・緑地の剪定伐採材を活用", "内装材・家具・アートパネル・ノベルティへ転換", "「この場所に生えていた木」という物語がそのまま資産になる"], col: C.sakura },
    { tag: "B", ttl: "施設での木材利用", sub: "デザイン起点の木質化", li: ["セットアップオフィス・共用部・ラウンジの木質化", "地域材・認証材・不燃突板など用途に応じた調達", "設計段階からの相談で、コストと納まりの両立を図る"], col: C.green },
  ];
  cols.forEach((c, i) => {
    const x = 0.7 + i * 6.15;
    card(s, x, 1.8, 5.85, 2.9);
    s.addShape(pres.ShapeType.roundRect, {
      x: x + 0.35, y: 2.1, w: 0.52, h: 0.52, rectRadius: 0.1,
      fill: { color: c.col }, line: { width: 0 },
    });
    s.addText(c.tag, { x: x + 0.35, y: 2.1, w: 0.52, h: 0.52, margin: 0, align: "center", valign: "middle", fontFace: F, fontSize: 18, bold: true, color: C.white });
    s.addText(c.ttl, { x: x + 1.02, y: 2.08, w: 4.5, h: 0.36, margin: 0, fontFace: F, fontSize: 18, bold: true, color: C.text });
    s.addText(c.sub, { x: x + 1.02, y: 2.44, w: 4.5, h: 0.3, margin: 0, fontFace: F, fontSize: 11.5, color: C.muted });
    s.addText(c.li.map((t, j) => ({ text: t, options: { bullet: true, breakLine: j !== c.li.length - 1 } })), {
      x: x + 0.42, y: 2.95, w: 5.05, h: 1.85, margin: 0,
      fontFace: F, fontSize: 12, color: C.text, lineSpacing: 19, paraSpaceAfter: 8,
    });
  });

  card(s, 0.7, 5.05, 11.9, 1.35, C.dark);
  s.addText("共通の基盤：森未来の木材コーディネート", {
    x: 1.05, y: 5.25, w: 5.5, h: 0.32, margin: 0, fontFace: F, fontSize: 14, bold: true, color: C.moss,
  });
  s.addText("木材ECプラットフォーム「eTREE」／全国の林業家・製材所・材木屋とのネットワーク／独自のデューデリジェンス（合法性確認）／FSC®・PEFC認証材の調達／伐採〜製材・乾燥〜加工〜施工までの一括コーディネート", {
    x: 1.05, y: 5.62, w: 11.2, h: 0.62, margin: 0, lineSpacing: 18,
    fontFace: F, fontSize: 11.5, color: C.white,
  });
  footer(s, 5);
  s.addNotes("A（樹木活用）は話題性・ストーリー、B（木質化）は本業の収益に直結。どちらから入っても構わない、という提示の仕方にする。");
}

/* -------------------------------------------- 6. A：樹木活用の進め方 */
{
  const s = pres.addSlide();
  base(s);
  header(s, "APPROACH A", "まちの樹木の資産化：段取りが価値を決める", { kickerColor: C.sakura });
  s.addText("木は伐ってからでは選択肢が狭まります。伐採前に用途を決めておくことで、価値の高い部位を残せます。", {
    x: 0.7, y: 1.62, w: 11.9, h: 0.35, margin: 0, fontFace: F, fontSize: 13, color: C.muted,
  });

  const steps = [
    { n: "1", t: "情報共有", b: "伐採・剪定の予定を事前に共有" },
    { n: "2", t: "現物確認", b: "樹種・径・状態を現地で確認し用途を判断" },
    { n: "3", t: "伐採・搬出", b: "用途に合わせた玉切り・搬出の段取り" },
    { n: "4", t: "製材・乾燥", b: "提携製材所で製材・乾燥（数ヶ月〜）" },
    { n: "5", t: "加工・設置", b: "家具・内装材・アートとして施設へ" },
  ];
  steps.forEach((st, i) => {
    const x = 0.7 + i * 2.42;
    card(s, x, 2.3, 2.22, 2.5);
    numCircle(s, x + 0.85, 2.58, st.n, 0.52, C.sakura);
    s.addText(st.t, { x: x + 0.12, y: 3.25, w: 1.98, h: 0.32, margin: 0, align: "center", fontFace: F, fontSize: 14, bold: true, color: C.green });
    s.addText(st.b, { x: x + 0.18, y: 3.62, w: 1.86, h: 1.0, margin: 0, align: "center", lineSpacing: 17, fontFace: F, fontSize: 10.5, color: C.text });
    if (i < steps.length - 1) {
      s.addText("▶", { x: x + 2.19, y: 3.28, w: 0.26, h: 0.32, margin: 0, align: "center", valign: "middle", fontFace: F, fontSize: 11, color: C.moss });
    }
  });

  card(s, 0.7, 5.05, 5.85, 1.5, C.cream);
  s.addText("複数年プロジェクトにも対応します", { x: 1.05, y: 5.25, w: 5.15, h: 0.32, margin: 0, fontFace: F, fontSize: 14, bold: true, color: C.text });
  s.addText("伐採から竣工までが数年にわたる場合も、木材の保管スペースを確保してプロジェクトを進めた実績があります（三井不動産レジデンシャル様「土地の記憶」）。", {
    x: 1.05, y: 5.62, w: 5.15, h: 0.75, margin: 0, lineSpacing: 18, fontFace: F, fontSize: 11.5, color: C.muted,
  });
  card(s, 6.75, 5.05, 5.85, 1.5, C.tint);
  s.addText("恵比寿南一公園の桜を、最初の一本に", { x: 7.1, y: 5.25, w: 5.15, h: 0.32, margin: 0, fontFace: F, fontSize: 14, bold: true, color: C.text });
  s.addText("先般お伺いした伐採後の桜が残っていれば、状態確認からご一緒させてください。残っていない場合も、今後の剪定・伐採の予定から始められます。", {
    x: 7.1, y: 5.62, w: 5.15, h: 0.75, margin: 0, lineSpacing: 18, fontFace: F, fontSize: 11.5, color: C.muted,
  });
  footer(s, 6);
  s.addNotes("最重要スライド。「伐採前に相談いただければ価値が変わる」という一点を持ち帰っていただく。");
}

/* -------------------------------------------- 7. A：アウトプット類型 */
{
  const s = pres.addSlide();
  base(s);
  header(s, "APPROACH A", "樹木の使い方：規模と状態に合わせて選べます", { kickerColor: C.sakura });

  const outs = [
    { t: "内装材・家具", b: "カウンター、テーブル、ベンチ、不燃突板、フロアサイン。共用部やラウンジの主役として、長く使われる形で残します。", tag: "資産として残す" },
    { t: "アート・オブジェ", b: "幹は木工作家と連携しアート作品に。細い枝は輪切りにして集積し、「土地の記憶」を象徴する壁面パネルにも。", tag: "象徴をつくる" },
    { t: "ノベルティ・WS", b: "コースター、一輪挿し、靴ベラ、ペンなど。テナント様・地域向けのワークショップや記念品として配布できます。", tag: "接点をつくる" },
  ];
  outs.forEach((o, i) => {
    const x = 0.7 + i * 4.05;
    card(s, x, 1.85, 3.75, 2.85);
    s.addText(o.tag, { x: x + 0.35, y: 2.12, w: 3.05, h: 0.28, margin: 0, fontFace: F, fontSize: 10.5, bold: true, color: C.sakura, charSpacing: 1 });
    s.addText(o.t, { x: x + 0.35, y: 2.45, w: 3.05, h: 0.38, margin: 0, fontFace: F, fontSize: 18, bold: true, color: C.green });
    s.addText(o.b, { x: x + 0.35, y: 2.95, w: 3.05, h: 1.5, margin: 0, lineSpacing: 19, fontFace: F, fontSize: 12, color: C.text });
  });

  card(s, 0.7, 4.95, 11.9, 1.6, C.dark);
  s.addText("すべてを無駄にしない", { x: 1.05, y: 5.15, w: 4.0, h: 0.34, margin: 0, fontFace: F, fontSize: 15, bold: true, color: C.moss });
  s.addText("無垢のまま使えない枝や根も、チップ・木粉にして建材メーカーと連携し、樹脂と混合したウッドデッキとして製作した事例があります（品川区東五反田五丁目計画）。一本の木を、部位ごとに使い切る設計が可能です。", {
    x: 1.05, y: 5.55, w: 11.2, h: 0.8, margin: 0, lineSpacing: 19, fontFace: F, fontSize: 12, color: C.white,
  });
  footer(s, 7);
}

/* -------------------------------------------- 8. B：施設での木材利用 */
{
  const s = pres.addSlide();
  base(s);
  header(s, "APPROACH B", "施設での木材利用：デザインを入口に");

  const items = [
    { t: "セットアップオフィス", b: "スタートアップ向け小規模オフィスの家具什器・ワンポイントの木使い。入退去のしやすさを保ちながら、内見時の印象を変えます。" },
    { t: "共用部・ラウンジ・エントランス", b: "受付カウンター、ベンチ、壁面パネル、サイン。まとまった面積が取れる場所は、地域材や既存樹の見せ場になります。" },
    { t: "改修・リノベーション", b: "小規模ビルのリノベに合わせた木質化。既存解体材や敷地内の樹木と組み合わせると、コストと物語を両立できます。" },
  ];
  items.forEach((it, i) => {
    const y = 1.85 + i * 1.45;
    card(s, 0.7, y, 7.35, 1.28, C.cream);
    s.addShape(pres.ShapeType.roundRect, { x: 1.05, y: y + 0.42, w: 0.42, h: 0.42, rectRadius: 0.1, fill: { color: C.green }, line: { width: 0 } });
    s.addText(String(i + 1), { x: 1.05, y: y + 0.42, w: 0.42, h: 0.42, margin: 0, align: "center", valign: "middle", fontFace: F, fontSize: 13, bold: true, color: C.white });
    s.addText(it.t, { x: 1.62, y: y + 0.22, w: 6.2, h: 0.34, margin: 0, fontFace: F, fontSize: 15, bold: true, color: C.text });
    s.addText(it.b, { x: 1.62, y: y + 0.6, w: 6.2, h: 0.58, margin: 0, lineSpacing: 18, fontFace: F, fontSize: 11.5, color: C.muted });
  });

  card(s, 8.25, 1.85, 4.35, 4.35, C.tint);
  s.addText("森未来が入ると何が変わるか", { x: 8.6, y: 2.12, w: 3.65, h: 0.34, margin: 0, fontFace: F, fontSize: 15, bold: true, color: C.green });
  s.addText([
    { text: "複数の材木屋・製材所から、仕様ごとに複数案の見積を並べて比較できる", options: { bullet: true, breakLine: true } },
    { text: "一枚板・特殊寸法・長尺なども、全国の在庫データ連携から探索できる", options: { bullet: true, breakLine: true } },
    { text: "商流を短くすることで、都度積まれるバッファを抑えられる", options: { bullet: true, breakLine: true } },
    { text: "カビ・割れ・反りなどのリスクは、事前にご説明と対策を協議", options: { bullet: true, breakLine: true } },
    { text: "調達から加工・施工まで一括で対応（設計段階からのご相談も歓迎）", options: { bullet: true } },
  ], { x: 8.68, y: 2.62, w: 3.62, h: 3.35, margin: 0, fontFace: F, fontSize: 11.5, color: C.text, lineSpacing: 18, paraSpaceAfter: 10 });
  footer(s, 8);
  s.addNotes("Bは御社の本業（賃料・稼働）に直結する話。「デザインが先、環境は後からついてくる」という御社の考え方に沿って説明する。");
}

/* -------------------------------------------- 9. 事例①：既存樹の活用 */
{
  const s = pres.addSlide();
  base(s);
  header(s, "CASE STUDY 01", "その土地の木を、施設に残した事例");

  const cases = [
    {
      ttl: "多摩市立図書館",
      sub: "公園の既存樹（クスノキ）→ キッズコーナーのテーブル",
      b: "建設地の多摩中央公園に元々植生していた既存樹を使ってほしいというオーダー。家具用材としては樹齢も幅も十分ではない木でしたが、特徴を生かし、不揃いでも温かみのあるテーブルに仕上げました。",
      tags: "#公共施設　#既存樹活用　#オーダーメイド",
    },
    {
      ttl: "パークホームズ上板橋",
      sub: "敷地内のケヤキ＋古家の大黒柱 → 家具・不燃突板・アートパネル",
      b: "敷地内の樹木を活用し、古家から大黒柱を回収。大黒柱は木工作家により椅子へ生まれ変わり地主様へ寄贈。共用部家具、不燃突板、フロアサイン、細い樹木を輪切りにして集積したアートパネルにも展開しました。",
      tags: "#土地の記憶　#共用部　#アップサイクル",
    },
  ];
  cases.forEach((c, i) => {
    const x = 0.7 + i * 6.15;
    card(s, x, 1.75, 5.85, 3.95);
    s.addText(c.ttl, { x: x + 0.4, y: 2.05, w: 5.05, h: 0.4, margin: 0, fontFace: F, fontSize: 19, bold: true, color: C.green });
    s.addText(c.sub, { x: x + 0.4, y: 2.52, w: 5.05, h: 0.62, margin: 0, lineSpacing: 19, fontFace: F, fontSize: 12.5, bold: true, color: C.sakura });
    s.addText(c.b, { x: x + 0.4, y: 3.28, w: 5.05, h: 2.2, margin: 0, lineSpacing: 20, fontFace: F, fontSize: 12, color: C.text });
    s.addText(c.tags, { x: x + 0.4, y: 5.05, w: 5.05, h: 0.3, margin: 0, fontFace: F, fontSize: 10.5, color: C.muted });
  });
  footer(s, 9);
}

/* -------------------------------------------- 10. 事例②：使い切る・続ける */
{
  const s = pres.addSlide();
  base(s);
  header(s, "CASE STUDY 02", "一本を使い切る／複数年で続ける事例");

  card(s, 0.7, 1.75, 11.9, 2.15);
  s.addText("（仮称）品川区東五反田五丁目計画", { x: 1.05, y: 2.0, w: 5.0, h: 0.36, margin: 0, fontFace: F, fontSize: 18, bold: true, color: C.green });
  s.addText("地域に愛されたクスノキの大木 → 建材・アート・ウッドデッキ", { x: 1.05, y: 2.42, w: 5.3, h: 0.62, margin: 0, lineSpacing: 19, fontFace: F, fontSize: 12.5, bold: true, color: C.sakura });
  s.addText("幹は木工作家と連携してアート作品に。「すべて無駄にしない」というコンセプトのもと、無垢のまま使用できない枝や根はチップ・木粉にし、建材メーカーと連携して樹脂と混合したウッドデッキを製作しました。", {
    x: 6.6, y: 2.02, w: 5.65, h: 1.6, margin: 0, lineSpacing: 20, fontFace: F, fontSize: 12, color: C.text,
  });

  card(s, 0.7, 4.1, 11.9, 2.15, C.cream);
  s.addText("三井不動産レジデンシャル様「土地の記憶」", { x: 1.05, y: 4.35, w: 5.3, h: 0.36, margin: 0, fontFace: F, fontSize: 18, bold: true, color: C.green });
  s.addText("アップサイクルで土地固有の記憶を未来へつなぐ取り組み", { x: 1.05, y: 4.77, w: 5.3, h: 0.62, margin: 0, lineSpacing: 19, fontFace: F, fontSize: 12.5, bold: true, color: C.sakura });
  s.addText("「元々土地に植わっていた樹木を、建築する物件に使えないか」というご相談から始まったプロジェクト。伐採から竣工まで複数年にわたるため、木材の保管スペースを確保して開始し、現在は複数の物件が同時進行しています。", {
    x: 6.6, y: 4.37, w: 5.65, h: 1.6, margin: 0, lineSpacing: 20, fontFace: F, fontSize: 12, color: C.text,
  });
  footer(s, 10);
  s.addNotes("御社のように複数物件を継続的に開発される事業者との相性がよい形。単発の記念品ではなく、仕組みとして回せることを伝える。");
}

/* -------------------------------------------- 11. 事例③：デザイン・恵比寿 */
{
  const s = pres.addSlide();
  base(s);
  header(s, "CASE STUDY 03", "デザイン性で選ばれた事例と、恵比寿での実績");

  const cases = [
    { ttl: "白樺の内装ディスプレイ", sub: "ウッドデザイン賞（2020年度）受賞", b: "「白樺の森」をコンセプトに、長尺・枝付きの白樺丸太を調達。皮の剥がれやカビのリスクは事前にご説明と対策を協議。従来パルプ等の低付加価値で扱われる白樺に新しい用途をつくりました。" },
    { ttl: "TXアベニュー八潮", sub: "森林ツアー＋家具・内装材の一括対応", b: "丸太の手配から加工・納品、CO2排出を抑える流通ルートのコーディネート、PRポイントのアドバイス、森林ツアーの企画までを担当しました。" },
    { ttl: "恵比寿エリアの店舗", sub: "一枚板カウンター天板・飾り棚", b: "恵比寿の飲食店舗にて、一枚板のカウンター天板と飾り棚を納入。厚み・ハギの有無など複数パターンで見積を並べ、ご予算と意匠の両立を図りました。" },
  ];
  cases.forEach((c, i) => {
    const x = 0.7 + i * 4.05;
    card(s, x, 1.8, 3.75, 3.8, i === 2 ? C.tint : C.cream);
    s.addText(c.ttl, { x: x + 0.35, y: 2.08, w: 3.05, h: 0.7, margin: 0, lineSpacing: 24, fontFace: F, fontSize: 16, bold: true, color: C.green });
    s.addText(c.sub, { x: x + 0.35, y: 2.85, w: 3.05, h: 0.6, margin: 0, lineSpacing: 18, fontFace: F, fontSize: 11.5, bold: true, color: C.sakura });
    s.addText(c.b, { x: x + 0.35, y: 3.55, w: 3.05, h: 2.05, margin: 0, lineSpacing: 19, fontFace: F, fontSize: 11.5, color: C.text });
  });
  footer(s, 11);
}

/* -------------------------------------------- 12. 進め方 */
{
  const s = pres.addSlide();
  base(s);
  header(s, "NEXT STEPS", "進め方：小さく始めて、横に広げる");

  const ph = [
    { p: "STEP 1", t: "現状の棚卸し（1〜2ヶ月）", b: "今後の伐採・剪定・改修の予定を共有いただき、活用可能性のある樹木を洗い出します。現地確認は無償で対応します。", col: C.moss },
    { p: "STEP 2", t: "パイロット実施（3〜6ヶ月）", b: "対象を一本・一箇所に絞り、内装材／家具／ノベルティのいずれかで実装。社内・対外に見せられる実例をつくります。", col: C.sakura },
    { p: "STEP 3", t: "仕組みとして横展開", b: "保有物件や新規開発、札幌・銀座エリアへ。発生する樹木を継続的に受け止める運用に育てます。", col: C.green },
  ];
  ph.forEach((p, i) => {
    const x = 0.7 + i * 4.05;
    card(s, x, 1.9, 3.75, 3.3);
    s.addShape(pres.ShapeType.roundRect, { x: x + 0.35, y: 2.2, w: 1.3, h: 0.36, rectRadius: 0.08, fill: { color: p.col }, line: { width: 0 } });
    s.addText(p.p, { x: x + 0.35, y: 2.2, w: 1.3, h: 0.36, margin: 0, align: "center", valign: "middle", fontFace: F, fontSize: 11, bold: true, color: C.white });
    s.addText(p.t, { x: x + 0.35, y: 2.75, w: 3.05, h: 0.66, margin: 0, lineSpacing: 23, fontFace: F, fontSize: 16, bold: true, color: C.text });
    s.addText(p.b, { x: x + 0.35, y: 3.5, w: 3.05, h: 1.5, margin: 0, lineSpacing: 19, fontFace: F, fontSize: 11.5, color: C.muted });
    if (i < 2) s.addText("▶", { x: x + 3.79, y: 3.35, w: 0.26, h: 0.32, margin: 0, align: "center", valign: "middle", fontFace: F, fontSize: 11, color: C.moss });
  });

  card(s, 0.7, 5.45, 11.9, 1.1, C.tint);
  s.addText("まずはSTEP 1の情報共有からで構いません。ご予定が分かった段階でお声がけいただければ、その時点でできる選択肢をお持ちします。", {
    x: 1.05, y: 5.62, w: 11.2, h: 0.75, margin: 0, valign: "middle", fontFace: F, fontSize: 13, bold: true, color: C.green,
  });
  footer(s, 12);
}

/* -------------------------------------------- 13. 森未来について */
{
  const s = pres.addSlide();
  base(s);
  header(s, "ABOUT US", "株式会社森未来について");

  const stats = [
    { v: "2016年", l: "設立（東京都港区芝）" },
    { v: "約7,000点", l: "eTREE掲載の木材情報" },
    { v: "全国", l: "林業家・製材所・材木屋との連携" },
    { v: "調達〜施工", l: "一括コーディネート対応" },
  ];
  stats.forEach((st, i) => {
    const x = 0.7 + i * 3.0;
    card(s, x, 1.8, 2.75, 1.55, C.cream);
    s.addText(st.v, { x: x + 0.2, y: 2.0, w: 2.35, h: 0.6, margin: 0, align: "center", fontFace: F, fontSize: 24, bold: true, color: C.green });
    s.addText(st.l, { x: x + 0.2, y: 2.62, w: 2.35, h: 0.6, margin: 0, align: "center", lineSpacing: 16, fontFace: F, fontSize: 10.5, color: C.muted });
  });

  card(s, 0.7, 3.6, 5.85, 2.6);
  s.addText("事業内容", { x: 1.05, y: 3.85, w: 5.15, h: 0.32, margin: 0, fontFace: F, fontSize: 15, bold: true, color: C.green });
  s.addText([
    { text: "木材ECプラットフォーム「eTREE」の運営", options: { bullet: true, breakLine: true } },
    { text: "内装・家具什器の木材コーディネート（調達〜加工〜施工）", options: { bullet: true, breakLine: true } },
    { text: "既存樹・伐採材のアップサイクル企画", options: { bullet: true, breakLine: true } },
    { text: "CLTの設計・調達支援、森林認証コンサルティング", options: { bullet: true } },
  ], { x: 1.05, y: 4.28, w: 5.15, h: 1.75, margin: 0, fontFace: F, fontSize: 11.5, color: C.text, lineSpacing: 18, paraSpaceAfter: 8 });

  card(s, 6.75, 3.6, 5.85, 2.6, C.cream);
  s.addText("お取り組みの姿勢", { x: 7.1, y: 3.85, w: 5.15, h: 0.32, margin: 0, fontFace: F, fontSize: 15, bold: true, color: C.green });
  s.addText("ミッションに「Sustainable Forest」を掲げ、木を使うことが森の手入れにつながる循環をつくることを目指しています。合法性の確認（独自のデューデリジェンス）と認証材の取り扱いを前提に、地域材の活用や川上との関係づくりまで含めてご一緒します。", {
    x: 7.1, y: 4.28, w: 5.15, h: 1.75, margin: 0, lineSpacing: 20, fontFace: F, fontSize: 11.5, color: C.text,
  });
  footer(s, 13);
}

/* -------------------------------------------- 14. お打ち合わせのお願い */
{
  const s = pres.addSlide();
  base(s, C.dark);
  s.addShape(pres.ShapeType.ellipse, { x: 10.6, y: -1.4, w: 4.4, h: 4.4, fill: { color: C.green }, line: { width: 0 }, transparency: 40 });
  s.addShape(pres.ShapeType.ellipse, { x: 11.9, y: 5.3, w: 2.3, h: 2.3, fill: { color: C.sakura }, line: { width: 0 }, transparency: 60 });

  s.addText("REQUEST", { x: 0.9, y: 0.65, w: 6, h: 0.3, margin: 0, fontFace: F, fontSize: 12, bold: true, color: C.moss, charSpacing: 2 });
  s.addText("30分、お時間をいただけませんでしょうか", {
    x: 0.9, y: 1.0, w: 10.5, h: 0.55, margin: 0, fontFace: F, fontSize: 28, bold: true, color: C.white,
  });
  s.addText("ご訪問・オンラインいずれでも対応いたします。開発本部の皆様にまとめてご説明する機会でも構いません。", {
    x: 0.9, y: 1.65, w: 10.5, h: 0.35, margin: 0, fontFace: F, fontSize: 13, color: C.moss,
  });

  card(s, 0.9, 2.25, 5.75, 2.45, C.white);
  s.addText("当日のアジェンダ案", { x: 1.25, y: 2.5, w: 5.05, h: 0.32, margin: 0, fontFace: F, fontSize: 15, bold: true, color: C.green });
  s.addText([
    { text: "本ご提案のご説明（10分）", options: { bullet: true, breakLine: true } },
    { text: "恵比寿エリアの樹木の発生状況について（10分）", options: { bullet: true, breakLine: true } },
    { text: "施設木質化のご検討状況・進め方の相談（10分）", options: { bullet: true } },
  ], { x: 1.25, y: 2.95, w: 5.05, h: 1.95, margin: 0, fontFace: F, fontSize: 12, color: C.text, lineSpacing: 19, paraSpaceAfter: 10 });

  card(s, 6.85, 2.25, 5.75, 2.45, C.white);
  s.addText("当日お伺いしたいこと", { x: 7.2, y: 2.5, w: 5.05, h: 0.32, margin: 0, fontFace: F, fontSize: 15, bold: true, color: C.green });
  s.addText([
    { text: "今後1〜2年の開発・改修・剪定伐採のご予定", options: { bullet: true, breakLine: true } },
    { text: "木材利用のご判断軸（意匠・コスト・維持管理）", options: { bullet: true, breakLine: true } },
    { text: "ご相談先として適切な部署・ご担当の方", options: { bullet: true } },
  ], { x: 7.2, y: 2.95, w: 5.05, h: 1.95, margin: 0, fontFace: F, fontSize: 12, color: C.text, lineSpacing: 19, paraSpaceAfter: 10 });

  s.addText([
    { text: "株式会社森未来　高橋 幸司", options: { fontSize: 15, bold: true, color: C.white, breakLine: true } },
    { text: "MAIL koji.takahashi@shin-mirai.co.jp　　MOBILE 080-6997-2075", options: { fontSize: 12, color: C.moss, breakLine: true } },
    { text: "〒108-0014 東京都港区芝5-27-6 泉田町ビル6F　　https://www.etree.jp/", options: { fontSize: 11, color: C.moss } },
  ], { x: 0.9, y: 5.5, w: 10.5, h: 1.2, margin: 0, fontFace: F, lineSpacing: 22 });
  s.addNotes("クロージング。決裁者に対しては「まず情報連携」というハードルの低い依頼にとどめ、部署紹介の依頼も明示的に行う。");
}

const out = process.argv[2] || "proposal.pptx";
pres.writeFile({ fileName: out }).then(() => console.log("written:", out));
