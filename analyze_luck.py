import csv

data = []
with open('/Users/yasu/Documents/KafukuApp/禍福検証 - シート1.csv', 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    for row in reader:
        try:
            work_score = int(row.get('仕事点', 0)) if row.get('仕事点', '').isdigit() else None
            if work_score is None: continue
            
            weather = row.get('天気', '')
            is_rain = '雨' in weather
            
            # delays
            d1 = row.get('行き遅延', '')
            d2 = row.get('帰り遅延', '')
            has_delay = False
            if ('分' in d1 and 'なし' not in d1) or ('分' in d2 and 'なし' not in d2):
                has_delay = True
                
            unpleasant = row.get('不快なこと', '').strip()
            has_unpleasant = len(unpleasant) > 0 and unpleasant != 'なし'
            
            # Also calculate "any bad luck"
            has_bad_luck = is_rain or has_delay or has_unpleasant
            
            data.append({
                'work_score': work_score,
                'is_rain': is_rain,
                'has_delay': has_delay,
                'has_unpleasant': has_unpleasant,
                'has_bad_luck': has_bad_luck
            })
        except Exception as e:
            continue

def print_stats(name, key):
    true_scores = [d['work_score'] for d in data if d[key]]
    false_scores = [d['work_score'] for d in data if not d[key]]
    
    t_avg = sum(true_scores)/len(true_scores) if true_scores else 0
    f_avg = sum(false_scores)/len(false_scores) if false_scores else 0
    
    print(f"--- {name} ---")
    print(f"あり (Count: {len(true_scores)}): {t_avg:.1f}")
    print(f"なし (Count: {len(false_scores)}): {f_avg:.1f}")

print_stats("雨", "is_rain")
print_stats("電車遅延", "has_delay")
print_stats("不快なこと", "has_unpleasant")
print_stats("いずれかの不運（雨・遅延・不快なこと）", "has_bad_luck")

# Top 5 work score days
print("\n--- Top 5 Work Score Days ---")
sorted_data = sorted(data, key=lambda x: x['work_score'], reverse=True)
for i, d in enumerate(sorted_data[:5]):
    print(f"{i+1}. Work Score: {d['work_score']} | Bad Luck: {d['has_bad_luck']} (Rain:{d['is_rain']}, Delay:{d['has_delay']}, Unpleasant:{d['has_unpleasant']})")
