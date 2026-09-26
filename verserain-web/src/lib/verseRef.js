// Bible reference normalization — turns a reference string in ANY bundled
// language's spelling ("創世記 1:3", "创世记 1:3", "Genesis 1:3", "Gen 1:3", …)
// into the same canonical "bookId|chapter:verse" key.
//
// Shared by the frontend (garden planting, verse lookup, bilingual display)
// and the backend (contest completion / score verification via
// api/_lib/contests.js), so a verse planted under one spelling is recognized
// under any other everywhere in the app. This used to live only in App.jsx;
// the backend's own copy of the completion check compared reference strings
// exactly, so a verse planted under a different spelling than the contest's
// snapshotted reference silently failed the "已熟練" check and denied a
// legitimate completion. Moving the real normalizer here, and having both
// sides import it, is what keeps that from happening again.
import { BIBLE_BOOKS } from '../bibleDictionary.js';

// Full Hebrew book names → book ID (1-66).
// BIBLE_BOOKS.he only stores abbreviations (e.g. "תה"), but Hebrew verse sets
// store full names (e.g. "תהילים"). This map bridges the gap.
export const HEBREW_FULL_BOOK_ID = {
  'בראשית':1,'שמות':2,'ויקרא':3,'במדבר':4,'דברים':5,
  'יהושע':6,'שופטים':7,'רות':8,
  'שמואל א':9,'א שמואל':9,'שמואל ב':10,'ב שמואל':10,
  'מלכים א':11,'א מלכים':11,'מלכים ב':12,'ב מלכים':12,
  'דברי הימים א':13,'א דברי הימים':13,'דברי הימים ב':14,'ב דברי הימים':14,
  'עזרא':15,'נחמיה':16,'אסתר':17,'איוב':18,'תהילים':19,
  'משלי':20,'קהלת':21,'שיר השירים':22,'ישעיהו':23,'ירמיהו':24,
  'איכה':25,'יחזקאל':26,'דניאל':27,'הושע':28,'יואל':29,
  'עמוס':30,'עובדיה':31,'יונה':32,'מיכה':33,'נחום':34,
  'חבקוק':35,'צפניה':36,'חגי':37,'זכריה':38,'מלאכי':39,
  'מתי':40,'מתיאוס':40,'מרקוס':41,'לוקס':42,'יוחנן':43,
  'מעשי השליחים':44,'מעשים':44,'רומים':45,
  'קורינתים א':46,'א קורינתים':46,'קורינתים ב':47,'ב קורינתים':47,
  'גלטים':48,'אפסים':49,'פיליפים':50,'קולסים':51,
  'תסלוניקים א':52,'א תסלוניקים':52,'תסלוניקים ב':53,'ב תסלוניקים':53,
  'טימותיאוס א':54,'א טימותיאוס':54,'טימותיאוס ב':55,'ב טימותיאוס':55,
  'טיטוס':56,'פילמון':57,'עברים':58,'יעקב':59,
  'פטרוס א':60,'א פטרוס':60,'פטרוס ב':61,'ב פטרוס':61,
  'יוחנן א':62,'א יוחנן':62,'יוחנן ב':63,'ב יוחנן':63,'יוחנן ג':64,'ג יוחנן':64,
  'יהודה':65,'חזון יוחנן':66,'התגלות':66,'חזון':66,

  // Spelling variants observed in verses_he.js
  'תהלים':19,                    // alt spelling of תהילים (Psalms)
  'קולוסים':51,                  // alt spelling of קולסים (Colossians)

  // ASCII-digit prefix variants: verse files sometimes write "1 יוחנן 3:1"
  // (Arabic numeral) instead of "יוחנן א:א" (Hebrew letter numeral). Both
  // forms need to resolve.
  '1 יוחנן':62,'2 יוחנן':63,'3 יוחנן':64,
  '1 קורינתים':46,'2 קורינתים':47,
  '1 פטרוס':60,'2 פטרוס':61,
  '1 שמואל':9,'2 שמואל':10,
  '1 מלכים':11,'2 מלכים':12,
  '1 דברי הימים':13,'2 דברי הימים':14,
  '1 תסלוניקים':52,'2 תסלוניקים':53,
  '1 טימותיאוס':54,'2 טימותיאוס':55,
};

// Korean Bible book full names → book id. BIBLE_BOOKS only stores 1-2 char
// abbreviations in the `ko` field (e.g. "사" for Isaiah), so references in
// the form "이사야 40:31" fail the BIBLE_BOOKS lookup → normalizeVerseReferenceKey
// returns the raw lowercased string as a key → bolls fallback can't parse a
// numeric book id → secondary language never appears for Korean-primary sets.
// This map fixes that for every Korean-primary reference.
export const KOREAN_FULL_BOOK_ID = {
  '창세기':1,'출애굽기':2,'레위기':3,'민수기':4,'신명기':5,
  '여호수아':6,'사사기':7,'룻기':8,
  '사무엘상':9,'사무엘하':10,'열왕기상':11,'열왕기하':12,
  '역대상':13,'역대하':14,'에스라':15,'느헤미야':16,'에스더':17,
  '욥기':18,'시편':19,'잠언':20,'전도서':21,'아가':22,
  '이사야':23,'예레미야':24,'예레미야애가':25,'애가':25,
  '에스겔':26,'다니엘':27,'호세아':28,'요엘':29,'아모스':30,
  '오바댜':31,'요나':32,'미가':33,'나훔':34,'하박국':35,
  '스바냐':36,'학개':37,'스가랴':38,'말라기':39,
  '마태복음':40,'마가복음':41,'누가복음':42,'요한복음':43,
  '사도행전':44,'로마서':45,
  '고린도전서':46,'고린도후서':47,
  '갈라디아서':48,'에베소서':49,'빌립보서':50,'골로새서':51,
  '데살로니가전서':52,'데살로니가후서':53,
  '디모데전서':54,'디모데후서':55,'디도서':56,'빌레몬서':57,
  '히브리서':58,'야고보서':59,
  '베드로전서':60,'베드로후서':61,
  '요한일서':62,'요한이서':63,'요한삼서':64,
  '유다서':65,'요한계시록':66,'계시록':66,
};

