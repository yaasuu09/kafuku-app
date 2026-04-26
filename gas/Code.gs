function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    
    if (data.action === "analyze") {
      return handleAnalyzeRequest();
    }
    
    if (data.action === "recover_sleep_data") {
      return handleRecoverSleepData(data);
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

    let sleepDataStr = "";
    if (data.sleepImage) {
      sleepDataStr = analyzeSleepImage(data.sleepImage);
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
    
    // 成功レスポンスを返す
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
  
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`;
  
  // Base64文字列から "data:image/jpeg;base64," 等のヘッダー部分を削除して純粋なBase64データにする
  const base64Data = base64Image.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, "");
  
  const payload = {
    "contents": [{
      "parts": [
        {"text": "このApple Watchの睡眠データのスクリーンショットから画像内の数値を正確に読み取ってください。以下の形式でテキストとして改行区切りで出力してください：\n総睡眠時間: 〇時間〇分\n覚醒: 〇分\nレム: 〇時間〇分\nコア: 〇時間〇分\n深い: 〇時間〇分\n\n見えない項目は「不明」としてください。余計な文章は不要です。"},
        {
          "inlineData": {
            "mimeType": "image/jpeg", // フロントからjpeg等で送る想定
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

// ==========================================
// LINE 通知設定
// ==========================================
const LINE_CHANNEL_ACCESS_TOKEN = "BMOb/yCYgM8HHMxlKxbVSjzBR1hFtG9M80G/tjojWALTEh2k15HYF2r9/zTVMlxJGjNqdeKrNMG+qeDXv/EJzgD6obGX+BG18irEC1aXehGbeJUQTAi6FGYkVQIqRazGh1/jMf+qYIgrs6SaKEQ/JAdB04t89/1O/w1cDnyilFU=";
const LINE_USER_ID = "U73b50922b673ac1c05e256c7e4f94bb7";
// Vercelで発行されるURLをここに入れます
const APP_URL = "https://kafuku-app.vercel.app"; // 仮のURLを設定（あとで変更可能）

/**
 * LINEにリマインダーを送信する関数
 */
function sendLineReminder() {
  const url = "https://api.line.me/v2/bot/message/push";
  
  const payload = {
    "to": LINE_USER_ID,
    "messages": [
      {
        "type": "text",
        "text": "📅 今日のジンクス記録の時間です！\n今日の体感スコアや睡眠データ（スクショ）を入力しましょう👇\n" + APP_URL
      }
    ]
  };

  const options = {
    "method": "post",
    "headers": {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + LINE_CHANNEL_ACCESS_TOKEN
    },
    "payload": JSON.stringify(payload)
  };

  try {
    UrlFetchApp.fetch(url, options);
    Logger.log("リマインダーを送信しました");
  } catch (e) {
    Logger.log("LINE送信エラー: " + e.message);
  }
}

/**
 * 毎日22:30にリマインダーを送信する仕組みをセットアップする関数
 * （GASエディタから手動で1回だけ実行します）
 */
function setupDailyTriggers() {
  // 既存のすべてのトリガーを削除
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => {
    ScriptApp.deleteTrigger(trigger);
  });
  
  // 毎日深夜（1時〜2時の間）に、その日の22:30のトリガーを仕掛けるトリガーを作成
  ScriptApp.newTrigger("scheduleTodayReminder")
    .timeBased()
    .atHour(1)
    .everyDays(1)
    .create();
    
  // 今日分の22:30トリガーをすぐに設定
  scheduleTodayReminder();
  
  Logger.log("毎日のトリガー準備を設定完了しました。毎日22:30にLINE通知が届くようになります。");
}

/**
 * 毎日深夜に実行され、その日の22:30にLINE通知を実行するトリガーを作成します
 */
function scheduleTodayReminder() {
  // すでにある "sendLineReminder" の一時トリガー（昨日の残りなど）を整理のため削除
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => {
    if (trigger.getHandlerFunction() === "sendLineReminder") {
      ScriptApp.deleteTrigger(trigger);
    }
  });

  const date = new Date();
  date.setHours(22);
  date.setMinutes(30);
  date.setSeconds(0);
  
  // 現在時刻よりも後であればトリガーをセット（過去にならないよう防止）
  if (date.getTime() > new Date().getTime()) {
    ScriptApp.newTrigger("sendLineReminder")
      .timeBased()
      .at(date)
      .create();
    Logger.log("今日の " + date.toString() + " に通知をセットしました");
  } else {
    Logger.log("既に22:30を過ぎているため、本日の通知トリガーはセットしません");
  }
}

// ==========================================
// AI ダッシュボード分析機能
// ==========================================

function handleAnalyzeRequest() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("Data") || ss.getSheets()[0];
  const lastRow = sheet.getLastRow();
  
  if (lastRow <= 1) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "データがありません。" })).setMimeType(ContentService.MimeType.JSON);
  }
  
  // 直近30件のデータを取得
  const startRow = Math.max(2, lastRow - 29);
  const numRows = lastRow - startRow + 1;
  const dataRange = sheet.getRange(startRow, 1, numRows, sheet.getLastColumn());
  const data = dataRange.getValues();
  
  // データをAI向けに整形
  let dataPrompt = "【過去直近の記録データ】\n";
  data.forEach(row => {
    // 0:タイムスタンプ, 1:総合点, 2:仕事点, 3:天気, 7:行き遅延, 10:帰り遅延, 11:不快なこと, 13:睡眠データ
    dataPrompt += `・${row[0]}: 総合${row[1]}点, 仕事${row[2]}点, 天気(${row[3]}), 行き遅延(${row[7]}), 帰り遅延(${row[10]}), 不快なこと(${row[11]}), 睡眠(${row[13]})\n`;
  });
  
  // 要件に合わせたプロンプト（禍福の検証）
  const prompt = `あなたはユーザーの毎日のメンタルやパフォーマンスをサポートする専属アシスタントです。いつも通りの親しみやすく温かい口調で話しかけてください！

このアプリは「禍福は糾える縄の如し（嫌なことがあった後には良いことが起こるかもしれない）」というジンクスを検証するために作られています。
以下の直近約1ヶ月の記録データを分析して、レポートを作成してください。

【分析のポイント】
- 最大の目的は「朝の通勤で遅延や不快な出来事があった日」や「天気が悪かった日」に、逆に「その日の仕事点や総合点が高くなっているか？」という『禍福のジンクス』が成立しているかを検証することです。
- 単純に「通勤が混雑していたからスコアが低いですね」という当たり前の相関を指摘するのではなく、「嫌なことがあった日ほど、意外と良い日になっていないか？」という視点でデータを掘り下げてください。
- もちろん、データにない関連性を勝手に捏造したり、無理にジンクスを肯定するのは絶対にやめてください。「ジンクス通りになってますね！」あるいは「今のところジンクス通りにはなっておらず、嫌なことがあると普通にスコアも下がってますね（笑）」など、事実を正直に伝えてください。
- 「睡眠データ」がスコアに与える影響もあれば、サブ要素として客観的に教えてください。
- アドバイスというよりは、「今月はこんな傾向がありましたよ」と、一緒にジンクスを検証して楽しむようなトーンでお願いします。
- Markdown形式で見やすく整理してください。

${dataPrompt}`;

  const apiKey = PropertiesService.getScriptProperties().getProperty("GEMINI_API_KEY");
  if (!apiKey) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "APIキーが設定されていません。" })).setMimeType(ContentService.MimeType.JSON);
  }
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`;
  const payload = {
    "contents": [{"parts": [{"text": prompt}]}],
    "generationConfig": {
        "temperature": 0.2
    }
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
      const report = json.candidates[0].content.parts[0].text.trim();
      return ContentService.createTextOutput(JSON.stringify({ status: "success", report: report })).setMimeType(ContentService.MimeType.JSON);
    } else {
      const errorDetail = json.error ? json.error.message : response.getContentText();
      return ContentService.createTextOutput(JSON.stringify({ status: "error", message: `AIからの応答が得られませんでした。詳細: ${errorDetail}` })).setMimeType(ContentService.MimeType.JSON);
    }
  } catch(e) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "分析エラーが発生しました: " + e.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}

