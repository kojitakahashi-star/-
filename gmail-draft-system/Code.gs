/**
 * D列のチェックボックスがONになったら、Geminiで企業・担当者をリサーチしたうえで
 * Gmailの下書きを自動作成する。
 *
 * 事前準備：Apps Scriptの「プロジェクトの設定」>「スクリプト プロパティ」に
 * GEMINI_API_KEY(Google AI StudioなどのGemini APIキー)を設定しておくこと。
 */
function createDraftOnEdit(e) {
  if (!e) return;

  const sheet = e.source.getActiveSheet();
  const range = e.range;

  // 対象のシート名を指定（今回は「送信リスト」）
  if (sheet.getName() !== "送信リスト") return;

  // D列（4列目：チェックボックス）が編集され、かつチェックがON（true）になった場合
  if (range.getColumn() === 4 && range.getValue() === true) {
    const row = range.getRow();

    // 1行目（見出し）の場合は何もしない
    if (row === 1) return;

    // A〜C列のデータを取得
    const companyName = sheet.getRange(row, 1).getValue();
    const personName = sheet.getRange(row, 2).getValue();
    const email = sheet.getRange(row, 3).getValue();

    // すでに作成済みの場合はスキップ
    const status = sheet.getRange(row, 5).getValue();
    if (status === "作成済み") {
      range.setValue(false); // チェックを外して終了
      return;
    }

    if (!companyName || !personName || !email) return;

    try {
      // Geminiで会社名・担当者名をリサーチし、件名フレーズと本文中盤を生成させる
      const researched = researchWithGemini(companyName, personName);

      // ▼ 件名（「相談」という言葉を使わずに生成）
      const subject = `【${companyName}・${personName}様】${researched.subjectPhrase}　森未来/髙橋`;

      // ▼ 本文（冒頭の挨拶と日程調整リンクは固定、中盤のみリサーチ結果で差し替え）
      const body = buildEmailBody(companyName, personName, researched.middleBody);

      // Gmailの下書きを作成（Ccにマーケティングアドレスを指定）
      GmailApp.createDraft(
        email,
        subject,
        body,
        { cc: "marketing@shin-mirai.co.jp" }
      );

      // E列に「作成済み」と入力し、チェックボックスのチェックを外す
      sheet.getRange(row, 5).setValue("作成済み");
      range.setValue(false);

    } catch (error) {
      // エラーが起きた場合はステータスにエラー内容を記載
      sheet.getRange(row, 5).setValue("エラー: " + error.message);
      range.setValue(false);
    }
  }
}

/**
 * 冒頭の挨拶文と末尾の日程調整リンクは固定文。
 * researchedMiddleBody（Geminiのリサーチ結果に基づく中盤）のみを差し替える。
 */
function buildEmailBody(companyName, personName, researchedMiddleBody) {
  return `${companyName}
${personName}様

お世話になっております。
株式会社森未来の高橋です。
${researchedMiddleBody}

30分から1時間程度、ご訪問またはオンラインでお時間をいただくことは可能でしょうか。
日程調整のリンクを2つご用意しております。
下記のリンク1・リンク2のどちらからでもご予約いただけますので、ご都合のよい日時をお選びいただけますと幸いです。

リンク1：https://calendar.app.google/uMg6sUAPWo4Jidts6
リンク2：https://calendar.app.google/4ingyZZWjcVKX6Pa6

大変ご多用のところ恐れ入りますが、ご検討いただけますと幸いです。

よろしくお願いいたします。`;
}

/**
 * Gemini APIに会社名・担当者名を渡し、Web検索を使ってリサーチさせたうえで
 * 件名フレーズと本文中盤を生成させる。
 */
function researchWithGemini(companyName, personName) {
  const apiKey = PropertiesService.getScriptProperties().getProperty("GEMINI_API_KEY");
  if (!apiKey) {
    throw new Error("GEMINI_API_KEYが未設定です。スクリプトプロパティに設定してください。");
  }

  const prompt = `あなたは法人営業のメール文面作成アシスタントです。
まずWeb検索を使って、以下の会社・担当者について公開情報をリサーチしてください。

会社名：${companyName}
担当者名：${personName}様

リサーチ結果を踏まえて、貴社が手がける空間デザイン・内装・インテリアにおける木材活用について情報交換を打診する営業メールの一部を作成してください。

【必ず守ること】
- 「相談」という言葉は件名にも本文にも使わないこと
- 署名は書かないこと(メール側で別途付与するため)
- 敬体(です・ます調)で書くこと
- 会社・担当者の公開情報が見つからない場合は、一般的な業界動向を踏まえた無難な内容にすること

【出力する2つの要素】
1. 件名に使う20〜30字程度のフレーズ(会社名・担当者名は含めない)
2. 本文の中盤にあたる2〜3段落。以下を必ず含める。
   - 貴社の事業内容や特徴に触れつつ、貴社が手がける空間デザイン・インテリアにおける木材活用について情報交換したい旨
   - 弊社(株式会社森未来)が、開発行為で発生する伐採樹木の引き取り・製材・乾燥・家具什器造作の納品まで手掛けていること、不燃仕上げや加工の実現方法、職人との協働による空間づくり、営業時の木材を使ったコンセプト作りの壁打ちから積算・見積もりの効率化・適切な商品選定支援、全国の地域材調達から加工・製作納品までの一貫対応を行っていること
   - ${personName}様のお取り組みや木材活用における課題を伺いながら、お役に立てる点があればと考えている旨

【出力形式】
説明や前置きは一切書かず、以下の形式のみで出力すること。
[SUBJECT]ここに件名フレーズ[/SUBJECT]
[BODY]ここに本文中盤[/BODY]`;

  const requestBody = {
    contents: [{ parts: [{ text: prompt }] }],
    tools: [{ google_search: {} }]
  };

  // モデル名は利用可能なGeminiモデルに合わせて変更可
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  const response = UrlFetchApp.fetch(url, {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(requestBody),
    muteHttpExceptions: true
  });

  const responseCode = response.getResponseCode();
  const responseText = response.getContentText();

  if (responseCode !== 200) {
    throw new Error(`Gemini APIエラー(${responseCode}): ${responseText}`);
  }

  const json = JSON.parse(responseText);
  const parts = json.candidates && json.candidates[0] && json.candidates[0].content
    ? json.candidates[0].content.parts
    : [];
  const generatedText = parts.map(p => p.text || "").join("");

  const subjectMatch = generatedText.match(/\[SUBJECT\]([\s\S]*?)\[\/SUBJECT\]/);
  const bodyMatch = generatedText.match(/\[BODY\]([\s\S]*?)\[\/BODY\]/);

  if (!subjectMatch || !bodyMatch) {
    throw new Error("Geminiからの応答を解析できませんでした: " + generatedText);
  }

  return {
    subjectPhrase: subjectMatch[1].trim(),
    middleBody: bodyMatch[1].trim()
  };
}
