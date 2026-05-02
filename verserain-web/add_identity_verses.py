import os
import re
import time
import json
import urllib.request
import urllib.parse

verses_zh = [
    {"reference": "約翰一書 3:1", "text": "你看父賜給我們是怎樣的慈愛，使我們得稱為神的兒女；我們也真是他的兒女。"},
    {"reference": "約翰福音 1:12", "text": "凡接待他的，就是信他名的人，他就賜他們權柄，作神的兒女。"},
    {"reference": "羅馬書 8:15", "text": "你們所受的，不是奴僕的心，仍舊害怕；所受的，乃是兒子的心，因此我們呼叫：『阿爸！父！』"},
    {"reference": "加拉太書 4:6-7", "text": "你們既為兒子，神就差他兒子的靈進入你們的心，呼叫：『阿爸！父！』可見，從此以後，你不是奴僕，乃是兒子了。"},
    {"reference": "以弗所書 1:5", "text": "又按著自己意旨所喜悅的，預定我們藉著耶穌基督得兒子的名分。"},
    {"reference": "以弗所書 5:1", "text": "所以，你們該效法神，好像蒙慈愛的兒女一樣。"},
    {"reference": "哥林多後書 6:18", "text": "我要作你們的父；你們要作我的兒女。這是全能的主說的。"},
    {"reference": "以賽亞書 43:4", "text": "因我看你為寶為尊；又因我愛你，所以我使人代替你，使萬民代替你的生命。"},
    {"reference": "耶利米書 31:3", "text": "我以永遠的愛愛你，因此我以慈愛吸引你。"},
    {"reference": "西番雅書 3:17", "text": "耶和華你的神是施行拯救、大有能力的主。他在你中間必因你歡欣喜樂，默然愛你，且因你造就歌唱。"},
    
    {"reference": "羅馬書 8:19", "text": "受造之物切望等候神的眾子顯現出來。"},
    {"reference": "羅馬書 8:21", "text": "但受造之物仍然指望脫離敗壞的轄制，得享神兒女自由的榮耀。"},
    {"reference": "羅馬書 8:30", "text": "預先所定下的人又召他們來；所召來的人又稱他們為義；所稱為義的人又叫他們得榮耀。"},
    {"reference": "馬太福音 5:14", "text": "你們是世上的光。城造在山上是不能隱藏的。"},
    {"reference": "馬太福音 5:16", "text": "你們的光也當這樣照在人前，叫他們看見你們的好行為，便將榮耀歸給你們在天上的父。"},
    {"reference": "以賽亞書 60:1", "text": "興起，發光！因為你的光已經來到！耶和華的榮耀發現照耀你。"},
    {"reference": "腓立比書 2:15", "text": "使你們無可指摘，誠實無偽，在這彎曲悖謬的世代作神無瑕疵的兒女。你們顯在這世代中，好像明光照耀。"},
    {"reference": "彼得前書 2:9", "text": "惟有你們是被揀選的族類，是有君尊的祭司，是聖潔的國度，是屬神的子民，要叫你們宣揚那召你們出黑暗入奇妙光明者的美德。"},
    {"reference": "哥林多後書 3:18", "text": "我們眾人既然敞著臉得以看見主的榮耀，好像從鏡子裡返照，就變成主的形狀，榮上加榮，如同從主的靈變成的。"},
    {"reference": "以弗所書 2:10", "text": "我們原是他的工作（傑作），在基督耶穌裡造成的，為要叫我們行善，就是神所預備叫我們行的。"},

    {"reference": "馬太福音 28:18", "text": "耶穌進前來，對他們說：『天上地下所有的權柄都賜給我了。』"},
    {"reference": "馬太福音 28:19", "text": "所以，你們要去，使萬民作我的門徒，奉父、子、聖靈的名給他們施洗。"},
    {"reference": "馬太福音 28:20", "text": "凡我所吩咐你們的，都教訓他們遵守，我就常與你們同在，直到世界的末了。"},
    {"reference": "使徒行傳 1:8", "text": "但聖靈降臨在你們身上，你們就必得著能力，並要在耶路撒冷、猶太全地，和撒馬利亞，直到地極，作我的見證。"},
    {"reference": "詩篇 2:8", "text": "你求我，我就將列國賜你為基業，將地極賜你為田產。"},
    {"reference": "創世記 12:3", "text": "為你祝福的，我必賜福與他；那咒詛你的，我必咒詛他。地上的萬族都要因你得福。"},
    {"reference": "以賽亞書 2:2", "text": "末後的日子，耶和華殿的山必堅立，超乎諸山，高舉過於萬嶺；萬民都要流歸這山。"},
    {"reference": "馬太福音 24:14", "text": "這天國的福音要傳遍天下，對萬民作見證，然後末期才來到。"},
    {"reference": "啟示錄 7:9", "text": "此後，我觀看，見有許多的人，沒有人能數過來，是從各國、各族、各民、各方來的，站在寶座和羔羊面前。"},
    {"reference": "哈巴谷書 2:14", "text": "認識耶和華榮耀的知識要充滿遍地，好像水充滿洋海一般。"}
]

