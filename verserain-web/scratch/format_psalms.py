import json

with open('/Users/davidhwang/Projects/VerseRain/VerseScramble/verserain-web/scratch/psalms_kjv.json', 'r') as f:
    lines = f.readlines()
    # Find where the JSON starts
    json_str = ""
    started = False
    for line in lines:
        if line.strip() == "[":
            started = True
        if started:
            json_str += line
    psalms = json.loads(json_str)

with open('/Users/davidhwang/Projects/VerseRain/VerseScramble/verserain-web/scratch/missing_psalms.json', 'r') as f:
    lines = f.readlines()
    json_str = ""
    started = False
    for line in lines:
        if line.strip() == "[":
            started = True
        if started:
            json_str += line
    missing = json.loads(json_str)

# Map everything
all_psalms = {p['reference']: p for p in psalms}
for p in missing:
    all_psalms[p['reference']] = p

# Sort numerically
sorted_psalms = []
for i in range(1, 42):
    ref = f"Psalm {i}"
    if ref in all_psalms:
        sorted_psalms.append(all_psalms[ref])
    else:
        print(f"Warning: {ref} still missing!")

print("    {")
print('        id: "psalms-1-41",')
print('        title: "Psalm 1-41",')
print('        description: "Psalms 1 to 41 (KJV) - One chapter per game session.",')
print('        verses: [')

for p in sorted_psalms:
    print('            {')
    print(f'                reference: "{p["reference"]}",')
    print(f'                title: "{p["title"]}",')
    print(f'                text: "{p["text"]}"')
    print('            },')

print('        ]')
print('    },')
