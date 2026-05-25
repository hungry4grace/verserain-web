"""
把 ESV 英文主題經文組翻譯成多種語言並上傳到 PartyKit。
源語言：英文 (ESV)
目標語言：簡中、韓、日、西、德、土、波斯、希伯來、緬、越
"""
import json, os, time, urllib.request, urllib.parse, re, subprocess

API_URL = "https://verserain-party.hungry4grace.partykit.dev/parties/main/global-auth-db/custom-sets"

# (app 語言代碼, Google Translate 代碼, 「Topic: 」的翻譯前綴)
LANGS = [
    ("vi",   "vi",    "Chủ đề: "),
]

# ESV topic sets to translate (source language: English)
ESV_SOURCE_IDS = [
    "dailyverses-covenant-cuv-traditional-esv",
    "dailyverses-healing-cuv-traditional-esv",
    "dailyverses-mercy-cuv-traditional-esv",
    "dailyverses-pentecost-cuv-traditional-esv",
    "dailyverses-praise-cuv-traditional-esv",
    "dailyverses-word-of-god-cuv-traditional-esv",
    "rain-verses-esv",
    "custom-1778294867340-esv",
]

def load_env_local(path=".env.local"):
    if not os.path.exists(path):
        return
    with open(path, encoding="utf-8") as f:
        for raw in f:
            line = raw.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            key = key.strip()
            value = value.strip().strip('"').strip("'")
            if key:
                os.environ[key] = value

def translate(text, target_code, retries=3):
    """Google 免費 API 翻譯（源語言：英文）。"""
    encoded = urllib.parse.quote(text)
    url = (f"https://translate.googleapis.com/translate_a/single"
           f"?client=gtx&sl=en&tl={target_code}&dt=t&q={encoded}")
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    for attempt in range(retries):
        try:
            with urllib.request.urlopen(req, timeout=8) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                return "".join(seg[0] for seg in data[0] if seg[0])
        except Exception as e:
            print(f"    翻譯失敗（{target_code}，第{attempt+1}次）：{e}")
            time.sleep(3)
    return text

def extract_topic_word(title):
    """從 'Topic: Pentecost' 提取 'Pentecost'。"""
    for prefix in ["Topic: ", "Topic:", "主題：", "主題:", "Chủ đề: "]:
        if title.startswith(prefix):
            return title[len(prefix):].strip()
    return title.strip()

def publish_set(set_obj, token):
    cmd = [
        "curl", "-sS", "-o", "/tmp/vr_esv_trans_resp.json", "-w", "%{http_code}",
        "-X", "POST", API_URL,
        "-H", "Content-Type: application/json",
        "-H", f"Authorization: Bearer {token}",
        "-H", f"x-admin-token: {token}",
        "-H", f"x-api-key: {token}",
        "--data-raw", json.dumps(set_obj, ensure_ascii=False)
    ]
    out = subprocess.check_output(cmd, text=True, timeout=25).strip()
    return int(out)

def main():
    load_env_local()
    token = (
        os.environ.get("PARTYKIT_ADMIN_TOKEN")
        or os.environ.get("VERSE_RAIN_ADMIN_TOKEN")
        or os.environ.get("ADMIN_TOKEN")
    )
    if not token:
        print("❌ 找不到 admin token")
        return

    # 抓所有已存在的 sets
    req = urllib.request.Request(API_URL, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=15) as resp:
        all_sets = json.loads(resp.read())

    existing_ids = {s["id"] for s in all_sets}
    set_map = {s["id"]: s for s in all_sets}

    # 只翻譯指定的 ESV 來源組
    esv_sets = [set_map[sid] for sid in ESV_SOURCE_IDS if sid in set_map]
    print(f"共 {len(esv_sets)} 個 ESV 來源組，共 {len(LANGS)} 種目標語言\n")

    total_uploaded = 0
    total_skipped = 0

    for es in esv_sets:
        src_id = es["id"]
        src_title = es["title"]
        src_desc = es.get("description", "")
        src_verses = es.get("verses", [])
        topic_word = extract_topic_word(src_title)

        print(f"=== {src_title} ({len(src_verses)} 節) ===")

        for app_lang, google_code, prefix in LANGS:
            new_id = f"{src_id}-{app_lang}"
            if new_id in existing_ids:
                print(f"  [{app_lang}] 已存在，跳過")
                total_skipped += 1
                continue

            print(f"  [{app_lang}] 翻譯中…", end=" ", flush=True)

            # 翻譯標題中的主題詞
            translated_topic = translate(topic_word, google_code)
            time.sleep(0.15)
            new_title = prefix + translated_topic

            # 翻譯描述
            new_desc = translate(src_desc, google_code) if src_desc else ""
            time.sleep(0.15)

            # 翻譯每節經文
            new_verses = []
            for v in src_verses:
                ref = v.get("reference", "")
                text = translate(v.get("text", ""), google_code)
                time.sleep(0.12)
                new_verses.append({
                    "id": f"{v.get('id', 'v')}-{app_lang}",
                    "reference": ref,
                    "title": new_title,
                    "text": text
                })

            set_obj = {
                "id": new_id,
                "title": new_title,
                "description": new_desc,
                "language": app_lang,
                "isPublished": True,
                "authorName": es.get("authorName", "VerseRain"),
                "verses": new_verses
            }

            try:
                status = publish_set(set_obj, token)
                print(f"✓ HTTP {status}: {new_title}")
                existing_ids.add(new_id)
                total_uploaded += 1
            except Exception as e:
                print(f"✗ 失敗: {e}")

            time.sleep(0.4)

        print()

    print(f"全部完成！上傳 {total_uploaded} 個，跳過 {total_skipped} 個。")

if __name__ == "__main__":
    main()
