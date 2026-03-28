function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    
    let sleepDataStr = "";
    if (data.sleepImage) {
      sleepDataStr = analyzeSleepImage(data.sleepImage);
    }
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    // デフォルトのシート（一番左）または "Data" というシートを使用
    const sheet = ss.getSheetByName("Data") || ss.getSheets()[0];
    
    // シートが空の場合（行数が0）、ヘッダーを追加
    if (sheet.getLastRow() === 0) {
      sheet.appendRow([
        "タイムスタンプ", "総合点", "仕事点", "天気", 
        "通勤/外出", "行きの座席", "行きの駅", "行き遅延", 
        "帰りの座席", "帰りの駅", "帰り遅延", 
        "不快なこと", "日記", "睡眠データ"
      ]);
    }

    // フォームから送られてきたデータを整形して配列にする
    const row = [
      data.date || new Date().toLocaleString("ja-JP", {timeZone: "Asia/Tokyo"}),
      data.overallScore || "",
      data.workScore || "",
      data.weather || "",
      data.commuteType || "", // 例: "通勤あり", "外出あり", "外出なし"
      data.outboundSat || "",
      data.outboundStation || "",
      data.outboundDelay || "",
      data.inboundSat || "",
      data.inboundStation || "",
      data.inboundDelay || "",
      data.unpleasantEvents || "",
      data.diary || "",
      sleepDataStr
    ];
    
    sheet.appendRow(row);
    
    // 成功レスポンスを返す（React側にCORSとして解釈されないようJSONで返す）
    return ContentService.createTextOutput(JSON.stringify({ status: "success", message: "Data saved successfully." })).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: error.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}

// OPTIONSリクエストを処理し、CORSエラーを回避する
function doOptions(e) {
  return ContentService.createTextOutput("")
    .setMimeType(ContentService.MimeType.JSON)
    .setHeader("Access-Control-Allow-Origin", "*")
    .setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS")
    .setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function analyzeSleepImage(base64Image) {
  // スクリプトプロパティからGemini APIキーを取得
  const apiKey = PropertiesService.getScriptProperties().getProperty("GEMINI_API_KEY");
  if (!apiKey) return "API Key not set: スクリプトプロパティにGEMINI_API_KEYを設定してください";
  
  // Gemini 1.5 Flash（またはPro）のエンドポイント
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
  
  // Base64文字列から "data:image/jpeg;base64," 等のヘッダー部分を削除して純粋なBase64データにする
  const base64Data = base64Image.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, "");
  
  const payload = {
    "contents": [{
      "parts": [
        {"text": "このApple Watchの睡眠データのスクリーンショットから画像内の数値を正確に読み取ってください。以下の形式でテキストとして改行区切りで出力してください：\n総睡眠時間: 〇時間〇分\n覚醒: 〇分\nレム: 〇時間〇分\nコア: 〇時間〇分\n深い: 〇時間〇分\n\n見えない項目は「不明」としてください。余計な文章は不要です。"},
        {
          "inline_data": {
            "mime_type": "image/jpeg", // フロントからjpeg等で送る想定
            "data": base64Data
          }
        }
      ]
    }]
  };
  
  const options = {
    "method": "post",
    "contentType": "application/json",
    "payload": JSON.stringify(payload),
    "muteHttpExceptions": true
  };
  
  try {
    const response = UrlFetchApp.fetch(endpoint, options);
    const json = JSON.parse(response.getContentText());
    
    if (json.candidates && json.candidates.length > 0) {
      return json.candidates[0].content.parts[0].text.trim();
    }
  } catch(e) {
    return "解析エラー: " + e.toString();
  }
  return "解析失敗";
}
