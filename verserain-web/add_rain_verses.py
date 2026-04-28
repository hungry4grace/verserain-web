import json
import re
import os

verses_data = [
    {
        "ref_cuv": "申命記 32:2", "ref_en": "Deuteronomy 32:2",
        "cuv": "我的教訓要淋漓如雨；我的言語要滴落如露，如細雨降在嫩草上，如甘霖降在菜蔬中。",
        "kjv": "My doctrine shall drop as the rain, my speech shall distil as the dew, as the small rain upon the tender herb, and as the showers upon the grass:",
        "ko": "나의 교훈은 내리는 비요 나의 말은 맺히는 이슬이요 연한 풀 위에 내리는 가는 비요 채소 위에 내리는 단비로다",
        "ja": "わたしの教は雨のように降り、わたしの言葉は露のようにしたたるであろう。若草の上の小雨のように、青草の上の夕立のように。",
        "fa": "تعلیم من مثل باران خواهد بارید و کلام من مثل شبنم خواهد چکید. مانند باران ریز بر گیاه تازه و مثل رگبار بر سبزه‌زار.",
        "he": "יַעֲרֹף כַּמָּטָר לִקְחִי תִּזַּל כַּטַּל אִמְרָתִי כִּשְׂעִירִם עֲלֵי־דֶשֶׁא וְכִרְבִיבִים עֲלֵי־עֵשֶׂב׃"
    },
    {
        "ref_cuv": "以賽亞書 55:10-11", "ref_en": "Isaiah 55:10-11",
        "cuv": "雨雪從天而降，並不返回，卻滋潤地土，使地上發芽結實，使撒種的有種，使要吃的有糧。我口所出的話也必如此，決不徒然返回，卻要成就我所喜悅的，在我發他去成就的事上必然亨通。",
        "kjv": "For as the rain cometh down, and the snow from heaven, and returneth not thither, but watereth the earth, and maketh it bring forth and bud, that it may give seed to the sower, and bread to the eater: So shall my word be that goeth forth out of my mouth: it shall not return unto me void, but it shall accomplish that which I please, and it shall prosper in the thing whereto I sent it.",
        "ko": "비와 눈이 하늘에서 내려서는 다시 그리로 가지 않고 토지를 적시어서 싹이 나게 하며 열매가 맺게 하여 파종하는 자에게 종자를 주며 먹는 자에게 양식을 줌과 같이 내 입에서 나가는 말도 헛되이 내게로 돌아오지 아니하고 나의 뜻을 이루며 나의 명하여 보낸 일에 형통하리라",
        "ja": "雨や雪が天から降って、もとに帰らず、必ず地を潤し、それに物を生えさせ、芽を出させ、種まく者に種を与え、食べる者に糧を与えるように、わたしの口から出る言葉も、むなしくわたしに帰らない。わたしの喜ぶところのものをなし、わたしが命じ送った事を果す。",
        "fa": "زیرا چنانکه باران و برف از آسمان می‌بارد و به آنجا برنمی‌گردد، بلکه زمین را سیراب کرده، آن را بارور و سرسبز می‌سازد، و به برزگر تخم و به خورنده نان می‌بخشد، کلام من نیز که از دهانم صادر می‌گردد چنین خواهد بود. نزد من بی‌ثمر برنخواهد گشت، بلکه آنچه را که اراده کرده‌ام به انجام خواهد رسانید و در آنچه آن را فرستاده‌ام، کامران خواهد شد.",
        "he": "כִּי כַּאֲשֶׁר יֵרֵד הַגֶּשֶׁם וְהַשֶּׁלֶג מִן־הַשָּׁמַיִם וְשָׁמָּה לֹא יָשׁוּב כִּי אִם־הִרְוָה אֶת־הָאָרֶץ וְהוֹלִידָהּ וְהִצְמִיחָהּ וְנָתַן זֶרַע לַזֹּרֵעַ וְלֶחֶם לָאֹכֵל׃ כֵּן יִהְיֶה דְבָרִי אֲשֶׁר יֵצֵא מִפִּי לֹא־יָשׁוּב אֵלַי רֵיקָם כִּי אִם־עָשָׂה אֶת־אֲשֶׁר חָפַצְתִּי וְהִצְלִיחַ אֲשֶׁר שְׁלַחְתִּיו׃"
    },
    {
        "ref_cuv": "何西阿書 6:3", "ref_en": "Hosea 6:3",
        "cuv": "我們務要認識耶和華，竭力追求認識他。他出現確如晨光；他必臨到我們像甘雨，像滋潤田地的春雨。",
        "kjv": "Then shall we know, if we follow on to know the LORD: his going forth is prepared as the morning; and he shall come unto us as the rain, as the latter and former rain unto the earth.",
        "ko": "그러므로 우리가 여호와를 알자 힘써 여호와를 알자 그의 나오심은 새벽 빛 같이 일정하니 비와 같이, 땅을 적시는 늦은 비와 같이 우리에게 임하시리라 하리라",
        "ja": "私たちは主を知ろう。主を知ることを追い求めよう。主は暁のように必ず現れ、大雨のように、後の雨が地を潤すように、私たちのもとに来られる。",
        "fa": "پس یهوه را بشناسیم و در شناختن او بکوشیم. طلوع او مثل فجر، یقینی است و او مثل باران بر ما خواهد آمد، مانند باران بهاری که زمین را سیراب می‌کند.",
        "he": "וְנֵדְעָה נִרְדְּפָה לָדַעַת אֶת־יְהוָה כְּשַׁחַר נָכוֹן מוֹצָאוֹ וְיָבוֹא כַגֶּשֶׁם לָנוּ כְּמַלְקוֹשׁ יוֹרֶה אָרֶץ׃"
    },
    {
        "ref_cuv": "詩篇 72:6", "ref_en": "Psalm 72:6",
        "cuv": "他必降臨，像雨降在已割的草地上，如甘霖滋潤田地。",
        "kjv": "He shall come down like rain upon the mown grass: as showers that water the earth.",
        "ko": "저는 벤 풀에 내리는 비 같이, 땅을 적시는 소낙비 같이 임하리니",
        "ja": "彼は刈り取った草の上に降る雨のように、地を潤す夕立のように下り、",
        "fa": "او مثل باران بر علفزارهای چیده شده نزول خواهد کرد، و مانند رگبارهایی که زمین را سیراب می‌سازد.",
        "he": "יֵרֵד כְּמָטָר עַל־גֵּז כִּרְבִיבִים זַרְזִיף אָרֶץ׃"
    },
    {
        "ref_cuv": "詩篇 133:3", "ref_en": "Psalm 133:3",
        "cuv": "又像黑門的甘露降在錫安山；因為在那裡有耶和華所命定的福，就是永遠的生命。",
        "kjv": "As the dew of Hermon, and as the dew that descended upon the mountains of Zion: for there the LORD commanded the blessing, even life for evermore.",
        "ko": "헐몬의 이슬이 시온의 산들에 내림 같도다 거기서 여호와께서 복을 명하셨나니 곧 영생이로다",
        "ja": "またヘルモンの露がシオンの山に下るようだ。主はそこに祝福を、すなわち、とこしえの命を命じられたからである。",
        "fa": "مثل شبنم حَرمون است که بر کوههای صهیون فرود می‌آید. زیرا در آنجا خداوند برکت خود را فرموده است، یعنی حیات را تا ابدالآباد.",
        "he": "כְּטַל־חֶרְמוֹן שֶׁיֹּרֵד עַל־הַרְרֵי צִיּוֹן כִּי שָׁם צִוָּה יְהוָה אֶת־הַבְּרָכָה חַיִּים עַד־הָעוֹלָם׃"
    },
    {
        "ref_cuv": "約伯記 29:22-23", "ref_en": "Job 29:22-23",
        "cuv": "我說話之後，他們就不再說；我的言語像雨露滴在他們身上。他們仰望我如仰望雨，又張開口如切慕春雨。",
        "kjv": "After my words they spake not again; and my speech dropped upon them. And they waited for me as for the rain; and they opened their mouth wide as for the latter rain.",
        "ko": "내가 말한 후에는 그들이 다시 말하지 못하였나니 나의 말이 그들에게 무리 지어 내림이라 그들이 나 바라기를 비 같이 하였으며 늦은 비를 기다리듯 입을 벌렸느니라",
        "ja": "わたしが語った後は、彼らは再び語らなかった。わたしの言葉は彼らの上に露のようにしたたり、彼らは雨を待つようにわたしを待ち、後の雨を慕うように、口をあけて待った。",
        "fa": "پس از سخنانم، ایشان دیگر سخن نمی‌گفتند و کلام من بر ایشان می‌چکید. برای من انتظار می‌کشیدند چنانکه برای باران، و دهان خود را باز می‌کردند چنانکه برای باران بهاری.",
        "he": "אַחֲרֵי־דְבָרִי לֹא יִשְׁנוּ וְעָלֵימוֹ תִּטֹּף מִלָּתִי׃ וְיִחֲלוּ כַמָּטָר לִי וּפִיהֶם פָּעֲרוּ לְמַלְקוֹשׁ׃"
    },
    {
        "ref_cuv": "彌迦書 5:7", "ref_en": "Micah 5:7",
        "cuv": "雅各餘剩的人必在多國的民中，如從耶和華那裡降下的露水，又如甘霖降在草上；不仗賴人，也不等候世人之子。",
        "kjv": "And the remnant of Jacob shall be in the midst of many people as a dew from the LORD, as the showers upon the grass, that tarrieth not for man, nor waiteth for the sons of men.",
        "ko": "야곱의 남은 자는 많은 백성 중에 있으리니 그들은 여호와에게서 내리는 이슬 같고 풀 위에 내리는 단비 같아서 사람을 기다리지 아니하며 인생을 기다리지 아니할 것이며",
        "ja": "ヤコブの残りの者は、多くの民の間にあって、主から下る露のごとく、青草の上に降る夕立のようである。これは人に望みをおかず、人の子らに期待をかけない。",
        "fa": "و بقیه یعقوب در میان قومهای بسیار، مانند شبنمی از جانب خداوند و مثل رگبار بر گیاه خواهند بود، که برای انسان انتظار نمی‌کشند و برای بنی‌آدم صبر نمی‌کنند.",
        "he": "וְהָיָה שְׁאֵרִית יַעֲקֹב בְּקֶרֶב עַמִּים רַבִּים כְּטַל מֵאֵת יְהוָה כִּרְבִיבִים עֲלֵי־עֵשֶׂב אֲשֶׁר לֹא־יְקַוֶּה לְאִישׁ וְלֹא יְיַחֵל לִבְנֵי אָדָם׃"
    },
    {
        "ref_cuv": "以賽亞書 58:11", "ref_en": "Isaiah 58:11",
        "cuv": "耶和華也必時常引導你，在乾旱之地使你心滿意足，骨頭強壯。你必像澆灌的園子，又像噴泉的水，源源不絕。",
        "kjv": "And the LORD shall guide thee continually, and satisfy thy soul in drought, and make fat thy bones: and thou shalt be like a watered garden, and like a spring of water, whose waters fail not.",
        "ko": "나 여호와가 너를 항상 인도하여 마른 곳에서도 네 영혼을 만족케 하며 네 뼈를 견고케 하리니 너는 물 댄 동산 같겠고 물이 끊어지지 아니하는 샘 같을 것이라",
        "ja": "主は常にあなたを導き、干ばつの時にもあなたの魂を飽かせ、あなたの骨を強くされる。あなたは潤された園のように、水のかれない泉のようになる。",
        "fa": "و خداوند تو را همیشه هدایت خواهد نمود و جان تو را در خشکسالی‌ها سیر کرده، استخوانهایت را قوت خواهد بخشید. و تو مثل باغ سیراب و مانند چشمه آبی که آبش هرگز قطع نشود خواهی بود.",
        "he": "וְנָחֲךָ יְהוָה תָּמִיד וְהִשְׂבִּיעַ בְּצַחְצָחוֹת נַפְשֶׁךָ וְעַצְמֹתֶיךָ יַחֲלִיץ וְהָיִיתָ כְּגַן רָוֶה וּכְמוֹצָא מַיִם אֲשֶׁר לֹא־יְכַזְּבוּ מֵימָיו׃"
    },
    {
        "ref_cuv": "耶利米書 31:12", "ref_en": "Jeremiah 31:12",
        "cuv": "他們要來到錫安的高處歌唱，又流歸耶和華享用美物……他們的心必像澆灌的園子；他們也不再有一點愁煩。",
        "kjv": "Therefore they shall come and sing in the height of Zion, and shall flow together to the goodness of the LORD, for wheat, and for wine, and for oil, and for the young of the flock and of the herd: and their soul shall be as a watered garden; and they shall not sorrow any more at all.",
        "ko": "그들이 와서 시온의 높은 곳에서 찬송하며 여호와의 은사 곧 곡식과 새 포도주와 기름과 어린 양의 떼와 소의 떼에 모일 것이라 그 심령은 물 댄 동산 같겠고 다시는 근심이 없으리로다 할지어다",
        "ja": "彼らは来て、シオンの高き所で喜び歌い、主の恵み、すなわち穀物、新しいぶどう酒、油、羊の群れ、牛の群れに向かって流れのように来る。彼らの魂は潤された園のようになり、彼らは再び悲しむことはない。",
        "fa": "ایشان آمده، بر بلندی‌های صهیون ترنم خواهند نمود و به سوی احسان خداوند، برای غله و شراب تازه و روغن و بره‌های گله و گوساله‌های رمه روان خواهند شد. و جان ایشان مثل باغ سیراب خواهد بود و دیگر هرگز محزون نخواهند گردید.",
        "he": "וּבָאוּ וְרִנְּנוּ בִמְרוֹם־צִיּוֹן וְנָהֲרוּ אֶל־טוּב יְהוָה עַל־דָּגָן וְעַל־תִּירוֹשׁ וְעַל־יִצְהָר וְעַל־בְּנֵי־צֹאן וּבָקָר וְהָיְתָה נַפְשָׁם כְּגַן רָוֶה וְלֹא־יוֹסִיפוּ לְדַאֲבָה עוֹד׃"
    },
    {
        "ref_cuv": "詩篇 65:10", "ref_en": "Psalm 65:10",
        "cuv": "你澆透地的犁溝，潤平犁脊，降甘霖，使地軟和；其中發長的，蒙你賜福。",
        "kjv": "Thou waterest the ridges thereof abundantly: thou settlest the furrows thereof: thou makest it soft with showers: thou blessest the springing thereof.",
        "ko": "주께서 밭고랑에 물을 넉넉히 대사 그 이랑을 평평하게 하시며 또 단비로 부드럽게 하시고 그 구역에 복을 주시나이다",
        "ja": "あなたはそのあぜを豊かに潤し、そのうねを平らにし、夕立をもってそれを柔らかにし、その生え出るものを祝福されます。",
        "fa": "شیارهای آن را به فراوانی سیراب می‌کنی و کلوخهایش را هموار می‌سازی. با رگبارها آن را نرم می‌کنی و رویش آن را برکت می‌دهی.",
        "he": "תְּלָמֶיהָ רַוֵּה נַחֵת גְּדוּדֶיהָ בִּרְבִיבִים תְּמֹגְגֶנָּה צִמְחָהּ תְּבָרֵךְ׃"
    },
    {
        "ref_cuv": "詩篇 1:3", "ref_en": "Psalm 1:3",
        "cuv": "他要像一棵樹栽在溪水旁，按時候結果子，葉子也不枯乾。凡他所做的盡都順利。",
        "kjv": "And he shall be like a tree planted by the rivers of water, that bringeth forth his fruit in his season; his leaf also shall not wither; and whatsoever he doeth shall prosper.",
        "ko": "저는 시냇가에 심은 나무가 시절을 좇아 과실을 맺으며 그 잎사귀가 마르지 아니함 같으니 그 행사가 다 형통하리로다",
        "ja": "そのような人は流れのほとりに植えられた木のようである。季節が来ると実を結び、その葉は枯れることがない。そのなすところは皆栄える。",
        "fa": "او مثل درختی است که بر نهرهای آب نشانده شده، که میوه خود را در موسمش می‌دهد و برگش خزان نمی‌کند، و هر آنچه می‌کند فرخنده می‌شود.",
        "he": "וְהָיָה כְּעֵץ שָׁתוּל עַל־פַּלְגֵי מָיִם אֲשֶׁר פִּרְיוֹ יִתֵּן בְּעִתּוֹ וְעָלֵהוּ לֹא־יִבּוֹל וְכֹל אֲשֶׁר־יַעֲשֶׂה יַצְלִיחַ׃"
    },
    {
        "ref_cuv": "耶利米書 17:8", "ref_en": "Jeremiah 17:8",
        "cuv": "他必像樹栽於水旁，在河邊扎根，炎熱來到，並不懼怕，葉子仍必青翠，在乾旱之年毫無掛慮，而且結果不止。",
        "kjv": "For he shall be as a tree planted by the waters, and that spreadeth out her roots by the river, and shall not see when heat cometh, but her leaf shall be green; and shall not be careful in the year of drought, neither shall cease from yielding fruit.",
        "ko": "그는 물 가에 심기운 나무가 그 뿌리를 강변에 뻗치고 더위가 올찌라도 두려워 아니하며 그 잎이 청청하며 가무는 해에도 걱정이 없고 결실이 그치지 아니함 같으리라",
        "ja": "彼は水ほとりに植えられた木のようで、その根を川ぎわにのばし、暑さの来るのを見恐れず、その葉は常に青く、ひでりの年にも憂えることなく、実を結ぶことをやまない。",
        "fa": "زیرا مثل درختی خواهد بود که نزد آبها غرس شده، و ریشه‌های خود را به نهر آب دوانیده باشد. چون گرما بیاید نخواهد ترسید، بلکه برگش سبز خواهد بود، و در سال خشکسالی اندیشه نخواهد کرد و از میوه آوردن باز نخواهد ایستاد.",
        "he": "וְהָיָה כְּעֵץ שָׁתוּל עַל־מַיִם וְעַל־יוּבַל יְשַׁלַּח שָׁרָשָׁיו וְלֹא יִרְאֶה כִּי־יָבֹא חֹם וְהָיָה עָלֵהוּ רַעֲנָן וּבִשְׁנַת בַּצֹּרֶת לֹא יִדְאָג וְלֹא יָמִישׁ מֵעֲשׂוֹת פֶּרִי׃"
    },
    {
        "ref_cuv": "箴言 19:12", "ref_en": "Proverbs 19:12",
        "cuv": "王的憤怒好像獅子吼叫；他的恩典卻如草上的露水。",
        "kjv": "The king's wrath is as the roaring of a lion; but his favour is as dew upon the grass.",
        "ko": "왕의 노함은 사자의 부르짖음 같고 그의 은택은 풀 위의 이슬 같으니라",
        "ja": "王の怒りはししのほえるようである、しかしその恵みは草に置く露のようである。",
        "fa": "غضب پادشاه مثل غرش شیر است، اما خشنودی او مانند شبنم بر گیاه می‌باشد.",
        "he": "נַהַם כַּכְּפִיר זַעַף מֶלֶךְ וּכְטַל עַל־עֵשֶׂב רְצוֹנוֹ׃"
    },
    {
        "ref_cuv": "約珥書 2:23", "ref_en": "Joel 2:23",
        "cuv": "錫安的民哪，你們要快樂，為耶和華——你們的神歡喜；因他賜給你們合宜的秋雨，為你們降下甘霖，就是秋雨、春雨，和先前一樣。",
        "kjv": "Be glad then, ye children of Zion, and rejoice in the LORD your God: for he hath given you the former rain moderately, and he will cause to come down for you the rain, the former rain, and the latter rain in the first month.",
        "ko": "시온의 자녀들아 너희는 너희 하나님 여호와로 인하여 기뻐하며 즐거워할찌어다 그가 너희를 위하여 비를 내리시되 이른 비를 너희에게 적당하게 주시리니 이른 비와 늦은 비가 예전과 같을 것이라",
        "ja": "シオンの子らよ、あなたがたの神、主によって楽しみ喜べ。主はあなたがたを義とするために、秋の雨を与え、また、あなたのために雨を降らせ、前のように、秋の雨と春の雨とを降らせられる。",
        "fa": "ای پسران صهیون، شادمان شوید و در یهوه خدای خود تفریح نمایید، زیرا که باران پاییزی را به عدالت به شما می‌دهد، و باران یعنی باران پاییزی و باران بهاری را مثل اول برای شما می‌باراند.",
        "he": "וּבְנֵי צִיּוֹן גִּילוּ וְשִׂמְחוּ בַּיהוָה אֱלֹהֵיכֶם כִּי־נָתַן לָכֶם אֶת־הַמּוֹרֶה לִצְדָקָה וַיּוֹרֶד לָכֶם גֶּשֶׁם מוֹרֶה וּמַלְקוֹשׁ בָּרִאשׁוֹן׃"
    },
    {
        "ref_cuv": "以西結書 34:26", "ref_en": "Ezekiel 34:26",
        "cuv": "我必使他們與我山的四圍成為福源，我也必按時降下甘霖，那必是賜福的陣雨。",
        "kjv": "And I will make them and the places round about my hill a blessing; and I will cause the shower to come down in his season; there shall be showers of blessing.",
        "ko": "내가 그들에게 복을 내리며 내 산 사면 모든 곳도 복되게 하여 때를 따라 비를 내리되 복된 장마 비를 내리리라",
        "ja": "わたしは彼らと、わが山の周囲とに祝福を与える。わたしは季節にしたがって雨を降らせる。それは祝福の雨となる。",
        "fa": "و ایشان و اطراف کوه خود را برکت خواهم ساخت، و باران را در موسمش خواهم بارانید. بارانهای برکت خواهد بود.",
        "he": "וְנָתַתִּי אוֹתָם וּסְבִיבוֹת גִּבְעָתִי בְּרָכָה וְהוֹרַדְתִּי הַגֶּשֶׁם בְּעִתּוֹ גִּשְׁמֵי בְרָכָה יִהְיוּ׃"
    },
    {
        "ref_cuv": "以賽亞書 44:3", "ref_en": "Isaiah 44:3",
        "cuv": "因為我要將水澆灌口渴的人，將河注入乾旱之地。我要將我的靈澆灌你的後裔，將我的福澆灌你的子孫。",
        "kjv": "For I will pour water upon him that is thirsty, and floods upon the dry ground: I will pour my spirit upon thy seed, and my blessing upon thine offspring:",
        "ko": "대저 내가 갈한 자에게 물을 주며 마른 땅에 시내가 흐르게 하며 나의 신을 네 자손에게, 나의 복을 네 후손에게 내리리니",
        "ja": "わたしは、かわいた地に水を注ぎ、干からびた地に流れを注ぎ、わが霊をあなたの子孫に注ぎ、わが祝福をあなたのすえに注ぐからである。",
        "fa": "زیرا من بر تشنه آب خواهم ریخت و بر زمین خشک نهرها؛ روح خود را بر ذریت تو خواهم ریخت و برکت خویش را بر نسل تو.",
        "he": "כִּי אֶצָּק־מַיִם עַל־צָמֵא וְנֹזְלִים עַל־יַבָּשָׁה אֶצֹּק רוּחִי עַל־זַרְעֶךָ וּבִרְכָתִי עַל־צֶאֱצָאֶיךָ׃"
    },
    {
        "ref_cuv": "希伯來書 6:7", "ref_en": "Hebrews 6:7",
        "cuv": "就如一塊田地，吃過屢次下的雨水，生長菜蔬，合乎耕種的人用，就從神得福。",
        "kjv": "For the earth which drinketh in the rain that cometh oft upon it, and bringeth forth herbs meet for them by whom it is dressed, receiveth blessing from God:",
        "ko": "땅이 그 위에 자주 내리는 비를 흡수하여 밭 가는 자들의 쓰기에 합당한 채소를 내면 하나님께 복을 받고",
        "ja": "土地は、その上に度々降る雨を吸い込んで、これを耕す人々に役立つ農作物を生えさせるなら、神の祝福にあずかる。",
        "fa": "زیرا زمینی که بارانی را که مکرراً بر آن می‌بارد می‌آشامد، و برای کسانی که به جهت آنها شیار می‌شود نباتات مفید می‌آورد، از خدا برکت می‌یابد.",
        "he": "כִּי אֶרֶץ אֲשֶׁר תִּשְׁתֶּה הַגֶּשֶׁם הַיֹּרֵד עָלֶיהָ לָרֹב וּמוֹצִיאָה עֵשֶׂב טוֹב לָאֵלֶּה אֲשֶׁר נֶעֶבְדָה בַעֲבוּרָם תִּשָּׂא בְרָכָה מֵאֵת אֱלֹהִים׃"
    },
    {
        "ref_cuv": "撒迦利亞書 10:1", "ref_en": "Zechariah 10:1",
        "cuv": "當春雨的時候，你們要向發閃電的耶和華求雨。他必為眾人降下甘霖，使田園生長菜蔬。",
        "kjv": "Ask ye of the LORD rain in the time of the latter rain; so the LORD shall make bright clouds, and give them showers of rain, to every one grass in the field.",
        "ko": "봄비 때에 여호와 곧 번개를 내는 여호와께 비를 구하라 무리에게 소낙비를 내려서 밭의 채소를 각 사람에게 주리라",
        "ja": "春の雨の時に、主に向かって雨を求めよ。主は稲妻を造り、人々に夕立を与え、すべての人に野の草を与えられる。",
        "fa": "در موسم باران بهاری، از خداوند باران بطلبید. خداوندی که برقها را می‌سازد و رگبارها را به ایشان می‌دهد، و به هر کس گیاه را در مزرعه می‌بخشد.",
        "he": "שַׁאֲלוּ מֵיְהוָה מָטָר בְּעֵת מַלְקוֹשׁ יְהוָה עוֹשֶׂה חֲזִיזִים וּמְטַר־גֶּשֶׁם יִתֵּן לָהֶם לְאִישׁ עֵשֶׂב בַּשָּׂדֶה׃"
    },
    {
        "ref_cuv": "詩篇 147:8", "ref_en": "Psalm 147:8",
        "cuv": "他用雲遮天，為地預備雨水，使草生長在山上。",
        "kjv": "Who covereth the heaven with clouds, who prepareth rain for the earth, who maketh grass to grow upon the mountains.",
        "ko": "저가 구름으로 하늘을 덮으시며 땅을 위하여 비를 예비하시며 산에 풀이 자라게 하시며",
        "ja": "主は雲をもって天をおおい、地のために雨を備え、山々に草をはえさせ、",
        "fa": "او آسمانها را با ابرها می‌پوشاند و باران را برای زمین مهیا می‌سازد، و گیاه را بر کوهها می‌رویاند.",
        "he": "הַמְכַסֶּה שָׁמַיִם בְּעָבִים הַמֵּכִין לָאָרֶץ מָטָר הַמַּצְמִיחַ הָרִים חָצִיר׃"
    }
]

