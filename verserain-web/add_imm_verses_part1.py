import os
import re

title_desc = {
  "en": {
      "title": "Awakening of Identity to Manifestation of Glory",
      "desc": "This is a wonderful theme. These 30 verses will help us move from the 'Awakening of Identity' to the 'Manifestation of Glory', ultimately fulfilling the mission of 'Discipling the Nations'."
  },
  "ja": {
      "title": "アイデンティティの覚醒から栄光の現れまで",
      "desc": "これは素晴らしいテーマです。これら30の聖句は、「アイデンティティの覚醒」から「栄光の現れ」へと向かい、最終的に「あらゆる国の人々を弟子とする」という使命を果たすのを助けます。"
  },
  "es": {
      "title": "El Despertar de la Identidad a la Manifestación de la Gloria",
      "desc": "Este es un tema maravilloso. Estos 30 versículos nos ayudarán a pasar del 'Despertar de la Identidad' a la 'Manifestación de la Gloria', cumpliendo finalmente la misión de 'Discipular a las Naciones'."
  },
  "ko": {
      "title": "정체성의 각성에서 영광의 나타남으로",
      "desc": "이것은 매우 아름다운 주제입니다. 이 30구절의 성경은 우리가 '정체성의 각성'에서 '영광의 나타남'으로 나아가, 마침내 '모든 민족을 제자로 삼는' 사명을 완수하도록 도울 것입니다."
  },
  "de": {
      "title": "Vom Erwachen der Identität zur Offenbarung der Herrlichkeit",
      "desc": "Dies ist ein wunderbares Thema. Diese 30 Verse werden uns helfen, vom 'Erwachen der Identität' zur 'Offenbarung der Herrlichkeit' zu gelangen und letztendlich die Mission der 'Jüngerschaft aller Nationen' zu erfüllen."
  },
  "tr": {
      "title": "Kimliğin Uyanışından Yüceliğin Tezahürüne",
      "desc": "Bu harika bir tema. Bu 30 ayet, 'Kimliğin Uyanışından' 'Yüceliğin Tezahürüne' geçmemize ve nihayetinde 'Ulusları Öğrenci Yapma' görevini yerine getirmemize yardımcı olacaktır."
  },
  "fa": {
      "title": "بیداری هویت تا تجلی جلال",
      "desc": "این یک موضوع فوق‌العاده است. این 30 آیه به ما کمک می‌کند تا از 'بیداری هویت' به سمت 'تجلی جلال' حرکت کنیم و در نهایت مأموریت 'شاگردسازی ملت‌ها' را به انجام برسانیم."
  },
  "he": {
      "title": "התעוררות הזהות להתגלות הכבוד",
      "desc": "זהו נושא נפלא. 30 הפסוקים הללו יעזרו לנו לעבור מ'התעוררות הזהות' אל 'התגלות הכבוד', ולהשלים בסופו של דבר את משימת 'עשיית תלמידים מכל העמים'."
  },
  "my": {
      "title": "မည်သူမည်ဝါဖြစ်ကြောင်း နိုးကြားလာခြင်းမှ ဘုန်းတော်ထင်ရှားခြင်းသို့",
      "desc": "ဒါဟာ အလွန်ကောင်းမွန်တဲ့ အကြောင်းအရာတစ်ခုဖြစ်ပါတယ်။ ဒီကျမ်းပိုဒ် ၃၀ ဟာ 'မည်သူမည်ဝါဖြစ်ကြောင်း နိုးကြားလာခြင်း' မှ 'ဘုန်းတော်ထင်ရှားခြင်း' သို့ ကျွန်ုပ်တို့ကို ကူညီပေးမှာဖြစ်ပြီး နောက်ဆုံးမှာ 'လူမျိုးတကာတို့ကို တပည့်တော်ဖြစ်စေခြင်း' ဆိုတဲ့ တာဝန်ကို ပြီးမြောက်စေမှာဖြစ်ပါတယ်။"
  }
}

