import json
import zhconv

# Read one of the dictionaries from create_dicts.py or directly translate keys from the source code.
# The source code has myDict inside App.jsx. Let's just extract it and translate the keys.
import re

with open('src/App.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Extract keys from myDict
myDict_match = re.search(r'const myDict = (\{.*?\});', content, re.DOTALL)
if myDict_match:
    myDict_str = myDict_match.group(1)
    
    # Simple regex to get all string keys
    keys = re.findall(r'"([^"]+)":', myDict_str)
    
    zhcnDict = {}
    for k in keys:
        zhcnDict[k] = zhconv.convert(k, 'zh-cn')
        
    with open('zhcnDict.json', 'w', encoding='utf-8') as f:
        json.dump(zhcnDict, f, ensure_ascii=False, indent=2)
    print("Created zhcnDict.json with", len(keys), "entries")
else:
    print("Could not find myDict")
