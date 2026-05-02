import os

def main():
    filepath = "/Users/davidhwang/Projects/verserain-web/verserain-web/src/verses.js"
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # The new set to append
    new_set = """  ,{
    id: "identity-manifestation-mission-zh-TW",
    title: "身分的覺醒到榮耀顯現",
    description: "這是一個非常美好的主題。這 30 節經文將幫助我們從「身分的覺醒」走向「榮耀的顯現」，最終達成「門訓列國」的使命。",
    language: "zh-TW",
    verses: [
      { id: "imm-zh-TW-1", reference: "約翰一書 3:1", title: "身分的覺醒到榮耀顯現", text: "你看父賜給我們是怎樣的慈愛，使我們得稱為神的兒女；我們也真是他的兒女。" },
      { id: "imm-zh-TW-2", reference: "約翰福音 1:12", title: "身分的覺醒到榮耀顯現", text: "凡接待他的，就是信他名的人，他就賜他們權柄，作神的兒女。" },
      { id: "imm-zh-TW-3", reference: "羅馬書 8:15", title: "身分的覺醒到榮耀顯現", text: "你們所受的，不是奴僕的心，仍舊害怕；所受的，乃是兒子的心，因此我們呼叫：『阿爸！父！』" },
      { id: "imm-zh-TW-4", reference: "加拉太書 4:6-7", title: "身分的覺醒到榮耀顯現", text: "你們既為兒子，神就差他兒子的靈進入你們的心，呼叫：『阿爸！父！』可見，從此以後，你不是奴僕，乃是兒子了。" },
      { id: "imm-zh-TW-5", reference: "以弗所書 1:5", title: "身分的覺醒到榮耀顯現", text: "又按著自己意旨所喜悅的，預定我們藉著耶穌基督得兒子的名分。" },
      { id: "imm-zh-TW-6", reference: "以弗所書 5:1", title: "身分的覺醒到榮耀顯現", text: "所以，你們該效法神，好像蒙慈愛的兒女一樣。" },
      { id: "imm-zh-TW-7", reference: "哥林多後書 6:18", title: "身分的覺醒到榮耀顯現", text: "我要作你們的父；你們要作我的兒女。這是全能的主說的。" },
      { id: "imm-zh-TW-8", reference: "以賽亞書 43:4", title: "身分的覺醒到榮耀顯現", text: "因我看你為寶為尊；又因我愛你，所以我使人代替你，使萬民代替你的生命。" },
      { id: "imm-zh-TW-9", reference: "耶利米書 31:3", title: "身分的覺醒到榮耀顯現", text: "我以永遠的愛愛你，因此我以慈愛吸引你。" },
      { id: "imm-zh-TW-10", reference: "西番雅書 3:17", title: "身分的覺醒到榮耀顯現", text: "耶和華你的神是施行拯救、大有能力的主。他在你中間必因你歡欣喜樂，默然愛你，且因你造就歌唱。" },
      { id: "imm-zh-TW-11", reference: "羅馬書 8:19", title: "身分的覺醒到榮耀顯現", text: "受造之物切望等候神的眾子顯現出來。" },
      { id: "imm-zh-TW-12", reference: "羅馬書 8:21", title: "身分的覺醒到榮耀顯現", text: "但受造之物仍然指望脫離敗壞的轄制，得享神兒女自由的榮耀。" },
      { id: "imm-zh-TW-13", reference: "羅馬書 8:30", title: "身分的覺醒到榮耀顯現", text: "預先所定下的人又召他們來；所召來的人又稱他們為義；所稱為義的人又叫他們得榮耀。" },
      { id: "imm-zh-TW-14", reference: "馬太福音 5:14", title: "身分的覺醒到榮耀顯現", text: "你們是世上的光。城造在山上是不能隱藏的。" },
      { id: "imm-zh-TW-15", reference: "馬太福音 5:16", title: "身分的覺醒到榮耀顯現", text: "你們的光也當這樣照在人前，叫他們看見你們的好行為，便將榮耀歸給你們在天上的父。" },
      { id: "imm-zh-TW-16", reference: "以賽亞書 60:1", title: "身分的覺醒到榮耀顯現", text: "興起，發光！因為你的光已經來到！耶和華的榮耀發現照耀你。" },
      { id: "imm-zh-TW-17", reference: "腓立比書 2:15", title: "身分的覺醒到榮耀顯現", text: "使你們無可指摘，誠實無偽，在這彎曲悖謬的世代作神無瑕疵的兒女。你們顯在這世代中，好像明光照耀。" },
      { id: "imm-zh-TW-18", reference: "彼得前書 2:9", title: "身分的覺醒到榮耀顯現", text: "惟有你們是被揀選的族類，是有君尊的祭司，是聖潔的國度，是屬神的子民，要叫你們宣揚那召你們出黑暗入奇妙光明者的美德。" },
      { id: "imm-zh-TW-19", reference: "哥林多後書 3:18", title: "身分的覺醒到榮耀顯現", text: "我們眾人既然敞著臉得以看見主的榮耀，好像從鏡子裡返照，就變成主的形狀，榮上加榮，如同從主的靈變成的。" },
      { id: "imm-zh-TW-20", reference: "以弗所書 2:10", title: "身分的覺醒到榮耀顯現", text: "我們原是他的工作（傑作），在基督耶穌裡造成的，為要叫我們行善，就是神所預備叫我們行的。" },
      { id: "imm-zh-TW-21", reference: "馬太福音 28:18", title: "身分的覺醒到榮耀顯現", text: "耶穌進前來，對他們說：『天上地下所有的權柄都賜給我了。』" },
      { id: "imm-zh-TW-22", reference: "馬太福音 28:19", title: "身分的覺醒到榮耀顯現", text: "所以，你們要去，使萬民作我的門徒，奉父、子、聖靈的名給他們施洗。" },
      { id: "imm-zh-TW-23", reference: "馬太福音 28:20", title: "身分的覺醒到榮耀顯現", text: "凡我所吩咐你們的，都教訓他們遵守，我就常與你們同在，直到世界的末了。" },
      { id: "imm-zh-TW-24", reference: "使徒行傳 1:8", title: "身分的覺醒到榮耀顯現", text: "但聖靈降臨在你們身上，你們就必得著能力，並要在耶路撒冷、猶太全地，和撒馬利亞，直到地極，作我的見證。" },
      { id: "imm-zh-TW-25", reference: "詩篇 2:8", title: "身分的覺醒到榮耀顯現", text: "你求我，我就將列國賜你為基業，將地極賜你為田產。" },
      { id: "imm-zh-TW-26", reference: "創世記 12:3", title: "身分的覺醒到榮耀顯現", text: "為你祝福的，我必賜福與他；那咒詛你的，我必咒詛他。地上的萬族都要因你得福。" },
      { id: "imm-zh-TW-27", reference: "以賽亞書 2:2", title: "身分的覺醒到榮耀顯現", text: "末後的日子，耶和華殿的山必堅立，超乎諸山，高舉過於萬嶺；萬民都要流歸這山。" },
      { id: "imm-zh-TW-28", reference: "馬太福音 24:14", title: "身分的覺醒到榮耀顯現", text: "這天國的福音要傳遍天下，對萬民作見證，然後末期才來到。" },
      { id: "imm-zh-TW-29", reference: "啟示錄 7:9", title: "身分的覺醒到榮耀顯現", text: "此後，我觀看，見有許多的人，沒有人能數過來，是從各國、各族、各民、各方來的，站在寶座和羔羊面前。" },
      { id: "imm-zh-TW-30", reference: "哈巴谷書 2:14", title: "身分的覺醒到榮耀顯現", text: "認識耶和華榮耀的知識要充滿遍地，好像水充滿洋海一般。" }
    ]
  }
"""

    if "identity-manifestation-mission-zh-TW" not in content:
        # We need to insert it right before `];\n\n// Fallback`
        target_str = "];\n\n// Fallback"
        if target_str in content:
            new_content = content.replace(target_str, new_set + "\n" + target_str)
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(new_content)
            print("Successfully updated verses.js")
        else:
            print("Could not find insertion point.")
    else:
        print("Already exists.")

if __name__ == '__main__':
    main()
