import re

with open('src/App.jsx', 'r', encoding='utf-8') as f:
    app = f.read()

# 1. replace langKeys
app = app.replace("['kjv', 'cuv', 'ko', 'ja', 'fa', 'he', 'es', 'tr', 'de', 'my']", "['kjv', 'cuv', 'cuvs', 'ko', 'ja', 'fa', 'he', 'es', 'tr', 'de', 'my']")
app = app.replace("['kjv', 'cuv', 'ko', 'ja']", "['kjv', 'cuv', 'cuvs', 'ko', 'ja', 'fa', 'he', 'es', 'tr', 'de', 'my']")

# 2. Add cuvs to shouldSplitOnSpace and combined
app = app.replace("const shouldSplitOnSpace = version === 'cuv' || version === 'ko';", "const shouldSplitOnSpace = version === 'cuv' || version === 'cuvs' || version === 'ko';")
app = app.replace("const combined = version === 'cuv'\n                                    ? block.split(/[\\s　]+/).join('')\n                                    : block;", "const combined = (version === 'cuv' || version === 'cuvs')\n                                    ? block.split(/[\\s　]+/).join('')\n                                    : block;")

# 3. Add to dropdown options
app = app.replace('<option value="cuv">中文</option>', '<option value="cuv">繁體中文</option>\n                  <option value="cuvs">简体中文</option>')

# 4. Add to t() function
app = app.replace("if (uiLang === 'my') return 'လှုပ်ရှားမှု';", "if (uiLang === 'my') return 'လှုပ်ရှားမှု';\n      if (uiLang === 'cuvs') return '活动';")
app = app.replace("if (uiLang === 'my') return myDict[zh] || en || zh;", "if (uiLang === 'my') return myDict[zh] || en || zh;\n    if (uiLang === 'cuvs') return zhcnDict[zh] || zh;")
app = app.replace("if (uiLang !== 'zh' && uiLang !== 'cuv') return en || zh;", "if (uiLang !== 'zh' && uiLang !== 'cuv' && uiLang !== 'cuvs') return en || zh;")

# 5. Add cuvs to uiLang fallback
app = app.replace("else if (newVer === 'my') setUiLangPersisted('my');\n    else setUiLangPersisted('zh');", "else if (newVer === 'my') setUiLangPersisted('my');\n    else if (newVer === 'cuvs') setUiLangPersisted('cuvs');\n    else setUiLangPersisted('zh');")

# 6. targetVerses fallback
app = app.replace("if (newVer === 'cuv') targetVerses = loadedLangs['cuv']?.verses || data.verses;", "if (newVer === 'cuv' || newVer === 'cuvs') targetVerses = loadedLangs[newVer]?.verses || data.verses;")

# 7. Add zhcnDict
with open('zhcnDict.json', 'r', encoding='utf-8') as f:
    zhcnDict_content = f.read()

if 'const zhcnDict = {' not in app:
    app = app.replace('const myDict = {', f"const zhcnDict = {zhcnDict_content};\n\nconst myDict = {{")

with open('src/App.jsx', 'w', encoding='utf-8') as f:
    f.write(app)

print("Updated App.jsx successfully!")
