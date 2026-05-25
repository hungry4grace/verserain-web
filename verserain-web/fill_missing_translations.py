"""
找出每個語言字典中缺少的 UI 字串，翻譯後注入到 App.jsx。
"""
import re, json, time, urllib.request, urllib.parse

APP_PATH = "/Users/davidhwang/Projects/verserain-web/verserain-web/src/App.jsx"

# (app語言代碼, Google Translate代碼, dict變數名)
LANGS = [
    ("ko", "ko",  "koDict"),
    ("ja", "ja",  "jaDict"),
    ("es", "es",  "esDict"),
    ("tr", "tr",  "trDict"),
    ("de", "de",  "deDict"),
    ("my", "my",  "myDict"),
    ("vi", "vi",  "viDict"),
    ("fa", "fa",  "faDict"),
    ("he", "iw",  "heDict"),
]

def translate(text, tl, retries=3):
    encoded = urllib.parse.quote(text)
    url = (f"https://translate.googleapis.com/translate_a/single"
           f"?client=gtx&sl=zh-TW&tl={tl}&dt=t&q={encoded}")
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    for attempt in range(retries):
        try:
            with urllib.request.urlopen(req, timeout=8) as r:
                data = json.loads(r.read())
                return "".join(seg[0] for seg in data[0] if seg[0])
        except Exception as e:
            print(f"    retry {attempt+1}: {e}")
            time.sleep(2)
    return text

def get_cjk_keys_from_t_calls(content):
    # Match both single-quoted t('...') and double-quoted t("...") calls
    single = re.findall(r"t\('([^']+)'", content)
    double = re.findall(r't\("([^"]+)"', content)
    keys = set(single) | set(double)
    return {k for k in keys if any('一' <= c <= '鿿' for c in k)}

def get_existing_dict_keys(var, content):
    start = content.find(f"const {var} = {{")
    end = content.find("\n};", start) + 3
    block = content[start:end]
    assign = f"Object.assign({var}, {{"
    aidx = content.find(assign)
    if aidx != -1:
        aend = content.find("\n  });", aidx) + 6
        block += content[aidx:aend]
    keys = set(re.findall(r"'([^']+)'\s*:", block))
    return {k for k in keys if any('一' <= c <= '鿿' for c in k)}

def escape_js(s):
    return s.replace("\\", "\\\\").replace("'", "\\'").replace("\n", "\\n")

def inject_entries(content, dict_var, entries):
    """在 Object.assign(dictVar, { 的末尾注入新 entries，或在 const dictVar = { 末尾注入。"""
    assign_marker = f"Object.assign({dict_var}, {{"
    idx = content.find(assign_marker)
    if idx != -1:
        # Find the closing   });  (with 2-space indent)
        close_idx = content.find("\n  });", idx)
        lines = "\n".join(f"    '{escape_js(k)}': '{escape_js(v)}'," for k, v in entries.items())
        # Insert before closing   });
        return content[:close_idx] + "\n" + lines + content[close_idx:]
    else:
        # No Object.assign block — find end of const dict = { ... };
        start = content.find(f"const {dict_var} = {{")
        close_idx = content.find("\n};", start)
        lines = "\n".join(f"  '{escape_js(k)}': '{escape_js(v)}'," for k, v in entries.items())
        return content[:close_idx] + "\n" + lines + content[close_idx:]

def main():
    with open(APP_PATH, 'r', encoding='utf-8') as f:
        content = f.read()

    all_zh_keys = get_cjk_keys_from_t_calls(content)
    print(f"共 {len(all_zh_keys)} 個中文 UI keys\n")

    for app_lang, google_code, dict_var in LANGS:
        existing = get_existing_dict_keys(dict_var, content)
        missing = all_zh_keys - existing
        if not missing:
            print(f"[{app_lang}] 全部完整，跳過")
            continue

        print(f"[{app_lang}] 缺 {len(missing)} 個，翻譯中…")
        new_entries = {}
        for i, zh in enumerate(sorted(missing)):
            translated = translate(zh, google_code)
            new_entries[zh] = translated
            if (i + 1) % 10 == 0:
                print(f"  {i+1}/{len(missing)} 完成")
            time.sleep(0.12)

        content = inject_entries(content, dict_var, new_entries)
        print(f"[{app_lang}] ✓ 注入 {len(new_entries)} 個 entries")

    with open(APP_PATH, 'w', encoding='utf-8') as f:
        f.write(content)
    print("\n全部寫入完成！")

if __name__ == "__main__":
    main()