verses_translations = {
  "en": [
    {"reference": "1 John 3:1", "text": "See what kind of love the Father has given to us, that we should be called children of God; and so we are."},
    {"reference": "John 1:12", "text": "But to all who did receive him, who believed in his name, he gave the right to become children of God."},
    {"reference": "Romans 8:15", "text": "For you did not receive the spirit of slavery to fall back into fear, but you have received the Spirit of adoption as sons, by whom we cry, 'Abba! Father!'"},
    {"reference": "Galatians 4:6-7", "text": "And because you are sons, God has sent the Spirit of his Son into our hearts, crying, 'Abba! Father!' So you are no longer a slave, but a son."},
    {"reference": "Ephesians 1:5", "text": "He predestined us for adoption to himself as sons through Jesus Christ, according to the purpose of his will."},
    {"reference": "Ephesians 5:1", "text": "Therefore be imitators of God, as beloved children."},
    {"reference": "2 Corinthians 6:18", "text": "And I will be a father to you, and you shall be sons and daughters to me, says the Lord Almighty."},
    {"reference": "Isaiah 43:4", "text": "Because you are precious in my eyes, and honored, and I love you, I give men in return for you, peoples in exchange for your life."},
    {"reference": "Jeremiah 31:3", "text": "I have loved you with an everlasting love; therefore I have continued my faithfulness to you."},
    {"reference": "Zephaniah 3:17", "text": "The LORD your God is in your midst, a mighty one who will save; he will rejoice over you with gladness; he will quiet you by his love; he will exult over you with loud singing."},
    {"reference": "Romans 8:19", "text": "For the creation waits with eager longing for the revealing of the sons of God."},
    {"reference": "Romans 8:21", "text": "That the creation itself will be set free from its bondage to corruption and obtain the freedom of the glory of the children of God."},
    {"reference": "Romans 8:30", "text": "And those whom he predestined he also called, and those whom he called he also justified, and those whom he justified he also glorified."},
    {"reference": "Matthew 5:14", "text": "You are the light of the world. A city set on a hill cannot be hidden."},
    {"reference": "Matthew 5:16", "text": "In the same way, let your light shine before others, so that they may see your good works and give glory to your Father who is in heaven."},
    {"reference": "Isaiah 60:1", "text": "Arise, shine, for your light has come, and the glory of the LORD has risen upon you."},
    {"reference": "Philippians 2:15", "text": "That you may be blameless and innocent, children of God without blemish in the midst of a crooked and twisted generation, among whom you shine as lights in the world."},
    {"reference": "1 Peter 2:9", "text": "But you are a chosen race, a royal priesthood, a holy nation, a people for his own possession, that you may proclaim the excellencies of him who called you out of darkness into his marvelous light."},
    {"reference": "2 Corinthians 3:18", "text": "And we all, with unveiled face, beholding the glory of the Lord, are being transformed into the same image from one degree of glory to another. For this comes from the Lord who is the Spirit."},
    {"reference": "Ephesians 2:10", "text": "For we are his workmanship, created in Christ Jesus for good works, which God prepared beforehand, that we should walk in them."},
    {"reference": "Matthew 28:18", "text": "And Jesus came and said to them, 'All authority in heaven and on earth has been given to me.'"},
    {"reference": "Matthew 28:19", "text": "Go therefore and make disciples of all nations, baptizing them in the name of the Father and of the Son and of the Holy Spirit."},
    {"reference": "Matthew 28:20", "text": "Teaching them to observe all that I have commanded you. And behold, I am with you always, to the end of the age."},
    {"reference": "Acts 1:8", "text": "But you will receive power when the Holy Spirit has come upon you, and you will be my witnesses in Jerusalem and in all Judea and Samaria, and to the end of the earth."},
    {"reference": "Psalm 2:8", "text": "Ask of me, and I will make the nations your heritage, and the ends of the earth your possession."},
    {"reference": "Genesis 12:3", "text": "I will bless those who bless you, and him who dishonors you I will curse, and in you all the families of the earth shall be blessed."},
    {"reference": "Isaiah 2:2", "text": "It shall come to pass in the latter days that the mountain of the house of the LORD shall be established as the highest of the mountains, and shall be lifted up above the hills; and all the nations shall flow to it."},
    {"reference": "Matthew 24:14", "text": "And this gospel of the kingdom will be proclaimed throughout the whole world as a testimony to all nations, and then the end will come."},
    {"reference": "Revelation 7:9", "text": "After this I looked, and behold, a great multitude that no one could number, from every nation, from all tribes and peoples and languages, standing before the throne and before the Lamb."},
    {"reference": "Habakkuk 2:14", "text": "For the earth will be filled with the knowledge of the glory of the LORD as the waters cover the sea."}
  ],
  "ja": [
    {"reference": "第1ヨハネ 3:1", "text": "御父がどんなにわたしたちを愛してくださっているか、考えてみなさい。わたしたちは、神の子と呼ばれるほどである。事実、わたしたちは神の子である。"},
    {"reference": "ヨハネ 1:12", "text": "しかし、彼を受け入れた者、すなわち、その名を信じた人々には、彼は神の子となる力を与えたのである。"},
    {"reference": "ローマ 8:15", "text": "あなたがたは、再び恐れをいだかせる奴隷の霊を受けたのではなく、子たる身分を授ける霊を受けたのである。その霊によって、わたしたちは「アバ、父よ」と呼ぶのである。"},
    {"reference": "ガラテヤ 4:6-7", "text": "このように、あなたがたは子であるのだから、神はわたしたちの心の中に、「アバ、父よ」と呼ぶ御子の霊を送って下さったのである。したがって、あなたがたはもはや奴隷ではなく、子である。"},
    {"reference": "エペソ 1:5", "text": "御旨のよしとするところに従い、イエス・キリストによって、わたしたちを御子としようと、あらかじめ定めて下さったのである。"},
    {"reference": "エペソ 5:1", "text": "だから、神に愛されている子供として、神にならう者になりなさい。"},
    {"reference": "第2コリント 6:18", "text": "また、わたしはあなたがたの父となり、あなたがたはわたしのむすこ、むすめとなる。全能の主が、こう言われる。"},
    {"reference": "イザヤ 43:4", "text": "わたしの目には、あなたは価高く、尊い。わたしはあなたを愛している。だからわたしは人の命をあなたの代りとし、もろもろの民をあなたの命の代りとする。"},
    {"reference": "エレミヤ 31:3", "text": "主は遠くからわたしに現れて言われた、「わたしは限りなき愛をもってあなたを愛している。それゆえ、わたしは絶えずあなたに真実をつくしてきた。」"},
    {"reference": "ゼパニヤ 3:17", "text": "あなたの神、主はあなたのうちにいまし、勇士であって、勝利を与えられる。彼はあなたのために喜び楽しみ、その愛によってあなたを新しくし、祭の日のようにあなたのために喜び呼ばわられる。"},
    {"reference": "ローマ 8:19", "text": "被造物は、実に、切なる思いで神の子たちの出現を待ち望んでいる。"},
    {"reference": "ローマ 8:21", "text": "被造物自身にも、滅びのなわめから解放されて、神の子たちの栄光の自由に入る望みが残されているからである。"},
    {"reference": "ローマ 8:30", "text": "そして、あらかじめ定めた者たちを更に呼び、呼んだ者たちを更に義とし、義とした者たちには、更に栄光を与えて下さったのである。"},
    {"reference": "マタイ 5:14", "text": "あなたがたは、世の光である。山の上にある町は隠れることができない。"},
    {"reference": "マタイ 5:16", "text": "そのように、あなたがたの光を人々の前に輝かしなさい。人々が、あなたがたのよい行いを見て、天にいますあなたがたの父をあがめるようになるためである。"},
    {"reference": "イザヤ 60:1", "text": "起きよ、光を放て。あなたの光が来て、主の栄光があなたの上にのぼったからである。"},
    {"reference": "ピリピ 2:15", "text": "それは、あなたがたが責められるところのない純真な者となり、曲った邪悪な時代の中にあって、傷のない神の子となるためである。あなたがたは、いのちの言葉を堅く持って、彼らの間で星のようにこの世に輝いている。"},
    {"reference": "第1ペテロ 2:9", "text": "しかし、あなたがたは、選ばれた種族、祭司の国、聖なる国民、神につける民である。それによって、暗やみから驚くべきみ光に招き入れて下さったかたのみわざを、あなたがたが語り伝えるためである。"},
    {"reference": "第2コリント 3:18", "text": "わたしたちはみな、顔おおいなしに、主の栄光を鏡に映すように見つつ、栄光から栄光へと、主と同じ姿に変えられていく。これは霊なる主の働きによるのである。"},
    {"reference": "エペソ 2:10", "text": "わたしたちは神の作品であって、良い行いをするように、キリスト・イエスにあって造られたのである。神は、わたしたちが、良い行いをして日を過ごすようにと、あらかじめそなえて下さったのである。"},
    {"reference": "マタイ 28:18", "text": "イエスは彼らに近づいてきて言われた、「わたしは、天においても地においても、いっさいの権威を授けられた。」"},
    {"reference": "マタイ 28:19", "text": "それゆえに、あなたがたは行って、すべての国民を弟子として、父と子と聖霊との名によって、彼らにバプテスマを施し、"},
    {"reference": "マタイ 28:20", "text": "あなたがたに命じておいたいっさいのことを守るように教えよ。見よ、わたしは世の終りまで、いつもあなたがたと共にいるのである。"},
    {"reference": "使徒 1:8", "text": "ただ、聖霊があなたがたにくだる時、あなたがたは力を受けて、エルサレム、ユダヤとサマリヤの全土、さらに地のはてまで、わたしの証人となるであろう。"},
    {"reference": "詩篇 2:8", "text": "わたしに求めよ、わたしはもろもろの国を嗣業としておまえに与え、地のはてまでもおまえの所有として与える。"},
    {"reference": "創世記 12:3", "text": "あなたを祝福する者をわたしは祝福し、あなたをのろう者をわたしはのろう。地のすべてのやからは、あなたによって祝福される。"},
    {"reference": "イザヤ 2:2", "text": "終りの日に次のことが起る。主の家の山は、もろもろの山のかしらとして堅く立ち、もろもろの峰よりも高くそびえ、すべて国の人々はこれに流れてくる。"},
    {"reference": "マタイ 24:14", "text": "そしてこの御国の福音は、すべての民に対してあかしをするために、全世界に宣べ伝えられるであろう。そしてそれから最後が来るのである。"},
    {"reference": "黙示録 7:9", "text": "その後、わたしが見ていると、見よ、あらゆる国民、部族、民族、国語のうちから、数えきれないほどの大ぜいの群衆が、御座と小羊との前に立ち、"},
    {"reference": "ハバクク 2:14", "text": "水が海をおおっているように、主の栄光を知る知識が地に満ちるからである。"}
  ]
}

