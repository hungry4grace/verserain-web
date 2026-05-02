import os
import re

title_desc = {
  "zh-TW": {
      "title": "身分的覺醒到榮耀顯現",
      "desc": "這是一個非常美好的主題。這 30 節經文將幫助我們從「身分的覺醒」走向「榮耀的顯現」，最終達成「門訓列國」的使命。"
  },
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
  "zh-TW": [
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
  ],
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
  ],
  "es": [
    {"reference": "1 Juan 3:1", "text": "Mirad cuál amor nos ha dado el Padre, para que seamos llamados hijos de Dios; por esto el mundo no nos conoce, porque no le conoció a él."},
    {"reference": "Juan 1:12", "text": "Mas a todos los que le recibieron, a los que creen en su nombre, les dio potestad de ser hechos hijos de Dios."},
    {"reference": "Romanos 8:15", "text": "Pues no habéis recibido el espíritu de esclavitud para estar otra vez en temor, sino que habéis recibido el espíritu de adopción, por el cual clamamos: ¡Abba, Padre!"},
    {"reference": "Gálatas 4:6-7", "text": "Y por cuanto sois hijos, Dios envió a vuestros corazones el Espíritu de su Hijo, el cual clama: ¡Abba, Padre! Así que ya no eres esclavo, sino hijo."},
    {"reference": "Efesios 1:5", "text": "en amor habiéndonos predestinado para ser adoptados hijos suyos por medio de Jesucristo, según el puro afecto de su voluntad,"},
    {"reference": "Efesios 5:1", "text": "Sed, pues, imitadores de Dios como hijos amados."},
    {"reference": "2 Corintios 6:18", "text": "Y seré para vosotros por Padre, Y vosotros me seréis hijos e hijas, dice el Señor Todopoderoso."},
    {"reference": "Isaías 43:4", "text": "Porque a mis ojos fuiste de gran estima, fuiste honorable, y yo te amé; daré, pues, hombres por ti, y naciones por tu vida."},
    {"reference": "Jeremías 31:3", "text": "Jehová se manifestó a mí hace ya mucho tiempo, diciendo: Con amor eterno te he amado; por tanto, te prolongué mi misericordia."},
    {"reference": "Sofonías 3:17", "text": "Jehová en medio de ti, poderoso, él salvará; se gozará sobre ti con alegría, callará de amor, se regocijará sobre ti con cánticos."},
    {"reference": "Romanos 8:19", "text": "Porque el anhelo ardiente de la creación es el aguardar la manifestación de los hijos de Dios."},
    {"reference": "Romanos 8:21", "text": "porque también la creación misma será libertada de la esclavitud de corrupción, a la libertad gloriosa de los hijos de Dios."},
    {"reference": "Romanos 8:30", "text": "Y a los que predestinó, a éstos también llamó; y a los que llamó, a éstos también justificó; y a los que justificó, a éstos también glorificó."},
    {"reference": "Mateo 5:14", "text": "Vosotros sois la luz del mundo; una ciudad asentada sobre un monte no se puede esconder."},
    {"reference": "Mateo 5:16", "text": "Así alumbre vuestra luz delante de los hombres, para que vean vuestras buenas obras, y glorifiquen a vuestro Padre que está en los cielos."},
    {"reference": "Isaías 60:1", "text": "Levántate, resplandece; porque ha venido tu luz, y la gloria de Jehová ha nacido sobre ti."},
    {"reference": "Filipenses 2:15", "text": "para que seáis irreprensibles y sencillos, hijos de Dios sin mancha en medio de una generación maligna y perversa, en medio de la cual resplandecéis como luminares en el mundo;"},
    {"reference": "1 Pedro 2:9", "text": "Mas vosotros sois linaje escogido, real sacerdocio, nación santa, pueblo adquirido por Dios, para que anunciéis las virtudes de aquel que os llamó de las tinieblas a su luz admirable;"},
    {"reference": "2 Corintios 3:18", "text": "Por tanto, nosotros todos, mirando a cara descubierta como en un espejo la gloria del Señor, somos transformados de gloria en gloria en la misma imagen, como por el Espíritu del Señor."},
    {"reference": "Efesios 2:10", "text": "Porque somos hechura suya, creados en Cristo Jesús para buenas obras, las cuales Dios preparó de antemano para que anduviésemos en ellas."},
    {"reference": "Mateo 28:18", "text": "Y Jesús se acercó y les habló diciendo: Toda potestad me es dada en el cielo y en la tierra."},
    {"reference": "Mateo 28:19", "text": "Por tanto, id, y haced discípulos a todas las naciones, bautizándolos en el nombre del Padre, y del Hijo, y del Espíritu Santo;"},
    {"reference": "Mateo 28:20", "text": "enseñándoles que guarden todas las cosas que os he mandado; y he aquí yo estoy con vosotros todos los días, hasta el fin del mundo. Amén."},
    {"reference": "Hechos 1:8", "text": "pero recibiréis poder, cuando haya venido sobre vosotros el Espíritu Santo, y me seréis testigos en Jerusalén, en toda Judea, en Samaria, y hasta lo último de la tierra."},
    {"reference": "Salmos 2:8", "text": "Pídeme, y te daré por herencia las naciones, Y como posesión tuya los confines de la tierra."},
    {"reference": "Génesis 12:3", "text": "Bendeciré a los que te bendijeren, y a los que te maldijeren maldeciré; y serán benditas en ti todas las familias de la tierra."},
    {"reference": "Isaías 2:2", "text": "Acontecerá en lo postrero de los tiempos, que será confirmado el monte de la casa de Jehová como cabeza de los montes, y será exaltado sobre los collados, y correrán a él todas las naciones."},
    {"reference": "Mateo 24:14", "text": "Y será predicado este evangelio del reino en todo el mundo, para testimonio a todas las naciones; y entonces vendrá el fin."},
    {"reference": "Apocalipsis 7:9", "text": "Después de esto miré, y he aquí una gran multitud, la cual nadie podía contar, de todas naciones y tribus y pueblos y lenguas, que estaban delante del trono y en la presencia del Cordero."},
    {"reference": "Habacuc 2:14", "text": "Porque la tierra será llena del conocimiento de la gloria de Jehová, como las aguas cubren el mar."}
  ],
  "ko": [
    {"reference": "요한1서 3:1", "text": "보라 아버지께서 어떠한 사랑을 우리에게 베푸사 하나님의 자녀라 일컬음을 받게 하셨는가, 우리가 그러하도다."},
    {"reference": "요한복음 1:12", "text": "영접하는 자 곧 그 이름을 믿는 자들에게는 하나님의 자녀가 되는 권세를 주셨으니"},
    {"reference": "로마서 8:15", "text": "너희는 다시 무서워하는 종의 영을 받지 아니하고 양자의 영을 받았으므로 우리가 아빠 아버지라고 부르짖느니라"},
    {"reference": "갈라디아서 4:6-7", "text": "너희가 아들이므로 하나님이 그 아들의 영을 우리 마음 가운데 보내사 아빠 아버지라 부르게 하셨느니라 그러므로 네가 이 후로는 종이 아니요 아들이니"},
    {"reference": "에베소서 1:5", "text": "그 기쁘신 뜻대로 우리를 예정하사 예수 그리스도로 말미암아 자기의 아들들이 되게 하셨으니"},
    {"reference": "에베소서 5:1", "text": "그러므로 사랑을 받는 자녀 같이 너희는 하나님을 본받는 자가 되고"},
    {"reference": "고린도후서 6:18", "text": "너희에게 아버지가 되고 너희는 내게 자녀가 되리라 전능하신 주의 말씀이니라 하셨느니라"},
    {"reference": "이사야 43:4", "text": "네가 내 눈에 보배롭고 존귀하며 내가 너를 사랑하였은즉 내가 네 대신 사람들을 내어 주며 백성들이 네 생명을 대신하리니"},
    {"reference": "예레미야 31:3", "text": "옛적에 여호와께서 나에게 나타나사 내가 영원한 사랑으로 너를 사랑하기에 인자함으로 너를 이끌었다 하였노라"},
    {"reference": "스바냐 3:17", "text": "너의 하나님 여호와가 너의 가운데에 계시니 그는 구원을 베푸실 전능자이시라 그가 너로 말미암아 기쁨을 이기지 못하시며 너를 잠잠히 사랑하시며 너로 말미암아 즐거이 부르며 기뻐하시리라 하리라"},
    {"reference": "로마서 8:19", "text": "피조물이 고대하는 바는 하나님의 아들들이 나타나는 것이니"},
    {"reference": "로마서 8:21", "text": "그 바라는 것은 피조물도 썩어짐의 종 노릇 한 데서 해방되어 하나님의 자녀들의 영광의 자유에 이르는 것이니라"},
    {"reference": "로마서 8:30", "text": "또 미리 정하신 그들을 또한 부르시고 부르신 그들을 또한 의롭다 하시고 의롭다 하신 그들을 또한 영화롭게 하셨느니라"},
    {"reference": "마태복음 5:14", "text": "너희는 세상의 빛이라 산 위에 있는 동네가 숨겨지지 못할 것이요"},
    {"reference": "마태복음 5:16", "text": "이같이 너희 빛이 사람 앞에 비치게 하여 그들로 너희 착한 행실을 보고 하늘에 계신 너희 아버지께 영광을 돌리게 하라"},
    {"reference": "이사야 60:1", "text": "일어나라 빛을 발하라 이는 네 빛이 이르렀고 여호와의 영광이 네 위에 임하였음이니라"},
    {"reference": "빌립보서 2:15", "text": "이는 너희가 흠이 없고 순전하여 어그러지고 거스르는 세대 가운데서 하나님의 흠 없는 자녀로 세상에서 그들 가운데 빛들로 나타내며"},
    {"reference": "베드로전서 2:9", "text": "그러나 너희는 택하신 족속이요 왕 같은 제사장들이요 거룩한 나라요 그의 소유가 된 백성이니 이는 너희를 어두운 데서 불러 내어 그의 기이한 빛에 들어가게 하신 이의 아름다운 덕을 선포하게 하려 하심이라"},
    {"reference": "고린도후서 3:18", "text": "우리가 다 수건을 벗은 얼굴로 거울을 보는 것 같이 주의 영광을 보매 그와 같은 형상으로 변화하여 영광에서 영광에 이르니 곧 주의 영으로 말미암음이니라"},
    {"reference": "에베소서 2:10", "text": "우리는 그가 만드신 바라 그리스도 예수 안에서 선한 일을 위하여 지으심을 받은 자니 이 일은 하나님이 전에 예비하사 우리로 그 가운데서 행하게 하려 하심이니라"},
    {"reference": "마태복음 28:18", "text": "예수께서 나아와 말씀하여 이르시되 하늘과 땅의 모든 권세를 내게 주셨으니"},
    {"reference": "마태복음 28:19", "text": "그러므로 너희는 가서 모든 민족을 제자로 삼아 아버지와 아들과 성령의 이름으로 세례를 베풀고"},
    {"reference": "마태복음 28:20", "text": "내가 너희에게 분부한 모든 것을 가르쳐 지키게 하라 볼지어다 내가 세상 끝날까지 너희와 항상 함께 있으리라 하시니라"},
    {"reference": "사도행전 1:8", "text": "오직 성령이 너희에게 임하시면 너희가 권능을 받고 예루살렘과 온 유대와 사마리아와 땅 끝까지 이르러 내 증인이 되리라 하시니라"},
    {"reference": "시편 2:8", "text": "내게 구하라 내가 이방 나라를 네 유업으로 주리니 네 소유가 땅 끝까지 이르리로다"},
    {"reference": "창세기 12:3", "text": "너를 축복하는 자에게는 내가 복을 내리고 너를 저주하는 자에게는 내가 저주하리니 땅의 모든 족속이 너로 말미암아 복을 얻을 것이라 하신지라"},
    {"reference": "이사야 2:2", "text": "말일에 여호와의 전의 산이 모든 산 꼭대기에 굳게 설 것이요 모든 작은 산 위에 뛰어나리니 만방이 그리로 모여들 것이라"},
    {"reference": "마태복음 24:14", "text": "이 천국 복음이 모든 민족에게 증언되기 위하여 온 세상에 전파되리니 그제야 끝이 오리라"},
    {"reference": "요한계시록 7:9", "text": "이 일 후에 내가 보니 각 나라와 족속과 백성과 방언에서 아무도 능히 셀 수 없는 큰 무리가 나와 흰 옷을 입고 손에 종려 가지를 들고 보좌 앞과 어린 양 앞에 서서"},
    {"reference": "하박국 2:14", "text": "이는 물이 바다를 덮음 같이 여호와의 영광을 인정하는 것이 세상에 가득함이니라"}
  ],
  "de": [
    {"reference": "1 Johannes 3:1", "text": "Seht, welch eine Liebe hat uns der Vater erzeigt, dass wir Gottes Kinder heißen sollen - und wir sind es auch!"},
    {"reference": "Johannes 1:12", "text": "Wie viele ihn aber aufnahmen, denen gab er Macht, Gottes Kinder zu werden, denen, die an seinen Namen glauben;"},
    {"reference": "Römer 8:15", "text": "Denn ihr habt nicht einen Geist der Knechtschaft empfangen, dass ihr euch abermals fürchten müsstet; sondern ihr habt einen Geist der Kindschaft empfangen, durch den wir rufen: Abba, lieber Vater!"},
    {"reference": "Galater 4:6-7", "text": "Weil ihr nun Kinder seid, hat Gott den Geist seines Sohnes gesandt in unsre Herzen, der da ruft: Abba, lieber Vater! So bist du nun nicht mehr Knecht, sondern Kind."},
    {"reference": "Epheser 1:5", "text": "und hat uns dazu vorherbestimmt, seine Kinder zu sein durch Jesus Christus nach dem Wohlgefallen seines Willens,"},
    {"reference": "Epheser 5:1", "text": "So folgt nun Gottes Beispiel als die geliebten Kinder"},
    {"reference": "2 Korinther 6:18", "text": "und will euer Vater sein und ihr sollt meine Söhne und Töchter sein, spricht der allmächtige Herr."},
    {"reference": "Jesaja 43:4", "text": "Weil du in meinen Augen so wertvoll bist und ich dich ehre und liebe, gebe ich Menschen an deiner Stelle und Völker für dein Leben."},
    {"reference": "Jeremia 31:3", "text": "Der HERR ist mir erschienen von ferne: Ich habe dich je und je geliebt, darum habe ich dich zu mir gezogen aus lauter Güte."},
    {"reference": "Zefanja 3:17", "text": "Denn der HERR, dein Gott, ist in deiner Mitte, ein Held, der rettet. Er wird sich über dich freuen mit Wonne, er wird schweigen in seiner Liebe, er wird über dich jubeln mit Jauchzen."},
    {"reference": "Römer 8:19", "text": "Denn das sehnsüchtige Harren der Schöpfung wartet auf die Offenbarung der Kinder Gottes."},
    {"reference": "Römer 8:21", "text": "dass auch die Schöpfung frei werden wird von der Knechtschaft der Vergänglichkeit zu der herrlichen Freiheit der Kinder Gottes."},
    {"reference": "Römer 8:30", "text": "Die er aber vorherbestimmt hat, die hat er auch berufen; die er aber berufen hat, die hat er auch gerecht gemacht; die er aber gerecht gemacht hat, die hat er auch verherrlicht."},
    {"reference": "Matthäus 5:14", "text": "Ihr seid das Licht der Welt. Es kann die Stadt, die auf einem Berge liegt, nicht verborgen sein."},
    {"reference": "Matthäus 5:16", "text": "So lasst euer Licht leuchten vor den Leuten, damit sie eure guten Werke sehen und euren Vater im Himmel preisen."},
    {"reference": "Jesaja 60:1", "text": "Mache dich auf, werde licht; denn dein Licht kommt, und die Herrlichkeit des HERRN geht auf über dir!"},
    {"reference": "Philipper 2:15", "text": "damit ihr ohne Tadel und unlauter seid, Gottes Kinder, makellos inmitten eines verdrehten und verkehrten Geschlechts, unter welchem ihr leuchtet als Lichter in der Welt,"},
    {"reference": "1 Petrus 2:9", "text": "Ihr aber seid ein auserwähltes Geschlecht, ein königliches Priestertum, ein heiliges Volk, ein Volk des Eigentums, dass ihr verkündigen sollt die Wohltaten dessen, der euch berufen hat von der Finsternis zu seinem wunderbaren Licht;"},
    {"reference": "2 Korinther 3:18", "text": "Wir alle aber spiegeln mit aufgedecktem Angesicht die Herrlichkeit des Herrn wider, und wir werden verwandelt in sein Bild von einer Herrlichkeit zur andern von dem Herrn, der der Geist ist."},
    {"reference": "Epheser 2:10", "text": "Denn wir sind sein Werk, geschaffen in Christus Jesus zu guten Werken, die Gott zuvor bereitet hat, dass wir darin wandeln sollen."},
    {"reference": "Matthäus 28:18", "text": "Und Jesus trat herzu und sprach zu ihnen: Mir ist gegeben alle Gewalt im Himmel und auf Erden."},
    {"reference": "Matthäus 28:19", "text": "Darum gehet hin und machet zu Jüngern alle Völker: Taufet sie auf den Namen des Vaters und des Sohnes und des Heiligen Geistes"},
    {"reference": "Matthäus 28:20", "text": "und lehret sie halten alles, was ich euch befohlen habe. Und siehe, ich bin bei euch alle Tage bis an der Welt Ende."},
    {"reference": "Apostelgeschichte 1:8", "text": "aber ihr werdet die Kraft des Heiligen Geistes empfangen, der auf euch kommen wird, und werdet meine Zeugen sein in Jerusalem und in ganz Judäa und Samarien und bis an das Ende der Erde."},
    {"reference": "Psalm 2:8", "text": "Bitte mich, so will ich dir Völker zum Erbe geben und der Welt Enden zum Eigentum."},
    {"reference": "1 Mose 12:3", "text": "Ich will segnen, die dich segnen, und verfluchen, die dich verfluchen; und in dir sollen gesegnet werden alle Geschlechter auf Erden."},
    {"reference": "Jesaja 2:2", "text": "Es wird zur letzten Zeit der Berg, da des HERRN Haus ist, fest stehen, höher als alle Berge und über alle Hügel erhaben, und alle Heiden werden herzulaufen,"},
    {"reference": "Matthäus 24:14", "text": "Und es wird gepredigt werden dies Evangelium vom Reich in der ganzen Welt zum Zeugnis für alle Völker, und dann wird das Ende kommen."},
    {"reference": "Offenbarung 7:9", "text": "Danach sah ich, und siehe, eine große Schar, die niemand zählen konnte, aus allen Nationen und Stämmen und Völkern und Sprachen; die standen vor dem Thron und vor dem Lamm,"},
    {"reference": "Habakuk 2:14", "text": "Denn die Erde wird voll werden von Erkenntnis der Ehre des HERRN, wie Wasser das Meer bedeckt."}
  ],
  "tr": [
    {"reference": "1 Yuhanna 3:1", "text": "Bakın, Baba bizi o kadar çok seviyor ki, bize 'Tanrı'nın çocukları' deniyor! Ve gerçekten de öyleyiz."},
    {"reference": "Yuhanna 1:12", "text": "Ancak, kendisini kabul edip adına iman edenlerin hepsine Tanrı'nın çocukları olma hakkını verdi."},
    {"reference": "Romalılar 8:15", "text": "Sizi tekrar korkuya sürükleyecek kölelik ruhunu almadınız, evlatlık ruhunu aldınız. Bu ruhla, 'Abba, Baba!' diye sesleniriz."},
    {"reference": "Galatyalılar 4:6-7", "text": "Oğullar olduğunuz için Tanrı, 'Abba, Baba!' diye seslenen Oğlu'nun Ruhunu yüreklerinize gönderdi. Bu nedenle artık köle değil, oğulsun."},
    {"reference": "Efesliler 1:5", "text": "Kendi isteği ve iyi amacı uyarınca İsa Mesih aracılığıyla bizi kendine oğullar evlat edinmeyi önceden belirledi."},
    {"reference": "Efesliler 5:1", "text": "Bu nedenle, sevgili çocuklar olarak Tanrı'yı örnek alın."},
    {"reference": "2 Korintliler 6:18", "text": "Her Şeye Gücü Yeten Rab diyor ki, 'Ben size Baba olacağım, siz de bana oğullar ve kızlar olacaksınız.'"},
    {"reference": "Yeşaya 43:4", "text": "Gözümde değerli ve saygın olduğun, seni sevdiğim için, senin yerine insanlar, canın yerine halklar vereceğim."},
    {"reference": "Yeremya 31:3", "text": "Seni sonsuz bir sevgiyle sevdim, bu yüzden sana olan sadakatimi sürdürdüm."},
    {"reference": "Sefanya 3:17", "text": "Tanrın RAB seninledir, O kurtaran bir kahramandır. Seninle büyük sevinç duyacak, sevgisiyle seni yenileyecek, senin için sevinç çığlıkları atacak."},
    {"reference": "Romalılar 8:19", "text": "Yaratılış, Tanrı oğullarının ortaya çıkmasını büyük bir özlemle bekliyor."},
    {"reference": "Romalılar 8:21", "text": "Yaratılışın kendisi de yozlaşmanın köleliğinden kurtulup Tanrı çocuklarının yüce özgürlüğüne kavuşacaktır."},
    {"reference": "Romalılar 8:30", "text": "Önceden belirlediklerini çağırdı, çağırdıklarını akladı, akladıklarını da yüceltti."},
    {"reference": "Matta 5:14", "text": "Dünyanın ışığı sizsiniz. Tepeye kurulan kent gizlenemez."},
    {"reference": "Matta 5:16", "text": "Sizin ışığınız da insanların önünde öyle parlasın ki, iyi işlerinizi görerek göklerdeki Babanız'ı yüceltsinler."},
    {"reference": "Yeşaya 60:1", "text": "Kalk, parla; çünkü ışığın geldi, RAB'bin yüceliği senin üzerine doğdu."},
    {"reference": "Filipililer 2:15", "text": "Öyle ki, yaşam sözüne sımsıkı sarılarak bu eğri ve sapık kuşağın ortasında kusursuz ve saf, Tanrı'nın lekesiz çocukları olasınız. Onların arasında dünyada yıldızlar gibi parlıyorsunuz."},
    {"reference": "1 Petrus 2:9", "text": "Ama siz seçilmiş soy, Kral'ın kâhinleri, kutsal ulus, Tanrı'nın öz halkısınız. Sizi karanlıktan şaşılası ışığına çağıran Tanrı'nın erdemlerini duyurmak için seçildiniz."},
    {"reference": "2 Korintliler 3:18", "text": "Ve hepimiz peçesiz yüzle Rab'bin yüceliğini yansıtarak, Rab olan Ruh'un aracılığıyla aynı öze, yücelik üstüne yücelikle dönüştürülüyoruz."},
    {"reference": "Efesliler 2:10", "text": "Çünkü biz Tanrı'nın yapıtıyız, O'nun önceden hazırladığı iyi işleri yapmak üzere Mesih İsa'da yaratıldık."},
    {"reference": "Matta 28:18", "text": "İsa yanlarına gelip onlara şöyle dedi: 'Gökte ve yeryüzünde bütün yetki bana verildi.'"},
    {"reference": "Matta 28:19", "text": "Bu nedenle gidin, bütün ulusları öğrencilerim olarak yetiştirin; onları Baba, Oğul ve Kutsal Ruh'un adıyla vaftiz edin."},
    {"reference": "Matta 28:20", "text": "Size buyurduğum her şeye uymayı onlara öğretin. İşte ben, dünyanın sonuna dek her an sizinle birlikteyim."},
    {"reference": "Elçilerin İşleri 1:8", "text": "Ama Kutsal Ruh üzerinize inince güç alacaksınız; Yeruşalim'de, bütün Yahudiye ve Samiriye'de ve dünyanın dört bucağında benim tanıklarım olacaksınız."},
    {"reference": "Mezmur 2:8", "text": "Dile benden, miras olarak sana ulusları, mülk olarak yeryüzünün uçlarını vereyim."},
    {"reference": "Yaratılış 12:3", "text": "Seni kutsayanları kutsayacağım, seni lanetleyeni lanetleyeceğim. Yeryüzündeki bütün halklar senin aracılığınla kutsanacak."},
    {"reference": "Yeşaya 2:2", "text": "Son günlerde RAB'bin Tapınağı'nın kurulduğu dağ, dağların en yücesi, tepelerin en yükseği olacak; Bütün uluslar oraya akın edecek."},
    {"reference": "Matta 24:14", "text": "Göksel egemenliğin bu müjdesi bütün uluslara bir tanıklık olmak üzere dünyanın her yerinde duyurulacak. İşte o zaman son gelecektir."},
    {"reference": "Vahiy 7:9", "text": "Bundan sonra baktım, tahtın ve Kuzu'nun önünde her ulustan, her oymaktan, her halktan, her dilden oluşan, kimsenin sayamayacağı kadar büyük bir kalabalık duruyordu."},
    {"reference": "Habakkuk 2:14", "text": "Sular denizi nasıl dolduruyorsa, dünya da RAB'bin yüceliğinin bilgisiyle öyle dolacak."}
  ],
  "fa": [
    {"reference": "اول یوحنا 3:1", "text": "ببینید پدر چه محبتی به ما ارزانی داشته تا فرزندان خدا خوانده شویم، و چنین نیز هستیم."},
    {"reference": "یوحنا 1:12", "text": "اما به همۀ کسانی که او را پذیرفتند و به نام او ایمان آوردند، این حق را داد که فرزندان خدا شوند."},
    {"reference": "رومیان 8:15", "text": "زیرا شما روح بندگی را نیافتید تا باز در ترس گرفتار شوید، بلکه روح پسرخواندگی را یافتید که به واسطۀ آن ندا در می‌دهیم: 'ابا، ای پدر!'"},
    {"reference": "غلاطیان 4:6-7", "text": "و چون پسر هستید، خدا روح پسر خود را در دلهای ما فرستاد که ندا در می‌دهد: 'ابا، ای پدر!' پس دیگر غلام نیستی، بلکه پسری."},
    {"reference": "افسسیان 1:5", "text": "او بر حسب خشنودی ارادۀ خود، ما را از پیش تعیین کرد تا به واسطۀ عیسی مسیح به پسرخواندگی او درآییم."},
    {"reference": "افسسیان 5:1", "text": "پس همچون فرزندانِ عزیز، سرمشق از خدا بگیرید."},
    {"reference": "دوم قرنتیان 6:18", "text": "و من شما را پدر خواهم بود، و شما مرا پسران و دختران خواهید بود، خداوند قادر مطلق می‌گوید."},
    {"reference": "اشعیا 43:4", "text": "از آنجا که در چشمان من گرانبها و محترم هستی و من تو را دوست می‌دارم، پس مردمان را به جای تو و قومها را به فدیۀ جانت خواهم داد."},
    {"reference": "ارمیا 31:3", "text": "خداوند از دور بر من ظاهر شد و گفت: 'با محبتی ازلی تو را دوست داشته‌ام؛ بنابراین با رحمت تو را به سوی خود کشیده‌ام.'"},
    {"reference": "صفنیا 3:17", "text": "یهوه خدایت در میان توست، او دلاوری است که نجات می‌بخشد؛ او به خاطر تو با شادمانی وجد خواهد کرد، و در محبت خود تو را آرامش خواهد داد، و با سرودخوانی بر تو شادی خواهد نمود."},
    {"reference": "رومیان 8:19", "text": "زیرا آفرینش با انتظارِ مشتاقانه، چشم‌به‌راهِ ظهورِ پسرانِ خداست."},
    {"reference": "رومیان 8:21", "text": "که خودِ آفرینش نیز از قیدِ فساد رهایی خواهد یافت و در آزادیِ پرجلالِ فرزندانِ خدا شریک خواهد شد."},
    {"reference": "رومیان 8:30", "text": "و آنان را که از پیش تعیین کرد، ایشان را نیز فرا‌خواند؛ و آنان را که فرا‌خواند، ایشان را نیز پارسا شمرد؛ و آنان را که پارسا شمرد، ایشان را نیز جلال داد."},
    {"reference": "متی 5:14", "text": "شما نور جهانید. شهری که بر کوهی بنا شود، پنهان نتواند ماند."},
    {"reference": "متی 5:16", "text": "بگذارید نور شما بر مردم بتابد تا کارهای نیکوی شما را ببینند و پدر شما را که در آسمان است، جلال دهند."},
    {"reference": "اشعیا 60:1", "text": "برخیز و درخشان شو، زیرا نور تو فرا‌رسیده، و جلال خداوند بر تو طلوع کرده است."},
    {"reference": "فیلیپیان 2:15", "text": "تا بی‌عیب و معصوم باشید، فرزندانِ بی‌تکلفِ خدا در میانِ نسلی کجرو و منحرف، که در میانِ ایشان همچون ستارگان در جهان می‌درخشید."},
    {"reference": "اول پطرس 2:9", "text": "اما شما دودمانی برگزیده، و کهانتی ملوکانه، و امتی مقدس، و قومی که مِلکِ خاصِ خداست هستید، تا فضایلِ او را که شما را از تاریکی به نورِ حیرت‌انگیزِ خود فرا‌خوانده است، اعلام کنید."},
    {"reference": "دوم قرنتیان 3:18", "text": "و همۀ ما که با چهرۀ بی‌نقاب، جلالِ خداوند را چون آینه منعکس می‌کنیم، به همان شکلِ او از جلال تا به جلال دگرگون می‌شویم، و این از سوی خداوند است که روح می‌باشد."},
    {"reference": "افسسیان 2:10", "text": "زیرا ما شاهکارِ او هستیم که در مسیحْ عیسی آفریده شده‌ایم تا کارهای نیکی را که خدا از پیش مهیا کرده بود تا در آنها گام برداریم، انجام دهیم."},
    {"reference": "متی 28:18", "text": "عیسی پیش آمد و به ایشان گفت: 'تمامی قدرت در آسمان و بر زمین به من سپرده شده است.'"},
    {"reference": "متی 28:19", "text": "پس بروید و همۀ قومها را شاگرد سازید و ایشان را به نام پدر و پسر و روح‌القدس تعمید دهید،"},
    {"reference": "متی 28:20", "text": "و به ایشان تعلیم دهید که هرآنچه به شما فرمان داده‌ام، نگاه دارند. و اینک من هر روزه تا انقضای عالم با شما هستم."},
    {"reference": "اعمال رسولان 1:8", "text": "اما چون روح‌القدس بر شما آید، قدرت خواهید یافت و در اورشلیم و در تمامی یهودیه و سامره و تا اقصای زمین، شاهدان من خواهید بود."},
    {"reference": "مزامیر 2:8", "text": "از من بخواه، و من قومها را میراثِ تو، و اقصای زمین را مِلکِ تو خواهم ساخت."},
    {"reference": "پیدایش 12:3", "text": "برکت خواهم داد به کسانی که تو را برکت دهند، و لعنت خواهم کرد کسی را که تو را لعنت کند؛ و در تو تمامی قبایلِ زمین برکت خواهند یافت."},
    {"reference": "اشعیا 2:2", "text": "و در ایامِ آخر واقع خواهد شد که کوهِ خانۀ خداوند بر قلۀ کوهها استوار خواهد گشت، و بر فرازِ تپه‌ها برافراشته خواهد شد، و تمامی قومها به سوی آن روان خواهند گشت."},
    {"reference": "متی 24:14", "text": "و این انجیلِ پادشاهی در سرتاسرِ جهان موعظه خواهد شد تا شهادتی برای همۀ قومها باشد، و آنگاه پایان فرا خواهد رسید."},
    {"reference": "مکاشفه 7:9", "text": "پس از این نگاه کردم، و اینک جمعیتی عظیم که هیچ‌کس نمی‌توانست آنها را بشمارد، از هر قوم و قبیله و امت و زبان، پیشِ روی تخت و پیشِ روی بره ایستاده بودند."},
    {"reference": "حبقوق 2:14", "text": "زیرا چنانکه آبها دریا را می‌پوشانند، زمین از معرفتِ جلالِ خداوند پر خواهد شد."}
  ],
  "he": [
    {"reference": "1 יוחנן 3:1", "text": "ראו איזו אהבה נתן לנו האב, שניקרא ילדי אלוהים! וכאלה אנחנו."},
    {"reference": "יוחנן 1:12", "text": "אבל לכל אלה שקיבלו אותו, למאמינים בשמו, נתן את הזכות להיות ילדי אלוהים."},
    {"reference": "רומים 8:15", "text": "הרי לא קיבלתם רוח של עבדות כדי לשוב ולפחד, אלא קיבלתם רוח של אימוץ לבנים, שבה אנו קוראים: 'אבא, אבינו!'"},
    {"reference": "גלטים 4:6-7", "text": "ומכיוון שאתם בנים, שלח אלוהים לתוך לבנו את רוח בנו, הקוראת 'אבא, אבינו!'. לכן אינך עוד עבד, אלא בן."},
    {"reference": "אפסים 1:5", "text": "הוא יעד אותנו מראש להיות לו לבנים מאומצים על-ידי ישוע המשיח, כפי רצונו הטוב,"},
    {"reference": "אפסים 5:1", "text": "לכן, חקו את אלוהים כילדים אהובים."},
    {"reference": "2 קורינתים 6:18", "text": "ואהיה לכם לאב, ואתם תהיו לי לבנים ולבנות, נאמר מאת ה' צבאות."},
    {"reference": "ישעיהו 43:4", "text": "מאשר יקרת בעיני, נכבדת ואני אהבתיך; ואתן אדם תחתיך, ולאומים תחת נפשך."},
    {"reference": "ירמיהו 31:3", "text": "מרחוק ה' נראה לי, ואהבת עולם אהבתיך; על-כן משכתיך חסד."},
    {"reference": "צפניה 3:17", "text": "ה' אלוהיך בקרבך, גיבור יושיע; ישיש עליך בשמחה, יחריש באהבתו, יגיל עליך ברינה."},
    {"reference": "רומים 8:19", "text": "הרי הבריאה מחכה בכיליון עיניים להתגלות בני האלוהים."},
    {"reference": "רומים 8:21", "text": "שגם הבריאה עצמה תשוחחר מעבדות הכיליון אל החירות והכבוד של ילדי אלוהים."},
    {"reference": "רומים 8:30", "text": "ואת אלה שיעד מראש, אותם גם קרא; ואת אשר קרא, אותם גם הצדיק; ואת אשר הצדיק, אותם גם פיאר ברוממות כבוד."},
    {"reference": "מתי 5:14", "text": "אתם אור העולם. עיר הבנויה על הר אינה יכולה להסתר."},
    {"reference": "מתי 5:16", "text": "כך יאיר אורכם לפני בני אדם, למען יראו את מעשיכם הטובים וישבחו את אביכם שבשמים."},
    {"reference": "ישעיהו 60:1", "text": "קומי אורי, כי בא אורך, וכבוד ה' עליך זרח."},
    {"reference": "פיליפים 2:15", "text": "למען תהיו תמימים וטהורים, בני אלוהים ללא דופי בתוך דור עיקש ופתלתל, אשר בתוכו אתם מאירים כמאורות בעולם."},
    {"reference": "1 פטרוס 2:9", "text": "אבל אתם עם נבחר, ממלכת כוהנים, גוי קדוש, עם סגולה, למען תספרו תהילותיו של הקורא אתכם מחושך אל אורו הנפלא."},
    {"reference": "2 קורינתים 3:18", "text": "ואנחנו כולנו, בגלוי פנים מביטים בכבוד ה' כבמראה, והופכים לאותו צלם, מכבוד אל כבוד, כפי שפועל ה' שהוא הרוח."},
    {"reference": "אפסים 2:10", "text": "הרי אנחנו יצירת כפיו, נבראנו במשיח ישוע למעשים טובים שאלוהים הכין מראש כדי שנתהלך בהם."},
    {"reference": "מתי 28:18", "text": "ישוע ניגש אליהם ודיבר איתם, באומרו: 'ניתנה לי כל סמכות בשמים ובארץ.'"},
    {"reference": "מתי 28:19", "text": "לכן לכו ועשו תלמידים מכל הגויים, והטבילו אותם לשם האב והבן ורוח הקודש,"},
    {"reference": "מתי 28:20", "text": "ולמדו אותם לשמור את כל מה שציוויתי אתכם. והנה איתכם אני כל הימים עד קץ העולם."},
    {"reference": "מעשי השליחים 1:8", "text": "אבל תקבלו גבורה בבוא רוח הקודש עליכם, ותהיו עדי בירושלים ובכל יהודה ושומרון, ועד קצה הארץ."},
    {"reference": "תהילים 2:8", "text": "שאל ממני, ואתנה גויים נחלתך, ואחוזתך אפסי-ארץ."},
    {"reference": "בראשית 12:3", "text": "ואברכה מברכיך, ומקללך אאור; ונברכו בך כל משפחות האדמה."},
    {"reference": "ישעיהו 2:2", "text": "והיה באחרית הימים, נכון יהיה הר בית-ה' בראש ההרים, ונישא מגבעות; ונהרו אליו כל-הגויים."},
    {"reference": "מתי 24:14", "text": "ובשורת המלכות הזאת תוכרז בכל העולם לעדות לכל הגויים, ואז יבוא הקץ."},
    {"reference": "התגלות 7:9", "text": "אחר כך ראיתי והנה המון רב, אשר לא יכול איש למנותו, מכל האומות והשבטים והעמים והלשונות, עומדים לפני הכיסא ולפני השה."},
    {"reference": "חבקוק 2:14", "text": "כי תמלא הארץ לדעת את כבוד ה', כמים יכסו על-ים."}
  ],
  "my": [
    {"reference": "၁ ယော ၃:၁", "text": "ငါတို့သည် ဘုရားသခင်၏ သားများဟု ခေါ်ဝေါ်ခြင်းခံရမည်အကြောင်း၊ ခမည်းတော်သည် ငါတို့ကို မည်မျှချစ်တော်မူသည်ကို ကြည့်ရှုဆင်ခြင်ကြလော့။ ငါတို့သည်လည်း ဘုရားသခင်၏ သားများ ဖြစ်ကြ၏။"},
    {"reference": "ယော ၁:၁၂", "text": "သို့သော်လည်း ကိုယ်တော်ကို လက်ခံသမျှသောသူ၊ ကိုယ်တော်၏ နာမကို ယုံကြည်သောသူတို့အား ဘုရားသခင်၏ သားများဖြစ်လာရန် အခွင့်အာဏာ ပေးတော်မူ၏။"},
    {"reference": "ရော ၈:၁۵", "text": "အကြောင်းမူကား၊ သင်တို့သည် တစ်ဖန် ကြောက်ရွံ့ခြင်းသို့ ရောက်စေမည့် ကျွန်ခံခြင်း သဘောရှိသော ဝိညာဉ်ကို မရကြ။ အဗ္ဗ၊ အဘဟု ခေါ်ဝေါ်စေသော သားအရာ၌ ခန့်ထားတော်မူခြင်း ဝိညာဉ်ကို ရကြပြီ။"},
    {"reference": "ဂလ ၄:၆-၇", "text": "သင်တို့သည် သားဖြစ်ကြသောကြောင့် ဘုရားသခင်သည် အဗ္ဗ၊ အဘဟု ခေါ်ဝေါ်သော မိမိသားတော်၏ ဝိညာဉ်ကို ငါတို့၏ နှလုံးထဲသို့ စေလွှတ်တော်မူ၏။ သို့ဖြစ်၍ သင်သည် နောက်တစ်ဖန် ကျွန်မဟုတ်၊ သားဖြစ်၏။"},
    {"reference": "ဧ ၁:၅", "text": "ထိုဘုရားသခင်သည် မိမိအလိုတော်အတိုင်း၊ ယေရှုခရစ်အားဖြင့် ငါတို့ကို မိမိ၏သားအဖြစ် မွေးစားရန် ကြိုတင်သတ်မှတ်တော်မူ၏။"},
    {"reference": "ဧ ၅:၁", "text": "ထို့ကြောင့် ချစ်လှစွာသော သားသမီးများကဲ့သို့ ဘုရားသခင်ကို အတုယူကြလော့။"},
    {"reference": "၂ ကော ၆:၁၈", "text": "ငါသည် သင်တို့၏ အဘဖြစ်မည်။ သင်တို့သည်လည်း ငါ၏ သားသမီးဖြစ်ကြလိမ့်မည်ဟု အနန္တတန်ခိုးရှင် ထာဝရဘုရား မိန့်တော်မူ၏။"},
    {"reference": "ဟေရှာ ၄၃:၄", "text": "သင်သည် ငါ့မျက်မှောက်၌ အဖိုးတန်၍ ဂုဏ်အသရေရှိသောကြောင့်၊ ငါသည် သင့်ကို ချစ်၏။ ထို့ကြောင့် သင့်အစား လူများကိုလည်းကောင်း၊ သင့်အသက်အစား လူမျိုးတို့ကိုလည်းကောင်း ငါပေးမည်။"},
    {"reference": "ယေ ၃၁:၃", "text": "ထာဝရဘုရားသည် ရှေးကာလ၌ ငါ့အား ထင်ရှားတော်မူလျက်၊ ငါသည် သင့်ကို ထာဝရမေတ္တာနှင့် ချစ်၏။ ထို့ကြောင့် ကရုဏာတော်ဖြင့် သင့်ကို ဆွဲငင်တော်မူပြီ။"},
    {"reference": "ဇေ ၃:၁၇", "text": "သင်၏ဘုရားသခင် ထာဝရဘုရားသည် သင်၏အလယ်၌ ရှိတော်မူ၏။ တန်ခိုးကြီးသော ကယ်တင်ရှင်ဖြစ်တော်မူ၏။ သင်၏အကြောင်းကြောင့် အလွန်ဝမ်းမြောက်တော်မူမည်။ မေတ္တာတော်အားဖြင့် သင့်ကို ငြိမ်သက်စေတော်မူမည်။ တေးသီချင်းဆိုလျက် သင်၏အကြောင်းကြောင့် ရွှင်လန်းတော်မူမည်။"},
    {"reference": "ရော ၈:၁၉", "text": "ဖန်ဆင်းခံအရာအားလုံးသည် ဘုရားသခင်၏ သားများ ထင်ရှားလာမည့်အချိန်ကို လွန်စွာ မျှော်လင့်စောင့်စားလျက် ရှိကြ၏။"},
    {"reference": "ရော ၈:၂၁", "text": "အကြောင်းမူကား၊ ဖန်ဆင်းခံအရာကိုယ်တိုင်သည် ဖောက်ပြန်ပျက်စီးခြင်း၏ ကျွန်ဘဝမှ လွတ်မြောက်၍ ဘုရားသခင်၏ သားသမီးများရရှိသော ဘုန်းအသရေနှင့်ပြည့်စုံသော လွတ်လပ်ခြင်းသို့ ရောက်ရလိမ့်မည်။"},
    {"reference": "ရော ၈:၃၀", "text": "ကြိုတင်သတ်မှတ်တော်မူသော သူတို့ကိုလည်း ခေါ်တော်မူ၏။ ခေါ်တော်မူသော သူတို့ကိုလည်း ဖြောင့်မတ်ရာသို့ သွင်းတော်မူ၏။ ဖြောင့်မတ်ရာသို့ သွင်းတော်မူသော သူတို့ကိုလည်း ဘုန်းအသရေကို ပေးတော်မူ၏။"},
    {"reference": "မဿဲ ၅:၁၄", "text": "သင်တို့သည် လောက၏အလင်း ဖြစ်ကြ၏။ တောင်ပေါ်၌ တည်သောမြို့ကို မကွယ်ဝှက်နိုင်။"},
    {"reference": "မဿဲ ၅:၁၆", "text": "ထိုနည်းတူ၊ သူတစ်ပါးတို့သည် သင်တို့၏ ကောင်းသောအကျင့်ကို မြင်၍ ကောင်းကင်ဘုံ၌ရှိတော်မူသော သင်တို့၏အဘကို ဘုန်းထင်ရှားစေမည့်အကြောင်း၊ သင်တို့၏အလင်းကို သူတစ်ပါးရှေ့၌ လင်းစေကြလော့။"},
    {"reference": "ဟေရှာ ၆၀:၁", "text": "ထလော့၊ လင်းလော့။ သင်၏အလင်းသည် ရောက်လာပြီ။ ထာဝရဘုရား၏ ဘုန်းတော်သည် သင်၏အပေါ်၌ ထွန်းလင်းလေပြီ။"},
    {"reference": "ဖိ ၂:၁၅", "text": "သင်တို့သည် အပြစ်ကင်းစင်၍ ဖြူစင်သောသူများ၊ ကောက်ကျစ်ဖောက်ပြန်သော လူမျိုးဆက်အလယ်၌ အပြစ်ဆိုဖွယ်မရှိသော ဘုရားသခင်၏ သားသမီးများ ဖြစ်ကြမည်အကြောင်းတည်း။ ထိုသူတို့အလယ်၌ သင်တို့သည် လောကတွင် နေလကြယ်များကဲ့သို့ ထွန်းလင်းကြ၏။"},
    {"reference": "၁ ပေ ၂:၉", "text": "သို့သော်လည်း သင်တို့သည် ရွေးကောက်တော်မူသော လူမျိုး၊ ယဇ်ပုရောဟိတ်မင်းမျိုး၊ သန့်ရှင်းသော လူမျိုး၊ ပိုင်ဆိုင်တော်မူသော လူမျိုးဖြစ်ကြ၏။ ဤသို့ဖြစ်ရခြင်းမှာ၊ သင်တို့ကို မှောင်မိုက်ထဲမှ အံ့ဩဖွယ်သော အလင်းတော်သို့ ခေါ်သွင်းတော်မူသော အရှင်၏ ဂုဏ်ကျေးဇူးတော်ကို ကြေညာစေရန် ဖြစ်၏။"},
    {"reference": "၂ ကော ၃:၁၈", "text": "ငါတို့ရှိသမျှသည် မျက်နှာဖုံးမပါဘဲ သခင်ဘုရား၏ ဘုန်းတော်ကို မှန်၌ကြည့်သကဲ့သို့ ကြည့်ရှုလျက်၊ ဝိညာဉ်တော်ဖြစ်တော်မူသော သခင်ဘုရားထံမှ လာသော ဘုန်းအသရေမှ ဘုန်းအသရေသို့ တိုးပွားကာ ထိုပုံသဏ္ဌာန်တော်အတိုင်း ပြောင်းလဲခြင်းသို့ ရောက်ကြ၏။"},
    {"reference": "ဧ ၂:၁၀", "text": "ငါတို့သည် ဘုရားသခင် ပြင်ဆင်တော်မူသော ကောင်းသောအကျင့်ကို ကျင့်စေရန် ယေရှုခရစ်၌ ဖန်ဆင်းခံရသော လက်ရာတော် ဖြစ်ကြ၏။"},
    {"reference": "မဿဲ ၂၈:၁၈", "text": "ယေရှုသည် ချဉ်းကပ်၍ 'ကောင်းကင်နှင့် မြေကြီးပေါ်မှာ ရှိသမျှသော အခွင့်အာဏာကို ငါ့အား ပေးအပ်တော်မူပြီ' ဟု မိန့်တော်မူ၏။"},
    {"reference": "မဿဲ ၂၈:၁၉", "text": "ထို့ကြောင့် သင်တို့သွား၍ လူမျိုးတကာတို့ကို တပည့်တော်ဖြစ်စေလျက်၊ ခမည်းတော်၊ သားတော်၊ သန့်ရှင်းသော ဝိညာဉ်တော်၏ နာမ၌ ဗတ္တိဇံကို ပေးကြလော့။"},
    {"reference": "မဿဲ ၂၈:၂၀", "text": "ငါသည် သင်တို့အား မိန့်မှာခဲ့သမျှကို စောင့်ရှောက်ရန် သွန်သင်ကြလော့။ ရှုလော့၊ ကမ္ဘာကုန်သည်တိုင်အောင် ငါသည် သင်တို့နှင့်အတူ အစဉ်အမြဲ ရှိနေမည်ဟု မိန့်တော်မူ၏။"},
    {"reference": "တမန် ၁:၈", "text": "သို့သော်လည်း သန့်ရှင်းသော ဝိညာဉ်တော်သည် သင်တို့အပေါ်သို့ ဆင်းသက်သောအခါ သင်တို့သည် တန်ခိုးကို ရရှိကြလိမ့်မည်။ ထိုအခါ ယေရုရှလင်မြို့၊ ယုဒပြည်တစ်ဝန်းလုံး၊ ရှမာရိပြည်မှစ၍ မြေကြီးစွန်းတိုင်အောင် ငါ၏ သက်သေဖြစ်ကြလိမ့်မည်။"},
    {"reference": "ဆာ ၂:၈", "text": "ငါ့ကို တောင်းလော့။ လူမျိုးတို့ကို သင့်အား အမွေအဖြစ်လည်းကောင်း၊ မြေကြီးစွန်းတိုင်အောင် သင့်အား ပိုင်ဆိုင်ခွင့်အဖြစ်လည်းကောင်း ငါပေးမည်။"},
    {"reference": "ကမ္ဘာ ၁၂:၃", "text": "သင့်ကို ကောင်းချီးပေးသောသူတို့ကို ငါကောင်းချီးပေးမည်။ သင့်ကို ကျိန်ဆဲသောသူကို ငါကျိန်ဆဲမည်။ မြေကြီးပေါ်ရှိ လူမျိုးအပေါင်းတို့သည် သင်အားဖြင့် ကောင်းချီးမင်္ဂလာကို ခံစားရကြလိမ့်မည်။"},
    {"reference": "ဟေရှာ ၂:၂", "text": "နောက်ဆုံးသောကာလ၌ ထာဝရဘုရား၏ အိမ်တော်တည်ရာတောင်သည် တောင်များထက် မြင့်မြတ်စွာ တည်လိမ့်မည်။ ကုန်းများထက်လည်း ချီးမြှောက်ခြင်းခံရလိမ့်မည်။ လူမျိုးခပ်သိမ်းတို့သည် ထိုတောင်သို့ စီးဝင်ကြလိမ့်မည်။"},
    {"reference": "မဿဲ ၂၄:၁၄", "text": "ဤနိုင်ငံတော်နှင့်ဆိုင်သော ဧဝံဂေလိတရားကို လူမျိုးခပ်သိမ်းတို့အား သက်သေဖြစ်စေရန် လောကတစ်ဝန်းလုံး၌ ဟောပြောရလိမ့်မည်။ ထိုအခါမှသာလျှင် အဆုံးသည် ရောက်လာလိမ့်မည်။"},
    {"reference": "ဗျာ ၇:၉", "text": "ထိုနောက် ငါကြည့်ရှုလျှင်၊ မည်သူမျှ မရေတွက်နိုင်သော လူအုပ်ကြီးသည် လူမျိုးခပ်သိမ်း၊ မျိုးနွယ်ခပ်သိမ်း၊ လူစုခပ်သိမ်း၊ ဘာသာစကားခပ်သိမ်းမှ လာ၍ ပလ္လင်တော်ရှေ့နှင့် သိုးသငယ်ရှေ့၌ ရပ်နေကြသည်ကို ငါမြင်ရ၏။"},
    {"reference": "ဟဗက္ကုတ် ၂:၁၄", "text": "ရေသည် ပင်လယ်ကို ဖုံးလွှမ်းသကဲ့သို့၊ မြေကြီးသည် ထာဝရဘုရား၏ ဘုန်းတော်ကို သိကျွမ်းခြင်းပညာနှင့် ပြည့်စုံလိမ့်မည်။"}
  ]
}