// ==========================================
// 過去データの睡眠データ一括修復機能
// ==========================================

function analyzeSleepImageWithDate(base64Image) {
  const apiKey = PropertiesService.getScriptProperties().getProperty("GEMINI_API_KEY");
  if (!apiKey) return JSON.stringify({ error: "API Key not set" });
  
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`;
  const base64Data = base64Image.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, "");
  
  const payload = {
    "contents": [{
      "parts": [
        {"text": "このApple Watchの睡眠データのスクリーンショットから、左上などに記載されている「対象の日付（例：4月25日）」と、各種睡眠の数値を正確に読み取ってください。\n\n現在は2026年です。以下のJSON形式のみで出力してください。マークダウン(```json等)は絶対に含めないでください。純粋なJSON文字列だけを返してください。\n\n{\n  \"date\": \"2026-04-25\",\n  \"text\": \"総睡眠時間: 〇時間〇分\\n覚醒: 〇分\\nレム: 〇時間〇分\\nコア: 〇時間〇分\\n深い: 〇時間〇分\"\n}\n\n見えない項目は「不明」としてください。" },
        {
          "inlineData": {
            "mimeType": "image/jpeg",
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
      let resultText = json.candidates[0].content.parts[0].text.trim();
      resultText = resultText.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
      return resultText;
    } else {
      return JSON.stringify({ error: "解析エラー: " + response.getContentText() });
    }
  } catch(e) {
    return JSON.stringify({ error: "解析エラー: " + e.toString() });
  }
}


