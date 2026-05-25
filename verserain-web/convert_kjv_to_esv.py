"""
把現有的 KJV 經文組全部轉換為 ESV 版本並上傳到 PartyKit。
"""
import json, os, time, urllib.request, urllib.parse, subprocess

API_URL = "https://verserain-party.hungry4grace.partykit.dev/parties/main/global-auth-db/custom-sets"

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

def fetch_esv(reference, token, retries=3):
    """直接呼叫 ESV API 取得經文內容。"""
    url = "https://api.esv.org/v3/passage/text/?" + urllib.parse.urlencode({
        "q": reference,
        "include-passage-references": "false",
        "include-verse-numbers": "false",
        "include-first-verse-numbers": "false",
        "include-footnotes": "false",
        "include-footnote-body": "false",
        "include-headings": "false",
        "include-short-copyright": "false",
        "include-copyright": "false",
    })
    req = urllib.request.Request(url, headers={
        "Authorization": f"Token {token}",
        "User-Agent": "Mozilla/5.0"
    })
    for attempt in range(retries):
        try:
            with urllib.request.urlopen(req, timeout=10) as r:
                data = json.loads(r.read())
                text = str(data.get("passages", [""])[0] or "").replace("\s+", " ").strip()
                # Clean up extra whitespace
                import re
                text = re.sub(r'\s+', ' ', text).strip()
                if text:
                    return text
        except Exception as e:
            print(f"    retry {attempt+1}: {e}")
            time.sleep(2)
    return None

def publish_set(set_obj, token):
    """POST 上傳經文組到 PartyKit。"""
    cmd = [
        "curl", "-sS", "-o", "/tmp/vr_esv_resp.json", "-w", "%{http_code}",
        "-X", "POST", API_URL,
        "-H", "Content-Type: application/json",
        "-H", f"Authorization: Bearer {token}",
        "-H", f"x-admin-token: {token}",
        "-H", f"x-api-key: {token}",
        "--data-raw", json.dumps(set_obj, ensure_ascii=False)
    ]
    out = subprocess.check_output(cmd, text=True, timeout=25).strip()
    return int(out)

def make_esv_id(kjv_id):
    """把 KJV ID 轉換為 ESV ID。"""
    if kjv_id.endswith("-kjv"):
        return kjv_id[:-4] + "-esv"
    return kjv_id + "-esv"

def make_esv_title(kjv_title):
    """把 KJV 標題轉換為 ESV 標題。"""
    title = kjv_title.replace(" (KJV)", "").replace("(KJV)", "").strip()
    return title  # ESV 版本直接用原標題（不加後綴，因為 language 欄位已標記）

def main():
    load_env_local()
    token = (
        os.environ.get("PARTYKIT_ADMIN_TOKEN")
        or os.environ.get("VERSE_RAIN_ADMIN_TOKEN")
        or os.environ.get("ADMIN_TOKEN")
    )
    esv_token = os.environ.get("ESV_API_TOKEN")
    if not esv_token:
        print("❌ 找不到 ESV_API_TOKEN")
        return

    # 抓所有已存在的 sets
    req = urllib.request.Request(API_URL, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=15) as resp:
        all_sets = json.loads(resp.read())

    existing_ids = {s["id"] for s in all_sets}
    kjv_sets = [s for s in all_sets if s.get("language") == "kjv"]

    print(f"找到 {len(kjv_sets)} 個 KJV 經文組")
    print(f"已存在 {len(existing_ids)} 個 sets\n")

    for ks in kjv_sets:
        kjv_id = ks["id"]
        esv_id = make_esv_id(kjv_id)
        esv_title = make_esv_title(ks["title"])

        if esv_id in existing_ids:
            print(f"[跳過] {esv_title} ({esv_id}) 已存在")
            continue

        verses = ks.get("verses", [])
        print(f"\n=== {ks['title']} → {esv_title} ({len(verses)} 節) ===")

        esv_verses = []
        for i, v in enumerate(verses):
            ref = v.get("reference", "")
            print(f"  [{i+1}/{len(verses)}] {ref} ...", end=" ", flush=True)
            esv_text = fetch_esv(ref, esv_token)
            if esv_text:
                print(f"✓ ({len(esv_text)} chars)")
                esv_verses.append({
                    "id": v["id"].replace("-kjv", "-esv") if "-kjv" in v.get("id","") else v.get("id","") + "-esv",
                    "reference": ref,
                    "title": esv_title,
                    "text": esv_text
                })
            else:
                print(f"⚠ 找不到 ESV 經文，用 KJV 文字代替")
                esv_verses.append({
                    "id": v["id"].replace("-kjv", "-esv") if "-kjv" in v.get("id","") else v.get("id","") + "-esv",
                    "reference": ref,
                    "title": esv_title,
                    "text": v.get("text", "")
                })
            time.sleep(0.3)  # 避免 ESV API rate limit

        set_obj = {
            "id": esv_id,
            "title": esv_title,
            "description": ks.get("description", "").replace("KJV", "ESV"),
            "language": "esv",
            "isPublished": True,
            "authorName": ks.get("authorName", "VerseRain"),
            "verses": esv_verses
        }

        try:
            status = publish_set(set_obj, token)
            print(f"  ✓ 上傳成功 (HTTP {status}): {esv_title} ({len(esv_verses)} 節)")
            existing_ids.add(esv_id)
        except Exception as e:
            print(f"  ✗ 上傳失敗: {e}")

        time.sleep(0.5)

    print("\n全部完成！")

if __name__ == "__main__":
    main()
