import re
from opencc import OpenCC

cc = OpenCC('t2s')

with open('src/bibleDictionary.js', 'r', encoding='utf-8') as f:
    content = f.read()

def replacer(match):
    full_str = match.group(0)
    names_match = re.search(r'names:\s*\["([^"]+)",\s*"([^"]+)"', full_str)
    if names_match:
        full_name = names_match.group(1)
        abbr_name = names_match.group(2)
        full_cn = cc.convert(full_name)
        abbr_cn = cc.convert(abbr_name)
        # add cn: ["full_cn", "abbr_cn"]
        if "cn:" not in full_str:
            new_str = full_str.replace('}', f', cn: ["{full_cn}", "{abbr_cn}"] }}')
            return new_str
    return full_str

new_content = re.sub(r'\{ id: \d+, testament:.*\}', replacer, content)

with open('src/bibleDictionary.js', 'w', encoding='utf-8') as f:
    f.write(new_content)

print("bibleDictionary patched!")
