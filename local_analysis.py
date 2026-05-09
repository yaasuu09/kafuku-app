import urllib.request
import json
import os
import sys

print("========================================")
print(" 🔮 KafukuApp AI Analysis (ローカル専用)")
print("========================================\n")

# frontend/.env から GAS URL を取得
env_file = os.path.join(os.path.dirname(__file__), "frontend", ".env")
gas_url = None
if os.path.exists(env_file):
    with open(env_file, "r") as f:
        for line in f:
            if line.startswith("VITE_GAS_URL="):
                gas_url = line.strip().split("=", 1)[1]
                break

if not gas_url:
    print("エラー: frontend/.env に VITE_GAS_URL が見つかりません。")
    sys.exit(1)

print("🔄 スプレッドシートから最新データを取得中...")
try:
    req = urllib.request.Request(gas_url)
    with urllib.request.urlopen(req) as response:
        gas_data = json.loads(response.read().decode())
        if gas_data.get("status") != "success" or "data" not in gas_data:
            print("データの取得に失敗しました。")
            sys.exit(1)
        rows = gas_data["data"]
        # CSV文字列に変換
        csv_text = "\n".join([",".join([str(item).replace(",", "，") for item in row]) for row in rows])
except Exception as e:
    print(f"スプレッドシート通信エラー: {e}")
    sys.exit(1)

print("✨ データ取得完了！Ollamaに分析を依頼しています...\n")
print("-" * 50 + "\n")

prompt = f"""あなたはデータアナリストです。このデータ分析の最大の目的は「禍福は糾える縄の如し」というジンクスを検証することです。
ユーザーは以下の仮説を持っています。
・朝（会社や目的地に着くまで）に電車の遅延、雨、不快な出来事など嫌なことがあると、その日は結果的に良いことが起きて総合点が高くなる。
・逆に朝が何事もなく平穏すぎると、その後（仕事や外出先で）嫌なことが起きて総合点が下がる。

以下の生活記録（CSVデータ）を分析し、この「1日の中での運のバランス」が実際にデータとして成り立っているかどうかを客観的に検証してください。
無理な忖度やデータにない捏造はせず、相関が見られない場合は「相関なし」と事実をはっきりと伝えてください。
なお、冷酷になりすぎる必要はありません。日記の記載内容なども踏まえつつ、ユーザーのジンクス検証に寄り添った分析結果を出力してください。

【データ】
{csv_text}
"""

ollama_url = "http://127.0.0.1:11434/api/generate"
payload = {
    "model": "gemma4:e4b",
    "prompt": prompt,
    "stream": True
}

try:
    req = urllib.request.Request(
        ollama_url,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST"
    )
    with urllib.request.urlopen(req) as response:
        for line in response:
            if line:
                data = json.loads(line.decode("utf-8"))
                sys.stdout.write(data.get("response", ""))
                sys.stdout.flush()
                if data.get("done"):
                    break
    print("\n\n" + "-" * 50)
    print("✅ 分析が完了しました。")
except Exception as e:
    print(f"\nOllama通信エラー: {e}")
    print("Ollamaアプリが起動しているか確認してください。")