// Multilingual full-name → book id. BIBLE_BOOKS only stores short
// abbreviations in per-language fields (ja, de, es, tr, vi, fa, my) — but
// the verse files use full names like "マタイの福音書", "Johannes",
// "Génesis", "Yuhanna", "Giăng", "یوحنا", "ယောဟန်". Without this map
// those references can't normalize → secondary-language pairing and bolls
// fetch both fail. Entries are observed in the corresponding verses_<lang>.js
// files; add more if a new verse file introduces a new spelling.
export const MULTILANG_FULL_BOOK_ID = {
  // Japanese
  '創世記':1,'出エジプト記':2,'レビ記':3,'民数記':4,'申命記':5,
  'ヨシュア記':6,'士師記':7,'ルツ記':8,
  'サムエル記第一':9,'サムエル記第二':10,
  '列王記第一':11,'列王記第二':12,'歴代誌第一':13,'歴代誌第二':14,
  'エズラ記':15,'ネヘミヤ記':16,'エステル記':17,'ヨブ記':18,
  '詩篇':19,'箴言':20,'伝道者の書':21,'雅歌':22,
  'イザヤ書':23,'イザヤ':23,
  'エレミヤ書':24,'エレミヤ':24,'哀歌':25,'エゼキエル書':26,
  'ダニエル書':27,'ホセア書':28,'ヨエル書':29,'アモス書':30,
  'オバデヤ書':31,'ヨナ書':32,'ミカ書':33,'ナホム書':34,
  'ハバクク書':35,'ハバクク':35,'ゼパニヤ書':36,'ゼパニヤ':36,
  'ハガイ書':37,'ゼカリヤ書':38,'マラキ書':39,
  'マタイの福音書':40,'マタイ':40,'マルコの福音書':41,'マルコ':41,
  'ルカの福音書':42,'ルカ':42,'ヨハネの福音書':43,'ヨハネ':43,
  '使徒の働き':44,'使徒言行録':44,'ローマ人への手紙':45,'ローマ書':45,
  'コリント人への手紙 第一':46,'第一コリント':46,
  'コリント人への手紙 第二':47,'第二コリント':47,
  'ガラテヤ人への手紙':48,'ガラテヤ':48,
  'エペソ人への手紙':49,'エペソ':49,
  'ピリピ人への手紙':50,'ピリピ':50,
  'コロサイ人への手紙':51,'コロサイ':51,
  'テサロニケ人への手紙 第一':52,'テサロニケ人への手紙 第二':53,
  'テモテへの手紙 第一':54,'テモテへの手紙 第二':55,
  'テトスへの手紙':56,'ピレモンへの手紙':57,
  'ヘブル人への手紙':58,'ヘブル':58,'ヤコブの手紙':59,'ヤコブ':59,
  'ペテロの手紙 第一':60,'ペテロへの手紙 第一':60,
  'ペテロの手紙 第二':61,'ペテロへの手紙 第二':61,
  'ヨハネの手紙 第一':62,'ヨハネの手紙 第二':63,'ヨハネの手紙 第三':64,
  'ユダの手紙':65,'ヨハネの黙示録':66,

  // German
  'Genesis':1,'1.Mose':1,'1. Mose':1,'2.Mose':2,'2. Mose':2,'Exodus':2,
  '3.Mose':3,'3. Mose':3,'Levitikus':3,'4.Mose':4,'4. Mose':4,'Numeri':4,
  '5.Mose':5,'5. Mose':5,'Deuteronomium':5,
  'Josua':6,'Richter':7,'Rut':8,
  '1.Samuel':9,'1. Samuel':9,'2.Samuel':10,'2. Samuel':10,
  '1.Könige':11,'1. Könige':11,'2.Könige':12,'2. Könige':12,
  '1.Chronik':13,'1. Chronik':13,'2.Chronik':14,'2. Chronik':14,
  'Esra':15,'Nehemia':16,'Ester':17,'Hiob':18,
  'Psalm':19,'Psalmen':19,'Sprüche':20,'Sprichwörter':20,
  'Prediger':21,'Hoheslied':22,
  'Jesaja':23,'Jeremia':24,'Klagelieder':25,'Hesekiel':26,'Daniel':27,
  'Hosea':28,'Joel':29,'Amos':30,'Obadja':31,'Jona':32,'Micha':33,
  'Nahum':34,'Habakuk':35,'Zefanja':36,'Haggai':37,'Sacharja':38,'Maleachi':39,
  'Matthäus':40,'Markus':41,'Lukas':42,'Johannes':43,'Apostelgeschichte':44,
  'Römer':45,
  '1.Korinther':46,'1. Korinther':46,'2.Korinther':47,'2. Korinther':47,
  'Galater':48,'Epheser':49,'Philipper':50,'Kolosser':51,
  '1.Thessalonicher':52,'1. Thessalonicher':52,
  '2.Thessalonicher':53,'2. Thessalonicher':53,
  '1.Timotheus':54,'1. Timotheus':54,'2.Timotheus':55,'2. Timotheus':55,
  'Titus':56,'Philemon':57,'Hebräer':58,'Jakobus':59,
  '1.Petrus':60,'1. Petrus':60,'2.Petrus':61,'2. Petrus':61,
  '1.Johannes':62,'1. Johannes':62,'2.Johannes':63,'2. Johannes':63,
  '3.Johannes':64,'3. Johannes':64,
  'Judas':65,'Offenbarung':66,

  // Spanish
  'Génesis':1,'Éxodo':2,'Levítico':3,'Números':4,'Deuteronomio':5,
  'Josué':6,'Jueces':7,'Rut':8,
  '1 Samuel':9,'1Samuel':9,'2 Samuel':10,'2Samuel':10,
  '1 Reyes':11,'1Reyes':11,'2 Reyes':12,'2Reyes':12,
  '1 Crónicas':13,'1Crónicas':13,'2 Crónicas':14,'2Crónicas':14,
  'Esdras':15,'Nehemías':16,'Ester':17,
  'Salmo':19,'Salmos':19,'Proverbios':20,
  'Eclesiastés':21,'Cantares':22,'Cantar de los Cantares':22,
  'Isaías':23,'Jeremías':24,'Lamentaciones':25,'Ezequiel':26,'Daniel':27,
  'Oseas':28,'Joel':29,'Amós':30,'Abdías':31,'Jonás':32,
  'Miqueas':33,'Nahúm':34,'Habacuc':35,'Sofonías':36,'Hageo':37,
  'Zacarías':38,'Malaquías':39,
  'Mateo':40,'Marcos':41,'Lucas':42,'Juan':43,'Hechos':44,'Romanos':45,
  '1 Corintios':46,'1Corintios':46,'2 Corintios':47,'2Corintios':47,
  'Gálatas':48,'Efesios':49,'Filipenses':50,'Colosenses':51,
  '1 Tesalonicenses':52,'1Tesalonicenses':52,
  '2 Tesalonicenses':53,'2Tesalonicenses':53,
  '1 Timoteo':54,'1Timoteo':54,'2 Timoteo':55,'2Timoteo':55,
  'Tito':56,'Filemón':57,'Hebreos':58,'Santiago':59,
  '1 Pedro':60,'1Pedro':60,'2 Pedro':61,'2Pedro':61,
  '1 Juan':62,'1Juan':62,'2 Juan':63,'2Juan':63,'3 Juan':64,'3Juan':64,
  'Judas':65,'Apocalipsis':66,

  // Turkish
  'Yaratılış':1,"Mısır'dan Çıkış":2,'Mısırdan Çıkış':2,'Levililer':3,
  'Çölde Sayım':4,'Yasanın Tekrarı':5,
  'Yeşu':6,'Hakimler':7,'Rut':8,
  '1 Samuel':9,'2 Samuel':10,'1 Krallar':11,'2 Krallar':12,
  '1 Tarihler':13,'2 Tarihler':14,'Ezra':15,'Nehemya':16,'Ester':17,'Eyüp':18,
  'Mezmurlar':19,'Mezmur':19,"Süleyman'ın Özdeyişleri":20,'Özdeyişler':20,
  'Vaiz':21,'Ezgiler Ezgisi':22,
  'Yeşaya':23,'Yeremya':24,'Ağıtlar':25,'Hezekiel':26,'Daniel':27,
  'Hoşea':28,'Yoel':29,'Amos':30,'Ovadya':31,'Yunus':32,
  'Mika':33,'Nahum':34,'Habakkuk':35,'Sefanya':36,'Hagay':37,
  'Zekeriya':38,'Malaki':39,
  'Matta':40,'Markos':41,'Luka':42,'Yuhanna':43,"Elçilerin İşleri":44,
  'Romalılar':45,
  '1 Korintliler':46,'2 Korintliler':47,
  'Galatyalılar':48,'Efesliler':49,'Filipililer':50,'Koloseliler':51,
  '1 Selanikliler':52,'2 Selanikliler':53,
  '1 Timoteos':54,'2 Timoteos':55,'Titus':56,'Filimon':57,
  'İbraniler':58,'Yakup':59,
  '1 Petrus':60,'2 Petrus':61,
  '1 Yuhanna':62,'2 Yuhanna':63,'3 Yuhanna':64,
  'Yahuda':65,'Vahiy':66,

  // Vietnamese
  'Sáng thế ký':1,'Sáng-thế-ký':1,'Sáng thế':1,
  'Xuất Ê-díp-tô ký':2,'Lê-vi ký':3,'Dân số ký':4,'Phục truyền luật lệ ký':5,
  'Giô-suê':6,'Các quan xét':7,'Ru-tơ':8,
  '1 Sa-mu-ên':9,'2 Sa-mu-ên':10,'1 Các vua':11,'2 Các vua':12,
  '1 Sử ký':13,'2 Sử ký':14,'E-xơ-ra':15,'Nê-hê-mi':16,'Ê-xơ-tê':17,
  'Gióp':18,'Thi thiên':19,'Thi Thiên':19,'Thi-thiên':19,
  'Châm ngôn':20,'Truyền đạo':21,'Nhã ca':22,
  'Ê-sai':23,'Giê-rê-mi':24,'Ca thương':25,'Ê-xê-chi-ên':26,'Đa-ni-ên':27,
  'Ô-sê':28,'Giô-ên':29,'A-mốt':30,'Áp-đia':31,'Giô-na':32,
  'Mi-chê':33,'Na-hum':34,'Ha-ba-cúc':35,'Sô-phô-ni':36,'A-ghê':37,
  'Xa-cha-ri':38,'Ma-la-chi':39,
  'Ma-thi-ơ':40,'Mác':41,'Lu-ca':42,'Giăng':43,'Công vụ':44,'Công vụ các sứ đồ':44,
  'Rô-ma':45,
  '1 Cô-rinh-tô':46,'2 Cô-rinh-tô':47,
  'Ga-la-ti':48,'Ê-phê-sô':49,'Phi-líp':50,'Cô-lô-se':51,
  '1 Tê-sa-lô-ni-ca':52,'2 Tê-sa-lô-ni-ca':53,
  '1 Ti-mô-thê':54,'2 Ti-mô-thê':55,'Tít':56,'Phi-lê-môn':57,
  'Hê-bơ-rơ':58,'Gia-cơ':59,
  '1 Phi-e-rơ':60,'2 Phi-e-rơ':61,
  '1 Giăng':62,'2 Giăng':63,'3 Giăng':64,
  'Giu-đe':65,'Khải huyền':66,

  // Persian
  'پیدایش':1,'خروج':2,'لاویان':3,'اعداد':4,'تثنیه':5,
  'یوشع':6,'داوران':7,'روت':8,
  'اول سموئیل':9,'دوم سموئیل':10,'اول پادشاهان':11,'دوم پادشاهان':12,
  'اول تواریخ':13,'دوم تواریخ':14,'عزرا':15,'نحمیا':16,'استر':17,'ایوب':18,
  'مزامیر':19,'امثال':20,'جامعه':21,'غزل غزلها':22,
  'اشعیا':23,'ارمیا':24,'مراثی':25,'حزقیال':26,'دانیال':27,
  'هوشع':28,'یوئیل':29,'عاموس':30,'عوبدیا':31,'یونس':32,'یونا':32,
  'میکاه':33,'میکا':33,'ناحوم':34,'حبقوق':35,'صفنیا':36,'حجی':37,
  'زکریا':38,'ملاکی':39,
  'متی':40,'مرقس':41,'لوقا':42,'یوحنا':43,'اعمال رسولان':44,
  'رومیان':45,'اول قرنتیان':46,'دوم قرنتیان':47,
  'غلاطیان':48,'افسسیان':49,'فیلیپیان':50,'کولسیان':51,
  'اول تسالونیکیان':52,'دوم تسالونیکیان':53,
  'اول تیموتائوس':54,'دوم تیموتائوس':55,'تیتوس':56,'فلیمون':57,
  'عبرانیان':58,'یعقوب':59,
  'اول پطرس':60,'دوم پطرس':61,
  'اول یوحنا':62,'دوم یوحنا':63,'سوم یوحنا':64,
  'یهودا':65,'مکاشفه':66,

  // Myanmar
  'ကမ္ဘာဦးကျမ်း':1,'ကမ္ဘာဦး':1,
  'ထွက်မြောက်ရာ':2,'ဝတ်ပြုရာ':3,'တောလည်ရာ':4,'တရားဟောရာ':5,
  'ယောရှု':6,'တရားသူကြီးများ':7,'ရုသ':8,
  '၁ဓမ္မရာဇဝင်':9,'၂ဓမ္မရာဇဝင်':10,
  '၃ဓမ္မရာဇဝင်':11,'၄ဓမ္မရာဇဝင်':12,
  '၁ရာဇဝင်ချုပ်':13,'၂ရာဇဝင်ချုပ်':14,
  'ဧဇရ':15,'နေဟမိ':16,'ဧသတာ':17,'ယောဘ':18,
  'ဆာလံကျမ်း':19,'ဆာလံ':19,'သုတ္တံကျမ်း':20,'သုတ္တံ':20,
  'ဒေသနာကျမ်း':21,'ရှောလမုန်သီချင်း':22,
  'ဟေရှာယ':23,'ယေရမိ':24,'မြည်တမ်းစကား':25,
  'ယေဇကျေလ':26,'ဒံယေလ':27,
  'ဟောရှေ':28,'ယောလ':29,'အာမုတ်':30,'ဩဗဒိ':31,'ယောန':32,
  'မိက္ခာ':33,'နာဟုံ':34,'ဟဗက္ကုတ်':35,'ဇေဖနိ':36,
  'ဟဂ္ဂဲ':37,'ဇာခရိ':38,'မာလခိ':39,
  'မဿဲ':40,'မာကု':41,'လုကာ':42,'ယောဟန်':43,
  'တမန်တော်':44,'တမန်':44,'ရောမ':45,
  '၁ကောရိန္သု':46,'၂ကောရိန္သု':47,
  'ဂလာတိ':48,'ဂလ':48,'ဧဖက်':49,'ဖိလိပ္ပိ':50,'ဖိ':50,'ကောလောသဲ':51,
  '၁သက်သာလောနိတ်':52,'၂သက်သာလောနိတ်':53,
  '၁တိမောသေ':54,'၂တိမောသေ':55,'တိတု':56,'ဖိလေမုန်':57,
  'ဟေဗြဲ':58,'ယာကုပ်':59,
  '၁ပေတရု':60,'၂ပေတရု':61,
  '၁ယောဟန်':62,'၂ယောဟန်':63,'၃ယောဟန်':64,
  'ယုဒ':65,'ဗျာဒိတ်ကျမ်း':66,'ဗျာ':66,

  // ── Additional abbreviated / variant forms observed in the verse files
  // (each ambiguous abbreviation has been disambiguated by inspecting the
  // actual verse text in its source file).

  // Japanese — bare / "第N" form variants
  'ヨハネ':43,'ローマ':45,'使徒':44,'黙示録':66,
  '第1コリント':46,'第2コリント':47,
  '第1テサロニケ':52,'第2テサロニケ':53,
  '第1テモテ':54,'第2テモテ':55,
  '第1ペテロ':60,'第2ペテロ':61,
  '第1ヨハネ':62,'第2ヨハネ':63,'第3ヨハネ':64,

  // Persian — short forms used in some verse files
  '1یوح':62,'2یوح':63,'3یوح':64,
  '1قر':46,'2قر':47,
  '1پط':60,'2پط':61,
  '1تس':52,'2تس':53,
  '1تیم':54,'2تیم':55,

  // Vietnamese — additional abbreviated forms
  'Phục-truyền':5,'Phục truyền':5,
  'Ê':49,    // Ê-phê-sô (Ephesians) — confirmed via imm-vi verse texts
  'Xo':36,   // Sô-phô-ni / Xô-phô-ni (Zephaniah) — confirmed via "Xo 3:17" content
  'Châm-ngôn':20,

  // Myanmar — bare / digit-prefixed short forms observed in imm-my,
  // power-of-words-my, css-my sets
  'ဧ':49,    // ဧဖက် (Ephesians) — confirmed via "ဧ 1:5" predestination content
  'ယော':43,  // ယောဟန် (John) — confirmed via "ယော 1:12" children-of-God content
  'ယေ':24,   // ယေရမိ (Jeremiah) — confirmed via "ယေ 31:3" everlasting-love content
  'ရော':45,  // ရောမ (Romans) — confirmed via "ရော 8:15" abba-father content
  '1 ယော':62,'1ယော':62,'2 ယော':63,'2ယော':63,'3 ယော':64,'3ယော':64,
  '1 ပေ':60,'1ပေ':60,'2 ပေ':61,'2ပေ':61,
  '1 ကော':46,'1ကော':46,'2 ကော':47,'2ကော':47,
  '1 ကောရိန္သု':46,'2 ကောရိန္သု':47,
  '1 ပေတရု':60,'2 ပေတရု':61,

  // Arabic (SVD) — keep distinct from Persian. Arabic refs use ASCII or
  // Arabic-Indic digits (asciifyDigits handles the latter). Spellings here
  // mirror what verses_ar.js emits via the Arabic book-name map.
  'تكوين':1,'خروج':2,'لاويين':3,'عدد':4,'تثنية':5,
  'يشوع':6,'قضاة':7,'راعوث':8,
  '1صموئيل':9,'2صموئيل':10,
  '1ملوك':11,'2ملوك':12,
  '1أخبار':13,'2أخبار':14,
  'عزرا':15,'نحميا':16,'أستير':17,'أيوب':18,
  'مزامير':19,'المزامير':19,'أمثال':20,'الأمثال':20,
  'جامعة':21,'الجامعة':21,'نشيد الأنشاد':22,
  'إشعياء':23,'أشعياء':23,'إرميا':24,'ارميا':24,
  'مراثي إرميا':25,'مراثي':25,
  'حزقيال':26,'دانيال':27,
  'هوشع':28,'يوئيل':29,'عاموس':30,'عوبديا':31,
  'يونان':32,'يونس':32,'ميخا':33,'ناحوم':34,'حبقوق':35,
  'صفنيا':36,'حجي':37,'زكريا':38,'ملاخي':39,'ملاكي':39,
  'متى':40,'مرقس':41,'لوقا':42,'يوحنا':43,
  'أعمال الرسل':44,'الأعمال':44,
  'رومية':45,'الرومية':45,
  '1كورنثوس':46,'2كورنثوس':47,
  '1كورنثوس':46,'2كورنثوس':47,
  'غلاطية':48,'أفسس':49,'الأفسس':49,
  'فيلبي':50,'كولوسي':51,'كولوسى':51,
  '1تسالونيكي':52,'2تسالونيكي':53,
  '1تيموثاوس':54,'2تيموثاوس':55,
  'تيطس':56,'فليمون':57,
  'عبرانيين':58,'العبرانيين':58,
  'يعقوب':59,
  '1بطرس':60,'2بطرس':61,
  '1يوحنا':62,'2يوحنا':63,'3يوحنا':64,
  'يهوذا':65,'رؤيا يوحنا':66,'الرؤيا':66,'رؤيا':66,
};

