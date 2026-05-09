import csv
import re

def parse_sleep(sleep_str):
    if not sleep_str or "--" in sleep_str: return None
    m_sleep = re.search(r"睡眠時間:\s*(?:(\d+)時間)?(?:(\d+)分)?", sleep_str)
    def to_mins(m):
        if not m: return 0
        h = int(m.group(1)) if m.group(1) else 0
        mn = int(m.group(2)) if m.group(2) else 0
        return h * 60 + mn
    return {"sleep": to_mins(m_sleep)}

data = []
with open('/Users/yasu/Documents/KafukuApp/禍福検証 - シート1.csv', 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    for row in reader:
        try:
            total_score = int(row.get('総合点', 0)) if row.get('総合点', '').isdigit() else None
            work_score = int(row.get('仕事点', 0)) if row.get('仕事点', '').isdigit() else None
            commute = row.get('通勤/外出', '')
            sleep_parsed = parse_sleep(row.get('睡眠データ', ''))
            
            if work_score is not None:
                data.append({
                    "total_score": total_score,
                    "work_score": work_score,
                    "commute": commute,
                    "sleep": sleep_parsed
                })
        except:
            continue

print("--- Sleep vs Work Score ---")
sleep_groups = {"6-7h": [], "7-8h": [], ">8h": []}
for d in data:
    if d['sleep']:
        mins = d['sleep']['sleep']
        score = d['work_score']
        if mins < 420: sleep_groups["6-7h"].append(score)
        elif mins < 480: sleep_groups["7-8h"].append(score)
        else: sleep_groups[">8h"].append(score)

for k, v in sleep_groups.items():
    avg = sum(v)/len(v) if v else 0
    print(f"{k}: avg work score {avg:.1f} (count: {len(v)})")

print("\n--- Commute vs Work Score ---")
commute_scores = {}
for d in data:
    c = d['commute']
    if c not in commute_scores: commute_scores[c] = []
    commute_scores[c].append(d['work_score'])

for k, v in commute_scores.items():
    avg = sum(v)/len(v) if v else 0
    print(f"{k}: avg work score {avg:.1f} (count: {len(v)})")

