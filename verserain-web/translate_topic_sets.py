"""
把繁體中文「主題：XX」經文組翻譯成多國語言，並上傳到 PartyKit API。
"""
import json, os, time, urllib.request, urllib.parse, re, subprocess

API_URL = "https://verserain-party.hungry4grace.partykit.dev/parties/main/global-auth-db/custom-sets"

# (app 語言代碼, Google Translate 代碼, 「主題：」的翻譯)
LANGS = [
    ("cuvs", "zh-CN", "主题："),
    ("ko",   "ko",    "주제："),
    ("ja",   "ja",    "テーマ："),
    ("kjv",  "en",    "Topic: "),
    ("es",   "es",    "Tema: "),
    ("de",   "de",    "Thema: "),
    ("tr",   "tr",    "Konu: "),
    ("fa",   "fa",    "موضوع: "),
    ("he",   "iw",    "נושא: "),
    ("my",   "my",    "ခေါင်းစဉ်: "),
]

def load_env_local(path=".env.local"):
    """載入 .env.local 變數（簡單 KEY=VALUE 格式）。"""
    if not os.path.exists(path):
        return
    with open(path, "r", encoding="utf-8") as f:
        for raw in f:
            line = raw.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            key = key.strip()
            value = value.strip().strip('"').strip("'")
            if key and (key not in os.environ or not os.environ.get(key)):
                os.environ[key] = value

def get_auth_headers():
    """
    讀取 admin token 並組出授權 headers。
    依序嘗試常見環境變數，避免每次改腳本。
    """
    token = (
        os.environ.get("PARTYKIT_ADMIN_TOKEN")
        or os.environ.get("VERSE_RAIN_ADMIN_TOKEN")
        or os.environ.get("ADMIN_TOKEN")
    )
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
        headers["x-admin-token"] = token
        headers["x-api-key"] = token
    return headers

def translate(text, target_google_code, retries=3):
    """用 Google 免費 API 翻譯文字（源語言繁體中文）。"""
    encoded = urllib.parse.quote(text)
    url = (f"https://translate.googleapis.com/translate_a/single"
           f"?client=gtx&sl=zh-TW&tl={target_google_code}&dt=t&q={encoded}")
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    for attempt in range(retries):
        try:
            with urllib.request.urlopen(req, timeout=8) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                return "".join(seg[0] for seg in data[0] if seg[0])
        except Exception as e:
            print(f"    翻譯失敗（{target_google_code}，第{attempt+1}次）：{e}")
            time.sleep(3)
    return text  # 失敗時回傳原文

def strip_html(text):
    """去掉簡單的 HTML 標籤，用於描述欄位。"""
    return re.sub(r"<[^>]+>", " ", text).strip()

def make_lang_id(original_id, app_lang):
    """根據原始 ID 和目標語言產生新的 ID。"""
    return f"{original_id}-{app_lang}"

def publish_set(set_obj):
    """POST 上傳經文組到 PartyKit（使用 curl，避免 urllib 被邊緣層拒絕）。"""
    headers = get_auth_headers()
    cmd = [
        "curl", "-sS", "-o", "/tmp/vr_publish_resp.json", "-w", "%{http_code}",
        "-X", "POST", API_URL,
        "-H", "Content-Type: application/json",
        "-H", f"Authorization: {headers.get('Authorization', '')}",
        "-H", f"x-admin-token: {headers.get('x-admin-token', '')}",
        "-H", f"x-api-key: {headers.get('x-api-key', '')}",
        "--data-raw", json.dumps(set_obj, ensure_ascii=False)
    ]
    out = subprocess.check_output(cmd, text=True, timeout=25).strip()
    return int(out)

def main():
    load_env_local()
    topic_sets = json.load(open("/tmp/topic_sets.json", encoding="utf-8"))
    print(f"共 {len(topic_sets)} 個主題組，共 {len(LANGS)} 種目標語言\n")
    if not (
        os.environ.get("PARTYKIT_ADMIN_TOKEN")
        or os.environ.get("VERSE_RAIN_ADMIN_TOKEN")
        or os.environ.get("ADMIN_TOKEN")
    ):
        print("警告：找不到 admin token（PARTYKIT_ADMIN_TOKEN / VERSE_RAIN_ADMIN_TOKEN / ADMIN_TOKEN）")
        print("可能會遇到 403 Forbidden。\n")

    # 先抓已存在的 published set IDs，避免重複上傳
    get_req = urllib.request.Request(API_URL, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(get_req, timeout=15) as resp:
        existing = json.loads(resp.read())
    existing_ids = {s["id"] for s in existing}
    print(f"已存在 {len(existing_ids)} 個 published sets\n")

    for ts in topic_sets:
        src_id    = ts["id"]
        src_title = ts["title"]           # e.g. "主題：五旬節"
        src_desc  = strip_html(ts.get("description", ""))
        src_verses = ts.get("verses", [])
        topic_word = src_title.replace("主題：", "").strip()  # e.g. "五旬節"

        print(f"=== {src_title} ({len(src_verses)} 節) ===")

        for app_lang, google_code, prefix in LANGS:
            new_id = make_lang_id(src_id, app_lang)
            if new_id in existing_ids:
                print(f"  [{app_lang}] 已存在，跳過")
                continue

            print(f"  [{app_lang}] 翻譯中…")

            # 翻譯標題中的主題詞
            translated_topic = translate(topic_word, google_code)
            time.sleep(0.15)
            new_title = prefix + translated_topic

            # 翻譯描述（只取純文字部分）
            new_desc = translate(src_desc, google_code) if src_desc else ""
            time.sleep(0.15)

            # 翻譯每節經文
            new_verses = []
            for v in src_verses:
                ref  = translate(v.get("reference", ""), google_code)
                time.sleep(0.1)
                text = translate(v.get("text", ""), google_code)
                time.sleep(0.1)

                new_verses.append({
                    "id":        f"{v.get('id', 'v')}-{app_lang}",
                    "reference": ref,
                    "title":     new_title,
                    "text":      text
                })

            set_obj = {
                "id":          new_id,
                "title":       new_title,
                "description": new_desc,
                "language":    app_lang,
                "isPublished": True,
                "authorName":  "VerseRain",
                "verses":      new_verses
            }

            # 上傳
            try:
                status = publish_set(set_obj)
                print(f"  [{app_lang}] ✓ 上傳成功（HTTP {status}）：{new_title}")
                existing_ids.add(new_id)
            except Exception as e:
                print(f"  [{app_lang}] ✗ 上傳失敗：{e}")

            time.sleep(0.5)

        print()

    print("全部完成！")

if __name__ == "__main__":
    main()