files_and_langs = [
    ("verses_kjv.js", "en"),
    ("verses_ja.js", "ja"),
    ("verses_es.js", "es"),
    ("verses_ko.js", "ko"),
    ("verses_de.js", "de"),
    ("verses_tr.js", "tr"),
    ("verses_fa.js", "fa"),
    ("verses_he.js", "iw"), # iw is Hebrew for google
    ("verses_my.js", "my")
]

title_zh = "身分的覺醒到榮耀顯現"
desc_zh = "這是一個非常美好的主題。這 30 節經文將幫助我們從「身分的覺醒」走向「榮耀的顯現」，最終達成「門訓列國」的使命。"

def translate(text, target):
    encoded = urllib.parse.quote(text)
    url = f"https://translate.googleapis.com/translate_a/single?client=gtx&sl=zh-TW&tl={target}&dt=t&q={encoded}"
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    try:
        with urllib.request.urlopen(req, timeout=5) as response:
            data = json.loads(response.read().decode('utf-8'))
            translated_text = "".join([i[0] for i in data[0] if i[0]])
            return translated_text
    except Exception as e:
        print(f"Error translating to {target}: {e}")
        time.sleep(2)
        return text

def main():
    for filename, lang in files_and_langs:
        filepath = os.path.join("/Users/davidhwang/Projects/verserain-web/verserain-web/src", filename)
        if not os.path.exists(filepath):
            print(f"File not found: {filepath}")
            continue
            
        print(f"Processing {filename} ({lang})...")
        
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # fix lang for ids since hebrew uses 'he' in filename but 'iw' in translate
        id_lang = lang if lang != 'iw' else 'he'
        
        if f"identity-manifestation-mission-{id_lang}" in content:
            print(f"Set already exists in {filename}, skipping.")
            continue
            
        title = translate(title_zh, lang)
        desc = translate(desc_zh, lang)
        
        translated_verses = []
        for i, v in enumerate(verses_zh):
            ref = translate(v['reference'], lang)
            txt = translate(v['text'], lang)
            ref = ref.replace('"', '\\"').replace('\\n', '')
            txt = txt.replace('"', '\\"').replace('\\n', '')
            title_esc = title.replace('"', '\\"').replace('\\n', '')
            
            translated_verses.append(f'      {{ id: "imm-{id_lang}-{i+1}", reference: "{ref}", title: "{title_esc}", text: "{txt}" }}')
            time.sleep(0.1)
            
        verses_str = ",\n".join(translated_verses)
        
        new_set = f"""
  ,{{
    id: "identity-manifestation-mission-{id_lang}",
    title: "{title}",
    description: "{desc}",
    language: "{id_lang}",
    verses: [
{verses_str}
    ]
  }}
"""
        last_bracket_idx = content.rfind(']')
        if last_bracket_idx != -1:
            new_content = content[:last_bracket_idx] + new_set + content[last_bracket_idx:]
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(new_content)
            print(f"Success updated {filename}")
        else:
            print(f"Could not find closing bracket in {filename}")

if __name__ == '__main__':
    main()
