import json

with open('zhcnDict.json', 'r', encoding='utf-8') as f:
    d = json.load(f)

d["舊約"] = "旧约"
d["新約"] = "新约"
d["選擇書卷"] = "选择书卷"

with open('zhcnDict.json', 'w', encoding='utf-8') as f:
    json.dump(d, f, ensure_ascii=False, indent=2)

print("zhcnDict updated")