// Persian/Arabic-Indic digit conversion: bolls / verse files write
// references like "یوحنا ۱:۱" (verse 1:1). The verseMatch regex uses
// ASCII `\d`, so the chapter:verse part fails. Convert these digits to
// ASCII first so the rest of the normalizer works unchanged.
export function asciifyDigits(s) {
  if (!s) return s;
  return s
    .replace(/[٠-٩]/g, d => String(d.charCodeAt(0) - 0x0660))  // Arabic-Indic
    .replace(/[۰-۹]/g, d => String(d.charCodeAt(0) - 0x06F0))  // Persian (Extended Arabic-Indic)
    .replace(/[၀-၉]/g, d => String(d.charCodeAt(0) - 0x1040)); // Myanmar
}

// Forgiving lookup key: lowercase + asciify digits + strip all hyphens,
// whitespace, dots, and ASCII apostrophes. Collapses "1 Mose", "1.Mose",
// "1. Mose" → "1mose"; "Sáng-thế-ký" / "Sáng thế ký" / "Sáng-thế Ký" →
// "sángthếký"; "၁ကောရိန္သု", "1 ကောရိန္သု", "1ကောရိန္သု" → "1ကောရိန္သု".
// Korean is left alone because its char-based numerals (일/이/삼) are not
// digits — handled by explicit entries below.
function normalizeBookKey(s) {
  if (!s) return '';
  return asciifyDigits(String(s).toLowerCase()).replace(/[-\s.'']+/g, '');
}

