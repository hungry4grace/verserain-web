export const BIBLE_BOOKS = [
  // Old Testament (id 1-39)
  { id: 1, testament: 'OT', names: ["創世記", "創", "Genesis", "Gen"], ja: "創", ko: "창", es: "Gn", de: "1Mo", tr: "Yar", fa: "پید", he: "בר", my: "ကမ္ဘာ" , vi: "Sáng" , cn: ["创世记", "创"] },
  { id: 2, testament: 'OT', names: ["出埃及記", "出", "Exodus", "Exo"], ja: "出", ko: "출", es: "Ex", de: "2Mo", tr: "Çık", fa: "خروج", he: "שמ", my: "ထွက်" , vi: "Xuất" , cn: ["出埃及记", "出"] },
  { id: 3, testament: 'OT', names: ["利未記", "利", "Leviticus", "Lev"], ja: "レビ", ko: "레", es: "Lv", de: "3Mo", tr: "Lev", fa: "لاو", he: "וי", my: "ဝတ်" , vi: "Lê" , cn: ["利未记", "利"] },
  { id: 4, testament: 'OT', names: ["民數記", "民", "Numbers", "Num"], ja: "民", ko: "민", es: "Nm", de: "4Mo", tr: "Çöl", fa: "اعد", he: "במ", my: "တော" , vi: "Dân" , cn: ["民数记", "民"] },
  { id: 5, testament: 'OT', names: ["申命記", "申", "Deuteronomy", "Deut"], ja: "申", ko: "신", es: "Dt", de: "5Mo", tr: "Yas", fa: "تثن", he: "דב", my: "တရား" , vi: "Phục" , cn: ["申命记", "申"] },
  { id: 6, testament: 'OT', names: ["約書亞記", "書", "Joshua", "Josh"], ja: "ヨシ", ko: "수", es: "Jos", de: "Jos", tr: "Yşu", fa: "یوش", he: "יה", my: "ယောရှု" , vi: "Giô" , cn: ["约书亚记", "书"] },
  { id: 7, testament: 'OT', names: ["士師記", "士", "Judges", "Judg"], ja: "士", ko: "삿", es: "Jue", de: "Ri", tr: "Hak", fa: "داو", he: "שפ", my: "တရားသူ" , vi: "Quan" , cn: ["士师记", "士"] },
  { id: 8, testament: 'OT', names: ["路得記", "得", "Ruth", "Ru"], ja: "ルツ", ko: "룻", es: "Rt", de: "Rt", tr: "Rut", fa: "روت", he: "רת", my: "ရုသ" , vi: "Ru" , cn: ["路得记", "得"] },
  { id: 9, testament: 'OT', names: ["撒母耳記上", "撒上", "1 Samuel", "1 Sam"], ja: "Ⅰサム", ko: "삼상", es: "1S", de: "1Sa", tr: "1Sa", fa: "۱سم", he: "שא", my: "၁ဓမ္မ" , vi: "1 Sa" , cn: ["撒母耳记上", "撒上"] },
  { id: 10, testament: 'OT', names: ["撒母耳記下", "撒下", "2 Samuel", "2 Sam"], ja: "Ⅱサム", ko: "삼하", es: "2S", de: "2Sa", tr: "2Sa", fa: "۲سم", he: "שב", my: "၂ဓမ္မ" , vi: "2 Sa" , cn: ["撒母耳记下", "撒下"] },
  { id: 11, testament: 'OT', names: ["列王紀上", "王上", "1 Kings", "1 Kgs"], ja: "Ⅰ列王", ko: "왕상", es: "1R", de: "1Kö", tr: "1Kr", fa: "۱پاد", he: "מא", my: "၃ဓမ္မ" , vi: "1 Vua" , cn: ["列王纪上", "王上"] },
  { id: 12, testament: 'OT', names: ["列王紀下", "王下", "2 Kings", "2 Kgs"], ja: "Ⅱ列王", ko: "왕하", es: "2R", de: "2Kö", tr: "2Kr", fa: "۲پاد", he: "מב", my: "၄ဓမ္မ" , vi: "2 Vua" , cn: ["列王纪下", "王下"] },
  { id: 13, testament: 'OT', names: ["歷代志上", "代上", "1 Chronicles", "1 Chr"], ja: "Ⅰ歴代", ko: "대상", es: "1Cr", de: "1Ch", tr: "1Ta", fa: "۱توا", he: "דא", my: "၁ရာ" , vi: "1 Sử" , cn: ["历代志上", "代上"] },
  { id: 14, testament: 'OT', names: ["歷代志下", "代下", "2 Chronicles", "2 Chr"], ja: "Ⅱ歴代", ko: "대하", es: "2Cr", de: "2Ch", tr: "2Ta", fa: "۲توا", he: "דב", my: "၂ရာ" , vi: "2 Sử" , cn: ["历代志下", "代下"] },
  { id: 15, testament: 'OT', names: ["以斯拉記", "拉", "Ezra", "Ezr"], ja: "エズ", ko: "스", es: "Esd", de: "Esr", tr: "Ezr", fa: "عزرا", he: "עז", my: "ဧဇရ" , vi: "Ê-xơ" , cn: ["以斯拉记", "拉"] },
  { id: 16, testament: 'OT', names: ["尼希米記", "尼", "Nehemiah", "Neh"], ja: "ネヘ", ko: "느", es: "Neh", de: "Neh", tr: "Neh", fa: "نحم", he: "נח", my: "နေ" , vi: "Nê" , cn: ["尼希米记", "尼"] },
  { id: 17, testament: 'OT', names: ["以斯帖記", "斯", "Esther", "Est"], ja: "エス", ko: "에", es: "Est", de: "Est", tr: "Est", fa: "استر", he: "אס", my: "ဧသတာ" , vi: "Ê-st" , cn: ["以斯帖记", "斯"] },
  { id: 18, testament: 'OT', names: ["約伯記", "伯", "Job", "Jb"], ja: "ヨブ", ko: "욥", es: "Job", de: "Hi", tr: "Eyü", fa: "ایوب", he: "אי", my: "ယောဘ" , vi: "Gióp" , cn: ["约伯记", "伯"] },
  { id: 19, testament: 'OT', names: ["詩篇", "詩", "Psalms", "Ps"], ja: "詩", ko: "시", es: "Sal", de: "Ps", tr: "Mez", fa: "مز", he: "תה", my: "ဆာ" , vi: "Thi" , cn: ["诗篇", "诗"] },
  { id: 20, testament: 'OT', names: ["箴言", "箴", "Proverbs", "Prv"], ja: "箴", ko: "잠", es: "Pr", de: "Spr", tr: "SüM", fa: "امث", he: "מש", my: "သု" , vi: "Châm" , cn: ["箴言", "箴"] },
  { id: 21, testament: 'OT', names: ["傳道書", "傳", "Ecclesiastes", "Eccl"], ja: "伝", ko: "전", es: "Ec", de: "Pred", tr: "Vai", fa: "جا", he: "קה", my: "ဒေသနာ" , vi: "Truyền" , cn: ["传道书", "传"] },
  { id: 22, testament: 'OT', names: ["雅歌", "歌", "Song of Solomon", "SS"], ja: "雅", ko: "아", es: "Cnt", de: "Hl", tr: "Ezi", fa: "غزل", he: "שי", my: "ရှော" , vi: "Nhã" , cn: ["雅歌", "歌"] },
  { id: 23, testament: 'OT', names: ["以賽亞書", "賽", "Isaiah", "Isa"], ja: "イザ", ko: "사", es: "Is", de: "Jes", tr: "Yşa", fa: "اشع", he: "יש", my: "ဟေရှာ" , vi: "Ê-sai" , cn: ["以赛亚书", "赛"] },
  { id: 24, testament: 'OT', names: ["耶利米書", "耶", "Jeremiah", "Jer"], ja: "エレ", ko: "렘", es: "Jr", de: "Jer", tr: "Yer", fa: "ارم", he: "יר", my: "ယေရ" , vi: "Giê" , cn: ["耶利米书", "耶"] },
  { id: 25, testament: 'OT', names: ["耶利米哀歌", "哀", "Lamentations", "Lam"], ja: "哀", ko: "애", es: "Lm", de: "Kla", tr: "Ağı", fa: "مرا", he: "איכ", my: "မြည်" , vi: "Ca" , cn: ["耶利米哀歌", "哀"] },
  { id: 26, testament: 'OT', names: ["以西結書", "結", "Ezekiel", "Ezek"], ja: "エゼ", ko: "겔", es: "Ez", de: "Hes", tr: "Hez", fa: "حز", he: "יח", my: "ယေဇ" , vi: "Ê-xê" , cn: ["以西结书", "结"] },
  { id: 27, testament: 'OT', names: ["但以理書", "但", "Daniel", "Dan"], ja: "ダニ", ko: "단", es: "Dn", de: "Dan", tr: "Dan", fa: "دان", he: "דנ", my: "ဒံ" , vi: "Đa" , cn: ["但以理书", "但"] },
  { id: 28, testament: 'OT', names: ["何西阿書", "何", "Hosea", "Hos"], ja: "ホセ", ko: "호", es: "Os", de: "Hos", tr: "Hoş", fa: "هوش", he: "הוש", my: "ဟော" , vi: "Ô-sê" , cn: ["何西阿书", "何"] },
  { id: 29, testament: 'OT', names: ["約珥書", "珥", "Joel", "Jl"], ja: "ヨエ", ko: "욜", es: "Jl", de: "Joe", tr: "Yoe", fa: "یوئ", he: "יוא", my: "ယောလ" , vi: "Giô-ên" , cn: ["约珥书", "珥"] },
  { id: 30, testament: 'OT', names: ["阿摩司書", "摩", "Amos", "Am"], ja: "アモ", ko: "암", es: "Am", de: "Am", tr: "Amo", fa: "عام", he: "עמ", my: "အာ" , vi: "A-mốt" , cn: ["阿摩司书", "摩"] },
  { id: 31, testament: 'OT', names: ["俄巴底亞書", "俄", "Obadiah", "Ob"], ja: "オバ", ko: "옵", es: "Abd", de: "Ob", tr: "Ova", fa: "عوب", he: "עב", my: "ဩ" , vi: "Áp" , cn: ["俄巴底亚书", "俄"] },
  { id: 32, testament: 'OT', names: ["約拿書", "拿", "Jonah", "Jon"], ja: "ヨナ", ko: "욘", es: "Jon", de: "Jon", tr: "Yun", fa: "یون", he: "יונ", my: "ယောန" , vi: "Giô-na" , cn: ["约拿书", "拿"] },
  { id: 33, testament: 'OT', names: ["彌迦書", "彌", "Micah", "Mic"], ja: "ミカ", ko: "미", es: "Mi", de: "Mi", tr: "Mik", fa: "میک", he: "מי", my: "မိက္ခာ" , vi: "Mi" , cn: ["弥迦书", "弥"] },
  { id: 34, testament: 'OT', names: ["那鴻書", "鴻", "Nahum", "Nah"], ja: "ナホ", ko: "나", es: "Nah", de: "Nah", tr: "Nah", fa: "ناح", he: "נח", my: "နာဟုံ" , vi: "Na" , cn: ["那鸿书", "鸿"] },
  { id: 35, testament: 'OT', names: ["哈巴谷書", "哈", "Habakkuk", "Hab"], ja: "ハバ", ko: "합", es: "Hab", de: "Hab", tr: "Hab", fa: "حبق", he: "חב", my: "ဟဗ" , vi: "Ha" , cn: ["哈巴谷书", "哈"] },
  { id: 36, testament: 'OT', names: ["西番雅書", "番", "Zephaniah", "Zeph"], ja: "ゼパ", ko: "습", es: "Sof", de: "Zef", tr: "Sef", fa: "صفن", he: "צפ", my: "ဇေ" , vi: "Sô" , cn: ["西番雅书", "番"] },
  { id: 37, testament: 'OT', names: ["哈該書", "該", "Haggai", "Hag"], ja: "ハガ", ko: "학", es: "Ag", de: "Hag", tr: "Hag", fa: "حجی", he: "חג", my: "ဟဂ္ဂဲ" , vi: "A-gai" , cn: ["哈该书", "该"] },
  { id: 38, testament: 'OT', names: ["撒迦利亞書", "亞", "Zechariah", "Zech"], ja: "ゼカ", ko: "슥", es: "Zac", de: "Sach", tr: "Zek", fa: "زکر", he: "זכ", my: "ဇာ" , vi: "Xa" , cn: ["撒迦利亚书", "亚"] },
  { id: 39, testament: 'OT', names: ["瑪拉基書", "瑪", "Malachi", "Mal"], ja: "マラ", ko: "말", es: "Mal", de: "Mal", tr: "Mal", fa: "ملا", he: "מל", my: "မာ" , vi: "Ma-la" , cn: ["玛拉基书", "玛"] },
  // New Testament (id 40-66)
  { id: 40, testament: 'NT', names: ["馬太福音", "太", "Matthew", "Matt"], ja: "マタ", ko: "마", es: "Mt", de: "Mt", tr: "Mat", fa: "مت", he: "מת", my: "မဿဲ" , vi: "Ma" , cn: ["马太福音", "太"] },
  { id: 41, testament: 'NT', names: ["馬可福音", "可", "Mark", "Mk"], ja: "マコ", ko: "막", es: "Mr", de: "Mk", tr: "Mar", fa: "مر", he: "מר", my: "မာကု" , vi: "Mác" , cn: ["马可福音", "可"] },
  { id: 42, testament: 'NT', names: ["路加福音", "路", "Luke", "Lk"], ja: "ルカ", ko: "눅", es: "Lc", de: "Lk", tr: "Luk", fa: "لو", he: "לוק", my: "လုကာ" , vi: "Lu" , cn: ["路加福音", "路"] },
  { id: 43, testament: 'NT', names: ["約翰福音", "約", "John", "Jn"], ja: "ヨハ", ko: "요", es: "Jn", de: "Joh", tr: "Yu", fa: "یوح", he: "יוח", my: "ယောဟန်" , vi: "Giăng" , cn: ["约翰福音", "约"] },
  { id: 44, testament: 'NT', names: ["使徒行傳", "徒", "Acts", "Acts"], ja: "使", ko: "행", es: "Hch", de: "Apg", tr: "Elç", fa: "اعم", he: "מע", my: "တမန်" , vi: "Công" , cn: ["使徒行传", "徒"] },
  { id: 45, testament: 'NT', names: ["羅馬書", "羅", "Romans", "Rom"], ja: "ロマ", ko: "롬", es: "Ro", de: "Röm", tr: "Rom", fa: "روم", he: "רו", my: "ရောမ" , vi: "Rô" , cn: ["罗马书", "罗"] },
  { id: 46, testament: 'NT', names: ["哥林多前書", "林前", "1 Corinthians", "1 Cor"], ja: "Ⅰコリ", ko: "고전", es: "1Co", de: "1Ko", tr: "1Ko", fa: "۱قر", he: "קא", my: "၁ကော" , vi: "1 Cô" , cn: ["哥林多前书", "林前"] },
  { id: 47, testament: 'NT', names: ["哥林多後書", "林後", "2 Corinthians", "2 Cor"], ja: "Ⅱコリ", ko: "고후", es: "2Co", de: "2Ko", tr: "2Ko", fa: "۲قر", he: "קב", my: "၂ကော" , vi: "2 Cô" , cn: ["哥林多后书", "林后"] },
  { id: 48, testament: 'NT', names: ["加拉太書", "加", "Galatians", "Gal"], ja: "ガラ", ko: "갈", es: "Gl", de: "Gal", tr: "Gal", fa: "غلا", he: "גל", my: "ဂလာ" , vi: "Ga" , cn: ["加拉太书", "加"] },
  { id: 49, testament: 'NT', names: ["以弗所書", "弗", "Ephesians", "Eph"], ja: "エペ", ko: "엡", es: "Ef", de: "Eph", tr: "Efe", fa: "افس", he: "אפ", my: "ဧဖက်" , vi: "Ê-phê" , cn: ["以弗所书", "弗"] },
  { id: 50, testament: 'NT', names: ["腓立比書", "腓", "Philippians", "Phil"], ja: "ピリ", ko: "빌", es: "Flp", de: "Phil", tr: "Flp", fa: "فیل", he: "פיל", my: "ဖိ" , vi: "Phi" , cn: ["腓立比书", "腓"] },
  { id: 51, testament: 'NT', names: ["歌羅西書", "西", "Colossians", "Col"], ja: "コロ", ko: "골", es: "Col", de: "Kol", tr: "Kol", fa: "کول", he: "קול", my: "ကော" , vi: "Cô" , cn: ["歌罗西书", "西"] },
  { id: 52, testament: 'NT', names: ["帖撒羅尼迦前書", "帖前", "1 Thessalonians", "1 Thess"], ja: "Ⅰテサ", ko: "살전", es: "1Ts", de: "1Th", tr: "1Se", fa: "۱تس", he: "תא", my: "၁သက်" , vi: "1 Tê" , cn: ["帖撒罗尼迦前书", "帖前"] },
  { id: 53, testament: 'NT', names: ["帖撒羅尼迦後書", "帖後", "2 Thessalonians", "2 Thess"], ja: "Ⅱテサ", ko: "살후", es: "2Ts", de: "2Th", tr: "2Se", fa: "۲تس", he: "תב", my: "၂သက်" , vi: "2 Tê" , cn: ["帖撒罗尼迦后书", "帖后"] },
  { id: 54, testament: 'NT', names: ["提摩太前書", "提前", "1 Timothy", "1 Tim"], ja: "Ⅰテモ", ko: "딤전", es: "1Ti", de: "1Ti", tr: "1Ti", fa: "۱تیم", he: "טימא", my: "၁တိ" , vi: "1 Ti" , cn: ["提摩太前书", "提前"] },
  { id: 55, testament: 'NT', names: ["提摩太後書", "提後", "2 Timothy", "2 Tim"], ja: "Ⅱテモ", ko: "딤후", es: "2Ti", de: "2Ti", tr: "2Ti", fa: "۲تیم", he: "טימב", my: "၂တိ" , vi: "2 Ti" , cn: ["提摩太后书", "提后"] },
  { id: 56, testament: 'NT', names: ["提多書", "多", "Titus", "Tit"], ja: "テト", ko: "딛", es: "Tit", de: "Tit", tr: "Tit", fa: "تیت", he: "טיט", my: "တိတု" , vi: "Tít" , cn: ["提多书", "多"] },
  { id: 57, testament: 'NT', names: ["腓利門書", "門", "Philemon", "Phlm"], ja: "ピレ", ko: "몬", es: "Flm", de: "Phm", tr: "Flm", fa: "فلیم", he: "פיל", my: "ဖိလေ" , vi: "Phi-lê" , cn: ["腓利门书", "门"] },
  { id: 58, testament: 'NT', names: ["希伯來書", "來", "Hebrews", "Heb"], ja: "ヘブ", ko: "히", es: "Heb", de: "Heb", tr: "İbr", fa: "عبر", he: "עב", my: "ဟေဗြဲ" , vi: "Hê" , cn: ["希伯来书", "来"] },
  { id: 59, testament: 'NT', names: ["雅各書", "雅", "James", "Jas"], ja: "ヤコ", ko: "약", es: "Stg", de: "Jak", tr: "Yak", fa: "یعق", he: "יע", my: "ယာကုပ်" , vi: "Gia" , cn: ["雅各书", "雅"] },
  { id: 60, testament: 'NT', names: ["彼得前書", "彼前", "1 Peter", "1 Pet"], ja: "Ⅰペテ", ko: "벧전", es: "1P", de: "1Pe", tr: "1Pe", fa: "۱پط", he: "פטא", my: "၁ပေ" , vi: "1 Phi" , cn: ["彼得前书", "彼前"] },
  { id: 61, testament: 'NT', names: ["彼得後書", "彼後", "2 Peter", "2 Pet"], ja: "Ⅱペテ", ko: "벧후", es: "2P", de: "2Pe", tr: "2Pe", fa: "۲پط", he: "פטב", my: "၂ပေ" , vi: "2 Phi" , cn: ["彼得后书", "彼后"] },
  { id: 62, testament: 'NT', names: ["約翰一書", "約一", "1 John", "1 Jn"], ja: "Ⅰヨハ", ko: "요일", es: "1Jn", de: "1Jo", tr: "1Yu", fa: "۱یوح", he: "יוחא", my: "၁ယော" , vi: "1 Giăng" , cn: ["约翰一书", "约一"] },
  { id: 63, testament: 'NT', names: ["約翰二書", "約二", "2 John", "2 Jn"], ja: "Ⅱヨハ", ko: "요이", es: "2Jn", de: "2Jo", tr: "2Yu", fa: "۲یوح", he: "יוחב", my: "၂ယော" , vi: "2 Giăng" , cn: ["约翰二书", "约二"] },
  { id: 64, testament: 'NT', names: ["約翰三書", "約三", "3 John", "3 Jn"], ja: "Ⅲヨハ", ko: "요삼", es: "3Jn", de: "3Jo", tr: "3Yu", fa: "۳یوح", he: "יוחג", my: "၃ယော" , vi: "3 Giăng" , cn: ["约翰三书", "约三"] },
  { id: 65, testament: 'NT', names: ["猶大書", "猶", "Jude", "Jude"], ja: "ユダ", ko: "유", es: "Jud", de: "Jud", tr: "Yah", fa: "یهو", he: "יהו", my: "ယုဒ" , vi: "Giu" , cn: ["犹大书", "犹"] },
  { id: 66, testament: 'NT', names: ["啟示錄", "啟", "Revelation", "Rev"], ja: "黙", ko: "계", es: "Ap", de: "Offb", tr: "Esi", fa: "مکا", he: "התג", my: "ဗျာ" , vi: "Khải" , cn: ["启示录", "启"] }
];

