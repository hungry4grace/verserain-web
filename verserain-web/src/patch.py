import json

with open('verses.js', 'r', encoding='utf-8') as f:
    orig = f.read()

with open('sidroth.json', 'r', encoding='utf-8') as f:
    sidroth_json = f.read()

array_content = orig[orig.find('[')+1 : orig.rfind(']')]

new_content = f"""export const VERSE_SETS = [
    {{
        id: "mutualized-economics",
        title: "互惠經濟 重要經文",
        description: "關於上帝的形像與管家職分、禧年與重置機制等核心原則。",
        verses: [
            {array_content.strip()}
        ]
    }},
    {{
        id: "sid-roth-healing",
        title: "醫治的默想經文",
        description: "Sid Roth：我發現醫治和信心對很多的基督徒來說就像奧秘一般。雖然有許多的書在討論這個主題，但它們仍然是教許多人困惑。我在40年前，開始我自己的研經。我發現最好的就是我自己研讀整本的聖經...",
        verses: {sidroth_json}
    }}
];

// Fallback for backwards compatibility
export const VERSES_DB = VERSE_SETS[0].verses;
"""

with open('verses.js', 'w', encoding='utf-8') as f:
    f.write(new_content)

print("patched!")
