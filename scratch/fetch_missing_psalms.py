import requests
import json
import time

def fetch_missing_psalms(missing_nums):
    psalms = []
    for i in missing_nums:
        print(f"Fetching Psalm {i}...")
        url = f"https://bible-api.com/psalms+{i}?translation=kjv"
        retry = 0
        while retry < 5:
            try:
                response = requests.get(url)
                if response.status_code == 200:
                    data = response.json()
                    text = data['text'].replace('\n', ' ').strip()
                    text = ' '.join(text.split())
                    psalms.append({
                        "reference": f"Psalm {i}",
                        "title": f"Psalm {i}",
                        "text": text
                    })
                    break
                elif response.status_code == 429:
                    print(f"Rate limited for Psalm {i}, waiting 5s...")
                    time.sleep(5)
                    retry += 1
                else:
                    print(f"Error fetching Psalm {i}: {response.status_code}")
                    break
            except Exception as e:
                print(f"Exception for Psalm {i}: {e}")
                break
        time.sleep(1)
    return psalms

if __name__ == "__main__":
    missing = [17, 18, 19, 35, 36, 37, 38]
    data = fetch_missing_psalms(missing)
    print(json.dumps(data, indent=4, ensure_ascii=False))