// Pre-built normalized lookup tables — one lookup, no per-call cost. The
// raw maps above are kept for clarity / explicit-form lookups; these
// catch case/spacing/hyphen/digit variants automatically.
const HEBREW_FULL_BOOK_ID_NORM = Object.fromEntries(
  Object.entries(HEBREW_FULL_BOOK_ID).map(([k, v]) => [normalizeBookKey(k), v])
);
const KOREAN_FULL_BOOK_ID_NORM = Object.fromEntries(
  Object.entries(KOREAN_FULL_BOOK_ID).map(([k, v]) => [normalizeBookKey(k), v])
);
const MULTILANG_FULL_BOOK_ID_NORM = Object.fromEntries(
  Object.entries(MULTILANG_FULL_BOOK_ID).map(([k, v]) => [normalizeBookKey(k), v])
);

// Additional Korean numeric-form variants — verse files sometimes write
// "요한1서" (digit) instead of "요한일서" (Sino-Korean numeral 일/이/삼).
// normalizeBookKey can't collapse 일↔1 without a deeper numeral table, so
// we list both forms explicitly.
const KOREAN_NUMERIC_VARIANTS = {
  '사무엘1서':9,'사무엘2서':10,'열왕기1':11,'열왕기2':12,
  '역대1':13,'역대2':14,'고린도1서':46,'고린도2서':47,
  '데살로니가1서':52,'데살로니가2서':53,
  '디모데1서':54,'디모데2서':55,
  '베드로1서':60,'베드로2서':61,
  '요한1서':62,'요한2서':63,'요한3서':64,
};
for (const [k, v] of Object.entries(KOREAN_NUMERIC_VARIANTS)) {
  KOREAN_FULL_BOOK_ID_NORM[normalizeBookKey(k)] = v;
}

function lookupFullBookId(bookPart) {
  if (!bookPart) return undefined;
  const raw = bookPart;
  const trimmed = bookPart.trim();
  const key = normalizeBookKey(bookPart);
  const direct = (
    HEBREW_FULL_BOOK_ID[raw] ?? HEBREW_FULL_BOOK_ID[trimmed] ?? HEBREW_FULL_BOOK_ID_NORM[key]
    ?? KOREAN_FULL_BOOK_ID[raw] ?? KOREAN_FULL_BOOK_ID[trimmed] ?? KOREAN_FULL_BOOK_ID_NORM[key]
    ?? MULTILANG_FULL_BOOK_ID[raw] ?? MULTILANG_FULL_BOOK_ID[trimmed] ?? MULTILANG_FULL_BOOK_ID_NORM[key]
  );
  if (direct) return direct;
  // Modern-Hebrew NT epistles are usually written with the preposition and/or
  // definite article — 「אל העברים」 / 「העברים」 (to the Hebrews) — while the
  // table stores the bare 「עברים」. Retry without them so references planted
  // from a custom Hebrew set still resolve. Real names starting with ה
  // (הושע, התגלות) were already matched directly above.
  const bare = trimmed.replace(/^אל\s+/u, '').replace(/^ה(?=[א-ת]{2,})/u, '');
  return bare !== trimmed ? lookupFullBookId(bare) : undefined;
}

