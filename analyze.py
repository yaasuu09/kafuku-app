import csv
import re
from datetime import datetime

# Parse sleep data
def parse_sleep(sleep_str):
    if not sleep_str or "--" in sleep_str:
        return None
    # 睡眠時間: X時間Y分
    m_sleep = re.search(r"睡眠時間:\s*(?:(\d+)時間)?(?:(\d+)分)?", sleep_str)
    m_awake = re.search(r"覚醒:\s*(?:(\d+)時間)?(?:(\d+)分)?", sleep_str)
    m_rem = re.search(r"レム:\s*(?:(\d+)時間)?(?:(\d+)分)?", sleep_str)
    m_core = re.search(r"コア:\s*(?:(\d+)時間)?(?:(\d+)分)?", sleep_str)
    m_deep = re.search(r"深い:\s*(?:(\d+)時間)?(?:(\d+)分)?", sleep_str)
    
    def to_mins(m):
        if not m: return 0
        h = int(m.group(1)) if m.group(1) else 0
        mn = int(m.group(2)) if m.group(2) else 0
        return h * 60 + mn

    return {
        "sleep": to_mins(m_sleep),
        "awake": to_mins(m_awake),
        "rem": to_mins(m_rem),
        "core": to_mins(m_core),
        "deep": to_mins(m_deep)
    }

data = []
with open('/Users/yasu/Documents/KafukuApp/禍福検証 - シート1.csv', 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    for row in reader:
        try:
            date = row.get('タイムスタンプ', '')
            total_score = int(row.get('総合点', 0)) if row.get('総合点', '').isdigit() else None
            work_score = int(row.get('仕事点', 0)) if row.get('仕事点', '').isdigit() else None
            weather = row.get('天気', '')
            commute = row.get('通勤/外出', '')
            
            sleep_raw = row.get('睡眠データ', '')
            sleep_parsed = parse_sleep(sleep_raw)
            
            if total_score is not None:
                data.append({
                    "date": date,
                    "total_score": total_score,
                    "work_score": work_score,
                    "weather": weather,
                    "commute": commute,
                    "sleep": sleep_parsed
                })
        except Exception as e:
            continue

# Analysis 1: Sleep time vs Total Score
print("--- Sleep Data vs Scores ---")
sleep_groups = {"<6h": [], "6-7h": [], "7-8h": [], ">8h": []}
for d in data:
    if d['sleep']:
        mins = d['sleep']['sleep']
        score = d['total_score']
        if mins < 360: sleep_groups["<6h"].append(score)
        elif mins < 420: sleep_groups["6-7h"].append(score)
        elif mins < 480: sleep_groups["7-8h"].append(score)
        else: sleep_groups[">8h"].append(score)

for k, v in sleep_groups.items():
    avg = sum(v)/len(v) if v else 0
    print(f"{k}: avg score {avg:.1f} (count: {len(v)})")

# Analysis 2: Deep Sleep Ratio vs Total Score
print("\n--- Deep Sleep Ratio vs Scores ---")
deep_groups = {"<10%": [], "10-15%": [], "15-20%": [], ">20%": []}
for d in data:
    if d['sleep'] and d['sleep']['sleep'] > 0:
        ratio = d['sleep']['deep'] / d['sleep']['sleep'] * 100
        score = d['total_score']
        if ratio < 10: deep_groups["<10%"].append(score)
        elif ratio < 15: deep_groups["10-15%"].append(score)
        elif ratio < 20: deep_groups["15-20%"].append(score)
        else: deep_groups[">20%"].append(score)

for k, v in deep_groups.items():
    avg = sum(v)/len(v) if v else 0
    print(f"{k}: avg score {avg:.1f} (count: {len(v)})")

# Analysis 3: Commute vs Scores
print("\n--- Commute Type vs Scores ---")
commute_scores = {}
for d in data:
    c = d['commute']
    if c not in commute_scores: commute_scores[c] = []
    commute_scores[c].append(d['total_score'])

for k, v in commute_scores.items():
    avg = sum(v)/len(v) if v else 0
    print(f"{k}: avg score {avg:.1f} (count: {len(v)})")

# Analysis 4: Weather vs Scores
print("\n--- Weather vs Scores ---")
weather_scores = {}
for d in data:
    w = d['weather']
    if not w: continue
    # simplify weather
    if "雨" in w: cat = "Rainy"
    elif "晴" in w: cat = "Sunny"
    elif "くもり" in w: cat = "Cloudy"
    else: cat = "Other"
    
    if cat not in weather_scores: weather_scores[cat] = []
    weather_scores[cat].append(d['total_score'])

for k, v in weather_scores.items():
    avg = sum(v)/len(v) if v else 0
    print(f"{k}: avg score {avg:.1f} (count: {len(v)})")