function handleRecoverSleepData(data) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName("Data") || ss.getSheets()[0];
    const lastRow = sheet.getLastRow();
    
    if (lastRow <= 1) {
      return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "データがありません。" })).setMimeType(ContentService.MimeType.JSON);
    }
    
    if (!data.sleepImage) {
      return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "画像データが不足しています。" })).setMimeType(ContentService.MimeType.JSON);
    }
    
    // AIで画像から日付とテキストを読み取る
    const aiResultStr = analyzeSleepImageWithDate(data.sleepImage);
    let aiResult;
    try {
      aiResult = JSON.parse(aiResultStr);
    } catch(e) {
      return ContentService.createTextOutput(JSON.stringify({ status: "error", message: `AIの応答を解析できませんでした。JSONパース失敗: ${aiResultStr}` })).setMimeType(ContentService.MimeType.JSON);
    }
    
    if (aiResult.error) {
      return ContentService.createTextOutput(JSON.stringify({ status: "error", message: `AIエラー: ${aiResult.error}` })).setMimeType(ContentService.MimeType.JSON);
    }
    
    const targetDate = aiResult.date; // e.g., "2026-04-25"
    const sleepDataStr = aiResult.text;
    
    if (!targetDate || !sleepDataStr) {
      return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "画像から日付または睡眠データを読み取れませんでした。" })).setMimeType(ContentService.MimeType.JSON);
    }

    // タイムスタンプ列（A列）を取得して日付を検索
    const timestamps = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    let targetRow = -1;
    for (let i = 0; i < timestamps.length; i++) {
      if (String(timestamps[i][0]).includes(targetDate)) {
        targetRow = i + 2; // 1-indexed, starting from row 2
        break;
      }
    }
    
    if (targetRow === -1) {
      return ContentService.createTextOutput(JSON.stringify({ status: "error", message: `${targetDate} (画像から抽出) の記録がスプレッドシートに見つかりません。` })).setMimeType(ContentService.MimeType.JSON);
    }
    
    // 睡眠データ列（14列目/N列）を上書き
    sheet.getRange(targetRow, 14).setValue(sleepDataStr);
    
    return ContentService.createTextOutput(JSON.stringify({ status: "success", message: `${targetDate} のデータを修復しました。`, result: sleepDataStr })).setMimeType(ContentService.MimeType.JSON);
    
  } catch(e) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "修復処理中にエラーが発生しました: " + e.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}
