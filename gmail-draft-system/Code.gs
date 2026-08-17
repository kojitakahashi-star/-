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

    if (companyName && personName && email) {
      // ▼ 件名（「相談」という言葉を使わずに生成）
      const subject = `【${companyName}・${personName}様】空間デザイン・内装における木材活用に関する情報交換のお願い　森未来/髙橋`;

      // ▼ 本文（署名なし・パターン2ベースの標準文章）
      const body = `${companyName}\n${personName}様\n\nお世話になっております。\n株式会社森未来の高橋です。\n突然のご連絡を大変失礼いたします。\n\nこの度は、貴社が手がけられる空間デザインや内装プロデュースにおける木材活用について、ぜひ一度情報交換のお時間をいただけないかと思い、ご連絡いたしました。\n\n弊社では、内装における木材利用に関して、不燃仕上げや加工の実現方法、職人との協働による空間づくりなどをテーマに取り組んでおります。また、営業時の木材を使ったコンセプト作りの壁打ちから設計段階における積算・見積もりの効率化や、適切な商品選定のご支援なども行っております。さらに、全国の地域材の調達から加工工程の商流構築、そして製作納品まで一貫して手掛けております。\n\n${personName}様におけるお取り組みや、木材活用にあたってのお困りごとなどをお伺いしながら、何かお役に立てる点があればと考えております。\n\n30分から1時間程度、ご訪問またはオンラインでお時間をいただくことは可能でしょうか。\n日程調整のリンクを2つご用意しております。\n下記のリンク1・リンク2のどちらからでもご予約いただけますので、ご都合のよい日時をお選びいただけますと幸いです。\n\nリンク1：https://calendar.app.google/uMg6sUAPWo4Jidts6\nリンク2：https://calendar.app.google/4ingyZZWjcVKX6Pa6\n\n大変ご多用のところ恐れ入りますが、ご検討いただけますと幸いです。\n\nよろしくお願いいたします。`;

      try {
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
}