// Maps normalized English book key → localized abbreviation by language code
// Key: lowercase English book name/abbreviation (no spaces, no periods, number prefix attached)
export const ENGLISH_BOOK_LOCALIZATION_MAP = {
  // ── Old Testament ──
  'genesis':        { vi:'St',    ko:'창',   ja:'創',    es:'Gén',  de:'1.Mo', tr:'Yar', fa:'پيد',     he:'בר',    my:'က' },
  'gen':            { vi:'St',    ko:'창',   ja:'創',    es:'Gén',  de:'1.Mo', tr:'Yar', fa:'پيد',     he:'בר',    my:'က' },
  'exodus':         { vi:'Xh',   ko:'출',   ja:'出',    es:'Éx',   de:'2.Mo', tr:'Mıs', fa:'خر',      he:'שמ',   my:'ထွ' },
  'exod':           { vi:'Xh',   ko:'출',   ja:'出',    es:'Éx',   de:'2.Mo', tr:'Mıs', fa:'خر',      he:'שמ',   my:'ထွ' },
  'ex':             { vi:'Xh',   ko:'출',   ja:'出',    es:'Éx',   de:'2.Mo', tr:'Mıs', fa:'خر',      he:'שמ',   my:'ထွ' },
  'leviticus':      { vi:'Lv',   ko:'레',   ja:'レビ',  es:'Lv',   de:'3.Mo', tr:'Lev', fa:'لا',      he:'ויק',  my:'ဝ' },
  'lev':            { vi:'Lv',   ko:'레',   ja:'レビ',  es:'Lv',   de:'3.Mo', tr:'Lev', fa:'لا',      he:'ויק',  my:'ဝ' },
  'numbers':        { vi:'Ds',   ko:'민',   ja:'民',    es:'Nm',   de:'4.Mo', tr:'Say', fa:'اع',      he:'במ',   my:'တော' },
  'num':            { vi:'Ds',   ko:'민',   ja:'民',    es:'Nm',   de:'4.Mo', tr:'Say', fa:'اع',      he:'במ',   my:'တော' },
  'deuteronomy':    { vi:'Đnl',  ko:'신',   ja:'申',    es:'Dt',   de:'5.Mo', tr:'Yes', fa:'تث',      he:'דב',   my:'တရားဟောရာ' },
  'deut':           { vi:'Đnl',  ko:'신',   ja:'申',    es:'Dt',   de:'5.Mo', tr:'Yes', fa:'تث',      he:'דב',   my:'တရားဟောရာ' },
  'dt':             { vi:'Đnl',  ko:'신',   ja:'申',    es:'Dt',   de:'5.Mo', tr:'Yes', fa:'تث',      he:'דב',   my:'တရားဟောရာ' },
  'joshua':         { vi:'Gs',   ko:'수',   ja:'ヨシュ', es:'Jos',  de:'Jos',  tr:'Yşu', fa:'يش',      he:'יהו',  my:'ယောရှ' },
  'josh':           { vi:'Gs',   ko:'수',   ja:'ヨシュ', es:'Jos',  de:'Jos',  tr:'Yşu', fa:'يش',      he:'יהו',  my:'ယောရှ' },
  'judges':         { vi:'Tl',   ko:'삿',   ja:'士師',  es:'Jue',  de:'Ri',   tr:'Hak', fa:'داو',     he:'שוף',  my:'တရားသူကြီး' },
  'judg':           { vi:'Tl',   ko:'삿',   ja:'士師',  es:'Jue',  de:'Ri',   tr:'Hak', fa:'داو',     he:'שוף',  my:'တရားသူကြီး' },
  'ruth':           { vi:'R',    ko:'룻',   ja:'ルツ',  es:'Rt',   de:'Rut',  tr:'Rut', fa:'روت',     he:'רות',  my:'ရုသ' },
  '1samuel':        { vi:'1Sm',  ko:'삼상', ja:'サム上', es:'1Sa',  de:'1Sam', tr:'1Sa', fa:'اول سم',  he:'שמ״א', my:'၁ ဓမ္မ' },
  '1sam':           { vi:'1Sm',  ko:'삼상', ja:'サム上', es:'1Sa',  de:'1Sam', tr:'1Sa', fa:'اول سم',  he:'שמ״א', my:'၁ ဓမ္မ' },
  '2samuel':        { vi:'2Sm',  ko:'삼하', ja:'サム下', es:'2Sa',  de:'2Sam', tr:'2Sa', fa:'دوم سم', he:'שמ״ב', my:'၂ ဓမ္မ' },
  '2sam':           { vi:'2Sm',  ko:'삼하', ja:'サム下', es:'2Sa',  de:'2Sam', tr:'2Sa', fa:'دوم سم', he:'שמ״ב', my:'၂ ဓမ္မ' },
  '1kings':         { vi:'1V',   ko:'왕상', ja:'王上',  es:'1Re',  de:'1Kö',  tr:'1Kr', fa:'اول پاد', he:'מל״א', my:'၁ ရာဇ' },
  '1kgs':           { vi:'1V',   ko:'왕상', ja:'王上',  es:'1Re',  de:'1Kö',  tr:'1Kr', fa:'اول پاد', he:'מל״א', my:'၁ ရာဇ' },
  '2kings':         { vi:'2V',   ko:'왕하', ja:'王下',  es:'2Re',  de:'2Kö',  tr:'2Kr', fa:'دوم پاد', he:'מל״ב', my:'၂ ရာဇ' },
  '2kgs':           { vi:'2V',   ko:'왕하', ja:'王下',  es:'2Re',  de:'2Kö',  tr:'2Kr', fa:'دوم پاد', he:'מל״ב', my:'၂ ရာဇ' },
  '1chronicles':    { vi:'1Sb',  ko:'대상', ja:'歴上',  es:'1Cr',  de:'1Chr', tr:'1Ta', fa:'اول تو',  he:'דה״א', my:'၁ ရာဇ်ချုပ်' },
  '1chr':           { vi:'1Sb',  ko:'대상', ja:'歴上',  es:'1Cr',  de:'1Chr', tr:'1Ta', fa:'اول تو',  he:'דה״א', my:'၁ ရာဇ်ချုပ်' },
  '2chronicles':    { vi:'2Sb',  ko:'대하', ja:'歴下',  es:'2Cr',  de:'2Chr', tr:'2Ta', fa:'دوم تو',  he:'דה״ב', my:'၂ ရာဇ်ချုပ်' },
  '2chr':           { vi:'2Sb',  ko:'대하', ja:'歴下',  es:'2Cr',  de:'2Chr', tr:'2Ta', fa:'دوم تو',  he:'דה״ב', my:'၂ ရာဇ်ချုပ်' },
  '2chron':         { vi:'2Sb',  ko:'대하', ja:'歴下',  es:'2Cr',  de:'2Chr', tr:'2Ta', fa:'دوم تو',  he:'דה״ב', my:'၂ ရာဇ်ချုပ်' },
  'ezra':           { vi:'Er',   ko:'스',   ja:'エズ',  es:'Esd',  de:'Esr',  tr:'Ezr', fa:'عزر',     he:'עזר',  my:'ဧဇရ' },
  'nehemiah':       { vi:'Nkm',  ko:'느',   ja:'ネヘ',  es:'Neh',  de:'Neh',  tr:'Neh', fa:'نح',      he:'נחמ',  my:'နေဟမိ' },
  'neh':            { vi:'Nkm',  ko:'느',   ja:'ネヘ',  es:'Neh',  de:'Neh',  tr:'Neh', fa:'نح',      he:'נחמ',  my:'နေဟမိ' },
  'esther':         { vi:'Et',   ko:'에',   ja:'エス',  es:'Est',  de:'Est',  tr:'Est', fa:'است',     he:'אסת',  my:'ဧသ' },
  'esth':           { vi:'Et',   ko:'에',   ja:'エス',  es:'Est',  de:'Est',  tr:'Est', fa:'است',     he:'אסת',  my:'ဧသ' },
  'job':            { vi:'G',    ko:'욥',   ja:'ヨブ',  es:'Job',  de:'Hiob', tr:'Eyy', fa:'ايوب',    he:'איוב', my:'ယောဘ' },
  'psalms':         { vi:'Tv',   ko:'시',   ja:'詩',    es:'Sal',  de:'Ps',   tr:'Mez', fa:'مز',      he:'תה',   my:'ဆာလံ' },
  'psalm':          { vi:'Tv',   ko:'시',   ja:'詩',    es:'Sal',  de:'Ps',   tr:'Mez', fa:'مز',      he:'תה',   my:'ဆာလံ' },
  'ps':             { vi:'Tv',   ko:'시',   ja:'詩',    es:'Sal',  de:'Ps',   tr:'Mez', fa:'مز',      he:'תה',   my:'ဆာလံ' },
  'psa':            { vi:'Tv',   ko:'시',   ja:'詩',    es:'Sal',  de:'Ps',   tr:'Mez', fa:'مز',      he:'תה',   my:'ဆာလံ' },
  'proverbs':       { vi:'Cn',   ko:'잠',   ja:'箴',    es:'Prov', de:'Spr',  tr:'Süz', fa:'ام',      he:'משל',  my:'သုတ္တံ' },
  'prov':           { vi:'Cn',   ko:'잠',   ja:'箴',    es:'Prov', de:'Spr',  tr:'Süz', fa:'ام',      he:'משל',  my:'သုတ္တံ' },
  'ecclesiastes':   { vi:'Gv',   ko:'전',   ja:'伝',    es:'Ecl',  de:'Pred', tr:'Vaa', fa:'جامعه',   he:'קה',   my:'ဒေသနာ' },
  'eccles':         { vi:'Gv',   ko:'전',   ja:'伝',    es:'Ecl',  de:'Pred', tr:'Vaa', fa:'جامعه',   he:'קה',   my:'ဒေသနာ' },
  'ecc':            { vi:'Gv',   ko:'전',   ja:'伝',    es:'Ecl',  de:'Pred', tr:'Vaa', fa:'جامعه',   he:'קה',   my:'ဒေသနာ' },
  'songofsolomon':  { vi:'Dc',   ko:'아',   ja:'雅',    es:'Cnt',  de:'Hl',   tr:'Ezg', fa:'غزل',     he:'שה"ש', my:'သီချင်း' },
  'song':           { vi:'Dc',   ko:'아',   ja:'雅',    es:'Cnt',  de:'Hl',   tr:'Ezg', fa:'غزل',     he:'שה"ש', my:'သီချင်း' },
  'isaiah':         { vi:'Is',   ko:'사',   ja:'イザ',  es:'Is',   de:'Jes',  tr:'Esa', fa:'اشع',     he:'יש',   my:'ဟေရှာယ' },
  'isa':            { vi:'Is',   ko:'사',   ja:'イザ',  es:'Is',   de:'Jes',  tr:'Esa', fa:'اشع',     he:'יש',   my:'ဟေရှာယ' },
  'jeremiah':       { vi:'Gr',   ko:'렘',   ja:'エレ',  es:'Jer',  de:'Jer',  tr:'Yer', fa:'ار',      he:'ירמ',  my:'ယေရမိ' },
  'jer':            { vi:'Gr',   ko:'렘',   ja:'エレ',  es:'Jer',  de:'Jer',  tr:'Yer', fa:'ار',      he:'ירמ',  my:'ယေရမိ' },
  'lamentations':   { vi:'Ac',   ko:'애',   ja:'哀',    es:'Lm',   de:'Klag', tr:'Mer', fa:'مر',      he:'איכ',  my:'မြည်တမ်းစ' },
  'lam':            { vi:'Ac',   ko:'애',   ja:'哀',    es:'Lm',   de:'Klag', tr:'Mer', fa:'مر',      he:'איכ',  my:'မြည်တမ်းစ' },
  'ezekiel':        { vi:'Ed',   ko:'겔',   ja:'エゼ',  es:'Ez',   de:'Ez',   tr:'Hzk', fa:'حز',      he:'יחז',  my:'ယေဇကျေး' },
  'ezek':           { vi:'Ed',   ko:'겔',   ja:'エゼ',  es:'Ez',   de:'Ez',   tr:'Hzk', fa:'حز',      he:'יחז',  my:'ယေဇကျေး' },
  'daniel':         { vi:'Đn',   ko:'단',   ja:'ダニ',  es:'Dn',   de:'Dan',  tr:'Dan', fa:'دان',     he:'דנ',   my:'ဒံယေလ' },
  'dan':            { vi:'Đn',   ko:'단',   ja:'ダニ',  es:'Dn',   de:'Dan',  tr:'Dan', fa:'دان',     he:'דנ',   my:'ဒံယေလ' },
  'hosea':          { vi:'Os',   ko:'호',   ja:'ホセ',  es:'Os',   de:'Hos',  tr:'Hoş', fa:'هو',      he:'הוש',  my:'ဟောရှေ' },
  'hos':            { vi:'Os',   ko:'호',   ja:'ホセ',  es:'Os',   de:'Hos',  tr:'Hoş', fa:'هو',      he:'הוש',  my:'ဟောရှေ' },
  'joel':           { vi:'Ge',   ko:'욜',   ja:'ヨエ',  es:'Jl',   de:'Joel', tr:'Yol', fa:'يوئ',     he:'יואל', my:'ယောလ' },
  'amos':           { vi:'Am',   ko:'암',   ja:'アモ',  es:'Am',   de:'Am',   tr:'Amo', fa:'عا',      he:'עמ',   my:'အာမုတ်' },
  'obadiah':        { vi:'Ap',   ko:'옵',   ja:'オバ',  es:'Ab',   de:'Ob',   tr:'Abd', fa:'عوب',     he:'עוב',  my:'သောဒိ' },
  'jonah':          { vi:'Gn',   ko:'욘',   ja:'ヨナ',  es:'Jon',  de:'Jona', tr:'Yun', fa:'يون',     he:'יונ',  my:'ယောနာ' },
  'micah':          { vi:'Mk',   ko:'미',   ja:'ミカ',  es:'Mi',   de:'Mi',   tr:'Mik', fa:'ميکا',    he:'מי',   my:'မိကာ' },
  'nahum':          { vi:'Na',   ko:'나',   ja:'ナホ',  es:'Na',   de:'Nah',  tr:'Nah', fa:'نا',      he:'נח',   my:'နာဟုမ်' },
  'habakkuk':       { vi:'Hab',  ko:'합',   ja:'ハバ',  es:'Hab',  de:'Hab',  tr:'Hab', fa:'حب',      he:'חב',   my:'ဟဗက္ကုတ်' },
  'zephaniah':      { vi:'Xp',   ko:'습',   ja:'ゼパ',  es:'Sof',  de:'Zef',  tr:'Sef', fa:'صف',      he:'צפ',   my:'ဇေဖနိ' },
  'haggai':         { vi:'Kg',   ko:'학',   ja:'ハガ',  es:'Ag',   de:'Hag',  tr:'Hag', fa:'حج',      he:'חג',   my:'ဟဂ္ဂဲ' },
  'zechariah':      { vi:'Dcr',  ko:'슥',   ja:'ゼカ',  es:'Zac',  de:'Sach', tr:'Zek', fa:'زک',      he:'זכ',   my:'ဇာခရိ' },
  'zech':           { vi:'Dcr',  ko:'슥',   ja:'ゼカ',  es:'Zac',  de:'Sach', tr:'Zek', fa:'زک',      he:'זכ',   my:'ဇာခရိ' },
  'malachi':        { vi:'Ml',   ko:'말',   ja:'マラ',  es:'Mal',  de:'Mal',  tr:'Mal', fa:'ملا',     he:'מל',   my:'မာလခိ' },
  'mal':            { vi:'Ml',   ko:'말',   ja:'マラ',  es:'Mal',  de:'Mal',  tr:'Mal', fa:'ملا',     he:'מל',   my:'မာလခိ' },
  // ── New Testament ──
  'matthew':        { vi:'Mt',   ko:'마',   ja:'マタ',  es:'Mt',   de:'Mt',   tr:'Mat', fa:'مت',      he:'מת',   my:'မဿဲ' },
  'matt':           { vi:'Mt',   ko:'마',   ja:'マタ',  es:'Mt',   de:'Mt',   tr:'Mat', fa:'مت',      he:'מת',   my:'မဿဲ' },
  'mark':           { vi:'Mc',   ko:'막',   ja:'マコ',  es:'Mr',   de:'Mk',   tr:'Mar', fa:'مرق',     he:'מרק',  my:'မာကု' },
  'mrk':            { vi:'Mc',   ko:'막',   ja:'マコ',  es:'Mr',   de:'Mk',   tr:'Mar', fa:'مرق',     he:'מרק',  my:'မာကု' },
  'luke':           { vi:'Lc',   ko:'눅',   ja:'ルカ',  es:'Lc',   de:'Lk',   tr:'Luk', fa:'لو',      he:'לוק',  my:'လုကာ' },
  'luk':            { vi:'Lc',   ko:'눅',   ja:'ルカ',  es:'Lc',   de:'Lk',   tr:'Luk', fa:'لو',      he:'לוק',  my:'လုကာ' },
  'john':           { vi:'Ga',   ko:'요',   ja:'ヨハ',  es:'Jn',   de:'Joh',  tr:'Yuh', fa:'يو',      he:'יוח',  my:'ယောဟန်' },
  'jn':             { vi:'Ga',   ko:'요',   ja:'ヨハ',  es:'Jn',   de:'Joh',  tr:'Yuh', fa:'يو',      he:'יוח',  my:'ယောဟန်' },
  'joh':            { vi:'Ga',   ko:'요',   ja:'ヨハ',  es:'Jn',   de:'Joh',  tr:'Yuh', fa:'يو',      he:'יוח',  my:'ယောဟန်' },
  'acts':           { vi:'Cv',   ko:'행',   ja:'使',    es:'Hch',  de:'Apg',  tr:'Elç', fa:'اعم',     he:'מעש',  my:'တမန်တော်' },
  'act':            { vi:'Cv',   ko:'행',   ja:'使',    es:'Hch',  de:'Apg',  tr:'Elç', fa:'اعم',     he:'מעש',  my:'တမန်တော်' },
  'romans':         { vi:'Rm',   ko:'롬',   ja:'ロマ',  es:'Ro',   de:'Röm',  tr:'Rom', fa:'رو',      he:'רומ',  my:'ရောမ' },
  'rom':            { vi:'Rm',   ko:'롬',   ja:'ロマ',  es:'Ro',   de:'Röm',  tr:'Rom', fa:'رو',      he:'רומ',  my:'ရောမ' },
  '1corinthians':   { vi:'1Cr',  ko:'고전', ja:'コリ前', es:'1Co',  de:'1Kor', tr:'1Ko', fa:'اول قر',  he:'א קור', my:'၁ ကောရိ' },
  '1cor':           { vi:'1Cr',  ko:'고전', ja:'コリ前', es:'1Co',  de:'1Kor', tr:'1Ko', fa:'اول قر',  he:'א קור', my:'၁ ကောရိ' },
  '2corinthians':   { vi:'2Cr',  ko:'고후', ja:'コリ後', es:'2Co',  de:'2Kor', tr:'2Ko', fa:'دوم قر',  he:'ב קור', my:'၂ ကောရိ' },
  '2cor':           { vi:'2Cr',  ko:'고후', ja:'コリ後', es:'2Co',  de:'2Kor', tr:'2Ko', fa:'دوم قر',  he:'ב קור', my:'၂ ကောရိ' },
  'galatians':      { vi:'Gl',   ko:'갈',   ja:'ガラ',  es:'Gá',   de:'Gal',  tr:'Gal', fa:'غل',      he:'גלט',  my:'ဂလာတိ' },
  'gal':            { vi:'Gl',   ko:'갈',   ja:'ガラ',  es:'Gá',   de:'Gal',  tr:'Gal', fa:'غل',      he:'גלט',  my:'ဂလာတိ' },
  'ephesians':      { vi:'Ep',   ko:'엡',   ja:'エペ',  es:'Ef',   de:'Eph',  tr:'Efe', fa:'اف',      he:'אפס',  my:'ဧဖက်' },
  'eph':            { vi:'Ep',   ko:'엡',   ja:'エペ',  es:'Ef',   de:'Eph',  tr:'Efe', fa:'اف',      he:'אפס',  my:'ဧဖက်' },
  'philippians':    { vi:'Pl',   ko:'빌',   ja:'ピリ',  es:'Fil',  de:'Phil', tr:'Fil', fa:'فل',      he:'פיל',  my:'ဖိလိပ္ပိ' },
  'phil':           { vi:'Pl',   ko:'빌',   ja:'ピリ',  es:'Fil',  de:'Phil', tr:'Fil', fa:'فل',      he:'פיל',  my:'ဖိလိပ္ပိ' },
  'colossians':     { vi:'Cl',   ko:'골',   ja:'コロ',  es:'Col',  de:'Kol',  tr:'Kol', fa:'کل',      he:'קול',  my:'ကောလောသဲ' },
  'col':            { vi:'Cl',   ko:'골',   ja:'コロ',  es:'Col',  de:'Kol',  tr:'Kol', fa:'کل',      he:'קול',  my:'ကောလောသဲ' },
  '1thessalonians': { vi:'1Tx',  ko:'살전', ja:'テサ前', es:'1Ts',  de:'1Thes',tr:'1Se', fa:'اول تس',  he:'א תס', my:'၁ သက်သာ' },
  '1thess':         { vi:'1Tx',  ko:'살전', ja:'テサ前', es:'1Ts',  de:'1Thes',tr:'1Se', fa:'اول تس',  he:'א תס', my:'၁ သက်သာ' },
  '1th':            { vi:'1Tx',  ko:'살전', ja:'テサ前', es:'1Ts',  de:'1Thes',tr:'1Se', fa:'اول تس',  he:'א תס', my:'၁ သက်သာ' },
  '2thessalonians': { vi:'2Tx',  ko:'살후', ja:'テサ後', es:'2Ts',  de:'2Thes',tr:'2Se', fa:'دوم تس',  he:'ב תס', my:'၂ သက်သာ' },
  '2thess':         { vi:'2Tx',  ko:'살후', ja:'テサ後', es:'2Ts',  de:'2Thes',tr:'2Se', fa:'دوم تس',  he:'ב תס', my:'၂ သက်သာ' },
  '1timothy':       { vi:'1Tm',  ko:'딤전', ja:'テモ前', es:'1Ti',  de:'1Tim', tr:'1Ti', fa:'اول تي',  he:'א טים', my:'၁ တိမောသေ' },
  '1tim':           { vi:'1Tm',  ko:'딤전', ja:'テモ前', es:'1Ti',  de:'1Tim', tr:'1Ti', fa:'اول تي',  he:'א טים', my:'၁ တိမောသေ' },
  '2timothy':       { vi:'2Tm',  ko:'딤후', ja:'テモ後', es:'2Ti',  de:'2Tim', tr:'2Ti', fa:'دوم تي',  he:'ב טים', my:'၂ တိမောသေ' },
  '2tim':           { vi:'2Tm',  ko:'딤후', ja:'テモ後', es:'2Ti',  de:'2Tim', tr:'2Ti', fa:'دوم تي',  he:'ב טים', my:'၂ တိမောသေ' },
  'titus':          { vi:'Tt',   ko:'딛',   ja:'テト',  es:'Tit',  de:'Tit',  tr:'Tit', fa:'تيت',     he:'טיט',  my:'တိတု' },
  'tit':            { vi:'Tt',   ko:'딛',   ja:'テト',  es:'Tit',  de:'Tit',  tr:'Tit', fa:'تيت',     he:'טיט',  my:'တိတု' },
  'philemon':       { vi:'Plm',  ko:'몬',   ja:'ピレ',  es:'Flm',  de:'Phlm', tr:'Flm', fa:'فلم',     he:'פלמ',  my:'ဖိလေမုန်' },
  'phlm':           { vi:'Plm',  ko:'몬',   ja:'ピレ',  es:'Flm',  de:'Phlm', tr:'Flm', fa:'فلم',     he:'פלמ',  my:'ဖိလေမုန်' },
  'hebrews':        { vi:'Dt',   ko:'히',   ja:'ヘブ',  es:'He',   de:'Hebr', tr:'İbr', fa:'عب',      he:'עבר',  my:'ဟေဗြဲ' },
  'heb':            { vi:'Dt',   ko:'히',   ja:'ヘブ',  es:'He',   de:'Hebr', tr:'İbr', fa:'عب',      he:'עבר',  my:'ဟေဗြဲ' },
  'james':          { vi:'Gc',   ko:'약',   ja:'ヤコ',  es:'Stg',  de:'Jak',  tr:'Yak', fa:'يع',      he:'יעק',  my:'ယာကုပ်' },
  'jas':            { vi:'Gc',   ko:'약',   ja:'ヤコ',  es:'Stg',  de:'Jak',  tr:'Yak', fa:'يع',      he:'יעק',  my:'ယာကုပ်' },
  '1peter':         { vi:'1Pr',  ko:'벧전', ja:'ペテ前', es:'1P',   de:'1Petr',tr:'1Pe', fa:'اول پط',  he:'א פט', my:'၁ ပေတ ရု' },
  '1pet':           { vi:'1Pr',  ko:'벧전', ja:'ペテ前', es:'1P',   de:'1Petr',tr:'1Pe', fa:'اول پط',  he:'א פט', my:'၁ ပေတ ရု' },
  '2peter':         { vi:'2Pr',  ko:'벧후', ja:'ペテ後', es:'2P',   de:'2Petr',tr:'2Pe', fa:'دوم پط',  he:'ב פט', my:'၂ ပေတ ရု' },
  '2pet':           { vi:'2Pr',  ko:'벧후', ja:'ペテ後', es:'2P',   de:'2Petr',tr:'2Pe', fa:'دوم پط',  he:'ב פט', my:'၂ ပေတ ရု' },
  '1john':          { vi:'1Ga',  ko:'요일', ja:'ヨハ一', es:'1Jn',  de:'1Joh', tr:'1Yh', fa:'اول يو',  he:'א יוח', my:'၁ ယောဟန်' },
  '1jn':            { vi:'1Ga',  ko:'요일', ja:'ヨハ一', es:'1Jn',  de:'1Joh', tr:'1Yh', fa:'اول يو',  he:'א יוח', my:'၁ ယောဟန်' },
  '2john':          { vi:'2Ga',  ko:'요이', ja:'ヨハ二', es:'2Jn',  de:'2Joh', tr:'2Yh', fa:'دوم يو',  he:'ב יוח', my:'၂ ယောဟန်' },
  '2jn':            { vi:'2Ga',  ko:'요이', ja:'ヨハ二', es:'2Jn',  de:'2Joh', tr:'2Yh', fa:'دوم يو',  he:'ב יוח', my:'၂ ယောဟန်' },
  '3john':          { vi:'3Ga',  ko:'요삼', ja:'ヨハ三', es:'3Jn',  de:'3Joh', tr:'3Yh', fa:'سوم يو',  he:'ג יוח', my:'၃ ယောဟန်' },
  '3jn':            { vi:'3Ga',  ko:'요삼', ja:'ヨハ三', es:'3Jn',  de:'3Joh', tr:'3Yh', fa:'سوم يو',  he:'ג יוח', my:'၃ ယောဟန်' },
  'jude':           { vi:'Gđ',   ko:'유',   ja:'ユダ',  es:'Jud',  de:'Jud',  tr:'Yah', fa:'يهو',     he:'יהוד', my:'ယုဒ' },
  'jud':            { vi:'Gđ',   ko:'유',   ja:'ユダ',  es:'Jud',  de:'Jud',  tr:'Yah', fa:'يهو',     he:'יהוד', my:'ယုဒ' },
  'revelation':     { vi:'Kh',   ko:'계',   ja:'黙',    es:'Ap',   de:'Offb', tr:'Vah', fa:'مک',      he:'חז',   my:'ဗျာဒိတ်' },
  'rev':            { vi:'Kh',   ko:'계',   ja:'黙',    es:'Ap',   de:'Offb', tr:'Vah', fa:'مک',      he:'חז',   my:'ဗျာဒိတ်' },
};