def main():
    files = [
        ("verses.js", "zh-TW"),
        ("verses_kjv.js", "en"),
        ("verses_ja.js", "ja"),
        ("verses_es.js", "es"),
        ("verses_ko.js", "ko"),
        ("verses_de.js", "de"),
        ("verses_tr.js", "tr"),
        ("verses_fa.js", "fa"),
        ("verses_he.js", "he"),
        ("verses_my.js", "my")
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
        # Find exactly where the array ends
        # `verses.js` has `];\n\n// Fallback`
        # other files generally have `];\n` or `];` at the end
        
        # We find the last `];`
        # Because in standard verses*.js, there is exactly one `export const VERSE_SETS_* = [ ... ];`
        # Wait, verses.js might have `export const VERSES_DB = VERSE_SETS[0].verses;` which doesn't have `];`
        # So we look for the last `]` that is part of `];`
        
        # Better: let's use regex to find `\n];` or `\n] ;` that closes the outermost array.
        # But wait, `\n];` might occur if there are inner arrays? The verses array doesn't have `];` it has `]`.
        # The main array has `];`.
        
        parts = content.rsplit('];', 1)
        if len(parts) == 2:
            new_content = parts[0] + new_set + "\n];" + parts[1]
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(new_content)
            print(f"Success updated {filename}")
        else:
            print(f"Could not find '];' in {filename}")

if __name__ == '__main__':
    main()
