import json

with open('verses_kjv.js', 'r', encoding='utf-8') as f:
    orig = f.read()

with open('sidroth.json', 'r', encoding='utf-8') as f:
    sid_data = f.read()

# Replace empty array
orig = orig.replace("verses: [] // Empty", f"verses: {sid_data} //")

with open('verses_kjv.js', 'w', encoding='utf-8') as f:
    f.write(orig)