// English spellings the names[] lists don't carry ("Prov", "1 Cor", "Ps",
// "2 Tim"). ENGLISH_BOOK_LOCALIZATION_MAP is keyed by every English name and
// abbreviation, and its Korean abbreviation is unique per book, so it doubles
// as an abbreviation → book id table. Built lazily on first use.
let __englishAbbrBookId = null;
function lookupEnglishAbbrBookId(bookPart) {
  const key = String(bookPart || '').toLowerCase().replace(/\./g, '').replace(/\s+/g, '');
  if (!key) return undefined;
  if (!__englishAbbrBookId) {
    __englishAbbrBookId = new Map();
    for (const [abbr, loc] of Object.entries(ENGLISH_BOOK_LOCALIZATION_MAP)) {
      const b = BIBLE_BOOKS.find(x => x.ko === loc.ko);
      if (b) __englishAbbrBookId.set(abbr, b.id);
    }
  }
  return __englishAbbrBookId.get(key);
}

// Convert a Hebrew gematria string (e.g. "יב" → 12, "כא" → 21) to a number.
// Returns null if the string contains non-Hebrew-letter characters.
function hebrewLettersToNumber(s) {
  const values = {
    א:1, ב:2, ג:3, ד:4, ה:5, ו:6, ז:7, ח:8, ט:9,
    י:10, כ:20, ל:30, מ:40, נ:50, ס:60, ע:70, פ:80, צ:90,
    ק:100, ר:200, ש:300, ת:400,
    ך:20, ם:40, ן:50, ף:80, ץ:90  // final letter forms
  };
  if (!s) return null;
  let total = 0;
  for (const ch of s) {
    const v = values[ch];
    if (!v) return null;
    total += v;
  }
  return total > 0 ? total : null;
}