// Get the display abbreviation for a book based on language version
export function getBookAbbr(book, version) {
  if (version === 'ja') return book.ja;
  if (version === 'ko') return book.ko;
  if (version === 'es') return book.es;
  if (version === 'de') return book.de;
  if (version === 'tr') return book.tr;
  if (version === 'fa') return book.fa;
  if (version === 'he') return book.he;
  if (version === 'my') return book.my;
  if (version === 'vi') return book.vi || book.names[3]; // Fallback to English abbr
  if (version === 'kjv') return book.names[3]; // English abbr
  if (version === 'cuvs') return book.cn[1]; // Simplified Chinese abbr
  return book.names[1]; // Chinese abbr
}

// Get the full name for a book based on language version
export function getBookFullName(book, version) {
  if (version === 'ja') return book.ja;
  if (version === 'ko') return book.ko;
  if (version === 'es') return book.es;
  if (version === 'de') return book.de;
  if (version === 'tr') return book.tr;
  if (version === 'fa') return book.fa;
  if (version === 'he') return book.he;
  if (version === 'my') return book.my;
  if (version === 'vi') return book.vi || book.names[2]; // Fallback to English full name
  if (version === 'kjv') return book.names[2]; // English full
  if (version === 'cuvs') return book.cn[0]; // Simplified Chinese full
  return book.names[0]; // Chinese full
}
