import requests
import json
import time

def fetch_psalms():
    psalms = []
    for i in range(1, 42):
        print(f"Fetching Psalm {i}...")
        url = f"https://bible-api.com/psalms+{i}?translation=kjv"
        try:
            response = requests.get(url)
            if response.status_code == 200:
                data = response.json()
                text = data['text'].replace('\n', ' ').strip()
                # Clean up multiple spaces
                text = ' '.join(text.split())
                psalms.append({
                    "reference": f"Psalm {i}",
                    "title": f"Psalm {i}",
                    "text": text
                })
            else:
                print(f"Error fetching Psalm {i}: {response.status_code}")
        except Exception as e:
            print(f"Exception for Psalm {i}: {e}")
        time.sleep(0.5) # Be kind to the API
    return psalms

if __name__ == "__main__":
    data = fetch_psalms()
    print(json.dumps(data, indent=4, ensure_ascii=False))