// One chapter/verse component of a Hebrew reference. Accepts plain digits, or a
// letter numeral with or without the gershayim/geresh that marks it as a number
// (נ״ח, נ"ח, נח all → 58). Returns null for anything else, so a caller can tell
// "not a number" apart from a real 0.
function hebrewOrArabicNumber(token) {
  const raw = String(token || '').trim();
  if (!raw) return null;
  if (/^\d+$/.test(raw)) return Number(raw);
  const bare = raw.replace(/['"׳״‘’“”]/g, '');
  if (!bare || !/^[א-ת]+$/.test(bare)) return null;
  return hebrewLettersToNumber(bare);
}

export function normalizeVerseReferenceKey(reference = '') {
  // asciifyDigits unlocks Persian/Arabic-Indic/Myanmar references whose
  // chapter:verse uses non-ASCII digits — without it the verseMatch regex
  // (`\d`) fails and these languages never normalize.
  const value = asciifyDigits(String(reference || ''))
    .replace(/[–—]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
  if (!value) return '';

  // Hebrew letter-numeral refs — convert gematria to Arabic digits so the rest
  // of the pipeline can normalize them like any other reference. This is what
  // unlocks ESV/KJV/NIV API fetches for Hebrew-primary bilingual mode.
  //
  // The chapter and the verse are independent: either may be letters or digits,
  // and letter numerals usually carry the gershayim that conventionally marks
  // them as a number. The daily verse arrives as "ישעיהו נ״ח:11" — letters WITH
  // gershayim on one side, digits on the other. The earlier version demanded
  // letters on BOTH sides and no gershayim, so that shape returned '' and the
  // bilingual secondary silently rendered nothing at all.
  //
  // Printed Hebrew Bibles separate chapter and verse with a comma rather than
  // a colon (「דברים ל"ב, ב」 = Deuteronomy 32:2), and a custom set can carry
  // that spelling into the garden, so the comma is accepted too. Only a Hebrew
  // book name gets past the lookup below, so 「Genesis 1:1, 3」 is unaffected.
  const heRefMatch = value.match(/^(.+?)\s+(\S+)\s*[:׃,]\s*(\S+)$/u);
  if (heRefMatch) {
    const bookRaw = heRefMatch[1].trim();
    const bookId = HEBREW_FULL_BOOK_ID[bookRaw] ?? BIBLE_BOOKS.find(b => b.he === bookRaw)?.id ?? lookupFullBookId(bookRaw);
    if (bookId) {
      const chap = hebrewOrArabicNumber(heRefMatch[2]);
      const versePart = heRefMatch[3].split('-').map(p => hebrewOrArabicNumber(p));
      if (chap && versePart.length && versePart.every(n => n != null)) {
        return `${bookId}|${chap}:${versePart.join('-')}`;
      }
    }
  }

  const verseMatch = value.match(/(\d+)\s*:\s*([\d,\-\s]+)/);
  if (!verseMatch) {
    // Try chapter-only reference: "Psalm 35", "詩篇 35", "Proverbs 1"
    // Pattern: optional leading digit (for "1 Kings"), book name(s), then chapter number at end
    const chapMatch = value.match(/^(\d\s+)?([^\d]+?)\s+(\d+)$/);
    if (chapMatch) {
      const numPrefix = chapMatch[1] ? chapMatch[1].trim() : '';
      const bookRaw = (numPrefix + chapMatch[2]).trim();
      const normalizedBookRaw = bookRaw.toLowerCase().replace(/\./g, '').replace(/\s+/g, ' ');
      const book = BIBLE_BOOKS.find(b => {
        const names = [
          ...(b.names || []),
          ...(b.cn || []),
          b.ja, b.ko, b.es, b.de, b.tr, b.fa, b.ar, b.he, b.my, b.vi, b.idn, b.msy, b.pt, b.fr, b.ru, b.hi, b.km
        ].filter(Boolean);
        return names.some(name => {
          const n = String(name).toLowerCase().replace(/\./g, '').replace(/\s+/g, ' ');
          return normalizedBookRaw === n || normalizedBookRaw.endsWith(` ${n}`);
        });
      });
      const bookId = book?.id ?? lookupFullBookId(bookRaw) ?? lookupEnglishAbbrBookId(bookRaw);
      if (bookId) return `${bookId}|${chapMatch[3]}`;
    }
    return value.toLowerCase();
  }

  const bookPart = value.slice(0, verseMatch.index).trim().replace(/[：:]+$/, '');
  const normalizedBookPart = bookPart.toLowerCase().replace(/\./g, '').replace(/\s+/g, ' ');
  const book = BIBLE_BOOKS.find(b => {
    const names = [
      ...(b.names || []),
      ...(b.cn || []),
      b.ja,
      b.ko,
      b.es,
      b.de,
      b.tr,
      b.fa,
      b.ar,
      b.he,
      b.my,
      b.vi,
      b.idn,
      b.msy,
      b.pt,
      b.fr,
      b.ru,
      b.hi,
      b.km
    ].filter(Boolean);
    return names.some(name => {
      const normalizedName = String(name).toLowerCase().replace(/\./g, '').replace(/\s+/g, ' ');
      return normalizedBookPart === normalizedName || normalizedBookPart.endsWith(` ${normalizedName}`);
    });
  });
  const chapterVerse = `${verseMatch[1]}:${verseMatch[2].replace(/\s+/g, '')}`;
  // If not found via BIBLE_BOOKS, try the full-name tables (Hebrew / Korean /
  // multi-language) and finally the English abbreviation table.
  const bookId = book?.id ?? lookupFullBookId(bookPart) ?? lookupEnglishAbbrBookId(bookPart);
  return `${bookId || normalizedBookPart}|${chapterVerse}`;
}

// Memoised normalizeVerseReferenceKey: callers run it over every verse in a
// pool/set, and the same reference strings recur across pools.
const __verseRefKeyCache = new Map();
export function verseRefKey(ref) {
  if (!ref) return '';
  let key = __verseRefKeyCache.get(ref);
  if (key === undefined) {
    key = normalizeVerseReferenceKey(ref);
    __verseRefKeyCache.set(ref, key);
  }
  return key;
}
