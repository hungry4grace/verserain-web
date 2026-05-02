import json
import zhconv
import os

def convert_js_file(input_file, output_file, var_replacements):
    with open(input_file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Convert traditional to simplified
    simplified_content = zhconv.convert(content, 'zh-cn')
    
    # Replace variable names and other specific identifiers
    for old, new in var_replacements.items():
        simplified_content = simplified_content.replace(old, new)
        
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(simplified_content)

print("Converting verses...")
convert_js_file('src/verses.js', 'src/verses_cuvs.js', {
    "export const VERSE_SETS =": "export const VERSE_SETS_CUVS =",
    "import { VERSE_SETS_KJV } from './verses_kjv';": "",
    "VERSE_SETS_KJV": "[]", # Fallback or remove
    "from './verses_psalms'": "from './verses_psalms_cuvs'",
    "export const VERSE_SETS_PSALMS =": "export const VERSE_SETS_PSALMS_CUVS =",
    "gospel-of-john": "gospel-of-john-cuvs",
    "matthew-core": "matthew-core-cuvs",
    "sunday-school-30": "sunday-school-30-cuvs",
    "economic-awakening-30": "economic-awakening-30-cuvs",
    "healing-verses": "healing-verses-cuvs",
    "rain-verses": "rain-verses-cuvs"
})

print("Converting psalms...")
convert_js_file('src/verses_psalms.js', 'src/verses_psalms_cuvs.js', {
    "PSALMS_1_41": "PSALMS_1_41_CUVS",
    "PSALMS_42_72": "PSALMS_42_72_CUVS",
    "PSALMS_73_89": "PSALMS_73_89_CUVS",
    "PSALMS_90_106": "PSALMS_90_106_CUVS",
    "PSALMS_107_150": "PSALMS_107_150_CUVS"
})

print("Converting proverbs...")
convert_js_file('src/verses_proverbs.js', 'src/verses_proverbs_cuvs.js', {
    "export const VERSE_SETS_PROVERBS_ZH =": "export const VERSE_SETS_PROVERBS_CUVS =",
    "proverbs-zh": "proverbs-cuvs"
})

print("Done generating JS files!")