def main():
    import json
    
    # Process zh-TW specifically because it has 30 verses in verses_zh
    verses_zh_data = [
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
        {"reference": "彼得前書 2:9", "text": "惟有你們是被揀選的族類，是有君尊的祭司，是聖潔的國度，是屬神的子民，要叫你們宣揚那召那召你們出黑暗入奇妙光明者的美德。"},
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
    verses_translations["zh-TW"] = verses_zh_data
    title_desc["zh-TW"] = {
        "title": "身分的覺醒到榮耀顯現",
        "desc": "這是一個非常美好的主題。這 30 節經文將幫助我們從「身分的覺醒」走向「榮耀的顯現」，最終達成「門訓列國」的使命。"
    }

    files = [
        ("verses.js", "zh-TW"),
        ("verses_kjv.js", "en"),
        ("verses_ja.js", "ja")
    ]
    
    for filename, lang in files:
        filepath = os.path.join("/Users/davidhwang/Projects/verserain-web/verserain-web/src", filename)
        if not os.path.exists(filepath):
            print(f"File not found: {filepath}")
            continue
            
        print(f"Processing {filename} ({lang})...")
        
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
            
        if f"identity-manifestation-mission-{lang}" in content:
            print(f"Set already exists in {filename}, skipping.")
            continue
            
        title = title_desc[lang]["title"]
        desc = title_desc[lang]["desc"]
        verses = verses_translations[lang]
        
        translated_verses = []
        for i, v in enumerate(verses):
            ref = v['reference'].replace('"', '\\"').replace('\\n', '')
            txt = v['text'].replace('"', '\\"').replace('\\n', '')
            title_esc = title.replace('"', '\\"').replace('\\n', '')
            
            translated_verses.append(f'      {{ id: "imm-{lang}-{i+1}", reference: "{ref}", title: "{title_esc}", text: "{txt}" }}')
            
        verses_str = ",\n".join(translated_verses)
        
        new_set = f"""
  ,{{
    id: "identity-manifestation-mission-{lang}",
    title: "{title}",
    description: "{desc}",
    language: "{lang}",
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