file_map = {
    'src/verses.js': {'lang': 'cuv', 'ref': 'ref_cuv', 'title': "聖經中有關經文雨的經文", 'desc': "這是一組關於上帝的話語如雨露滋潤、帶來生命與生長的聖經經文。"},
    'src/verses_kjv.js': {'lang': 'kjv', 'ref': 'ref_en', 'title': "Verses about Rain", 'desc': "A collection of verses about God's word being like rain and dew, bringing life and growth."},
    'src/verses_ko.js': {'lang': 'ko', 'ref': 'ref_cuv', 'title': "성경에 나오는 비에 관한 구절들", 'desc': "하나님의 말씀이 비와 이슬처럼 생명과 성장을 가져다준다는 성경 구절 모음입니다."},
    'src/verses_ja.js': {'lang': 'ja', 'ref': 'ref_cuv', 'title': "聖書における雨に関する聖句", 'desc': "神の言葉が雨や露のように命と成長をもたらすということに関する聖句のコレクション。"},
    'src/verses_fa.js': {'lang': 'fa', 'ref': 'ref_en', 'title': "آیات مربوط به باران", 'desc': "مجموعه‌ای از آیات درباره اینکه کلام خدا مانند باران و شبنم است و زندگی و رشد می‌آورد."},
    'src/verses_he.js': {'lang': 'he', 'ref': 'ref_en', 'title': "פסוקים על מטר בתנ״ך", 'desc': "אוסף פסוקים על כך שדבר אלוהים הוא כמו מטר וטל המביא חיים וצמיחה."}
}

for filepath, info in file_map.items():
    if not os.path.exists(filepath):
        continue
    
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    verses_arr = []
    for i, v in enumerate(verses_data):
        verses_arr.append(f"""  {{
    "id": "rain-{i+1}",
    "reference": "{v[info['ref']]}",
    "title": "{info['title']}",
    "text": "{v[info['lang']]}"
  }}""")
    
    verses_json = ",\n".join(verses_arr)
    
    new_set = f""",
    {{
        id: "rain-verses",
        title: "{info['title']}",
        description: "{info['desc']}",
        verses: [
{verses_json}
        ]
    }}
]"""
    
    # We replace the last "]" or "];" with the new set.
    # Note that some files might have "]\n    },\n]" or something similar.
    # We find the last closing bracket for VERSE_SETS.
    
    # Simple regex to replace the last `]` or `];` in the file.
    # Actually, let's just find the last `]` before export/end.
    # A safer way: replace `\n]` with `\n] // end` and insert before it.
    
    parts = content.rsplit('\n]', 1)
    if len(parts) == 2:
        new_content = parts[0] + new_set + parts[1]
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Updated {filepath}")
    else:
        print(f"Could not find the end of the array in {filepath}")

