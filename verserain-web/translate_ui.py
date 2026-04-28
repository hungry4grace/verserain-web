import re
import json
from deep_translator import GoogleTranslator
import time

def extract_ko_dict(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    start_str = "const koDict = {"
    end_str = "  };"
    
    start_idx = content.find(start_str)
    if start_idx == -1:
        return []
    
    # Extract just the dictionary block
    dict_content = content[start_idx:content.find(end_str, start_idx)]
    
    # We just need the keys (the Chinese strings)
    # They look like: '挑戰': '도전',
    # We can regex to find strings before the colon
    keys = []
    lines = dict_content.split('\n')
    for line in lines:
        match = re.search(r"^\s*'(.+?)':", line)
        if match:
            keys.append(match.group(1))
        else:
            match = re.search(r'^\s*"(.+?)":', line)
            if match:
                keys.append(match.group(1))
    
    return keys

def translate_keys(keys):
    langs = {'es': 'es', 'tr': 'tr', 'de': 'de'}
    results = {'es': {}, 'tr': {}, 'de': {}}
    
    for lang, code in langs.items():
        translator = GoogleTranslator(source='zh-TW', target=code)
        
        # Batch translation to speed up
        batch_size = 50
        for i in range(0, len(keys), batch_size):
            batch = keys[i:i+batch_size]
            try:
                translated_batch = translator.translate_batch(batch)
                for k, v in zip(batch, translated_batch):
                    results[lang][k] = v
                time.sleep(1) # throttle
            except Exception as e:
                print(f"Error translating batch for {lang}: {e}")
                # fallback one by one
                for k in batch:
                    try:
                        results[lang][k] = translator.translate(k)
                    except:
                        results[lang][k] = k
                    time.sleep(0.1)
        print(f"Finished {lang}")
    
    return results

def main():
    keys = extract_ko_dict('src/App.jsx')
    print(f"Extracted {len(keys)} keys")
    
    results = translate_keys(keys)
    
    with open('esDict.json', 'w', encoding='utf-8') as f:
        json.dump(results['es'], f, ensure_ascii=False, indent=2)
    with open('trDict.json', 'w', encoding='utf-8') as f:
        json.dump(results['tr'], f, ensure_ascii=False, indent=2)
    with open('deDict.json', 'w', encoding='utf-8') as f:
        json.dump(results['de'], f, ensure_ascii=False, indent=2)
        
    print("Saved translations.")

if __name__ == '__main__':
    main()
