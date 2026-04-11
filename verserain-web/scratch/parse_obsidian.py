import json
import re

file_path = '/Users/davidhwang/Obsidian-vaults/DavidHwang-remoteVault/互惠經濟 重要經文（KJV）.md'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

verses = []
# Find all verses starting with ### and ending before the next ### or --- or Quick Index
sections = re.split(r'### \d+\.', content)
# The first section is preamble
for section in sections[1:]:
    lines = section.strip().split('\n')
    header_line = lines[0].strip()
    
    # Header format: Reference — Title
    header_match = re.match(r'(.*?)\s+—\s+(.*)', header_line)
    if not header_match:
        continue
        
    reference = header_match.group(1).strip()
    title = header_match.group(2).strip()
    
    text_lines = []
    for line in lines[1:]:
        line = line.strip()
        if line.startswith('>'):
            text_lines.append(line.lstrip('>').strip())
        elif line.startswith('---') or line.startswith('##') or line.startswith('|'):
            break
    
    verse_text = ' '.join(text_lines)
    if reference and title and verse_text:
        verses.append({
            "reference": reference,
            "title": title,
            "text": verse_text
        })

new_set = {
    "id": "mutualized-economy-main-kjv",
    "title": "Mutualized Economy main verses (KJV)",
    "description": "30 Core Scriptures ranked by relevance to the Mutualized Economy framework.",
    "verses": verses
}

print(json.dumps(new_set, indent=2, ensure_ascii=False))
