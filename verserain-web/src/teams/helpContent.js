// In-app help content for the Companion Teams feature.
// Fifteen languages: zh (Traditional Chinese), cuvs (Simplified Chinese), en,
// he, fa, ar, ja, ko, es, tr, de, my (Burmese, Unicode), vi, id, ms.
// Any unknown UI language falls back to English at the modal level.
//
// Each language uses identical section keys so the modal can render
// without per-language branching. Sections are kept short — the full
// guide lives in TEAMS.md / TEAMS.en.md / TEAMS.zh-cn.md.

export const HELP_CONTENT = {
  zh: {
    title: '雲端家人 · 使用說明',
    intro: '每天有神的話,有家人的溫柔問候 — 不是比賽。',
    sections: [
      {
        title: '🌳 設計原則',
        body: '雲端家人有四條紅線,**永遠不會改變**:\n\n· 不排名 — 列表按加入順序,不按完成數或點數\n· 不顯示落後 — 不秀「比某人少幾節」\n· 里程碑式回饋 — 完成顯示 ✓,不秀分數差距\n· 管理員是牧者,不是裁判 — 不能罰沉默的人\n\n點數**不是用來比較**,而是讓你看見:你這週的成長,以及全家一起的果子。',
      },
      {
        title: '🚀 怎麼加入 / 建立',
        body: '**加入團隊**有三種方法:\n· 掃管理員給的 QR Code\n· 點分享連結 (verserain.com/?join=…)\n· 手動輸入邀請碼 (XXX-XXXX)\n\n**建立團隊**:點「+ 建立團隊」,取名字、寫描述,你就是第一位管理員。\n\n· 一個人可同時加入 **20 個團**\n· 一個人可建立 **5 個團**\n· 一個團最多 **200 位團員、8 位管理員**\n· 同一人在不同團可扮演不同角色(A 團是管理員,B 團是團員)',
      },
      {
        title: '📖 三大功能',
        body: '**讀經進度表** — 管理員設計項目(標題、經文清單、目標日期、給團員的話)。團員點經文按鈕標記完成 ✓。\n\n**心得 · 代禱** — 每個項目下方可發分享:\n· 心得(藍標)— 個人領受、見證\n· 代禱(紫標)— 請小組為你代禱\n團員都看得到,可按 emoji 回應 (❤️ 🙏 ✨ 🌧️)。\n\n**鼓勵 (Cheer)** — 對團員卡片送 emoji 或寫留言(140 字)。也可對心得按 emoji 回應。',
      },
      {
        title: '🍎 點數規則',
        body: '點數整合進你的「果園 garden」,**不另立貨幣**。\n\n· 讀一節經文(首次): **3 點**\n· 寫心得 / 代禱(同項目每天首篇): **15 點**\n· 心得被別人按 emoji(每位回應者): **+2 點**\n· 一鍵 emoji 鼓勵: **1 點** (每日上限 10)\n· 寫留言鼓勵: **5 點** (每日上限 5 則)\n· 對心得按 emoji 回應: **2 點** (每日上限 20 次)\n· 管理員建立團隊: **20 點** (一次性)\n· 進度表項目有經文清單: **10 點** (每項目一次性)\n· 進度表項目有有意義描述(>20 字): **5 點** (每項目一次性)',
      },
      {
        title: '❓ 常見問題',
        body: '**點數會排名嗎?** 永遠不會。團員只看見自己的點數和全團集體本週總數。\n\n**讀同一節在多個團會多賺嗎?** 不會。讀經是個人的事 — 一節經文一生只計一次 3 點。但「心得、鼓勵」是社群動作,不同團各自計算。\n\n**離團點數會收回嗎?** 不會。累計在你的個人果園裡,離團不影響。\n\n**內容讓我不舒服怎麼辦?** 找管理員 — 管理員可以刪除任何團員的心得 / 代禱。',
      },
    ],
    closeBtn: '關閉',
    detailLink: '完整版說明在 TEAMS.md',
  },

  cuvs: {
    title: '云端家人 · 使用说明',
    intro: '每天有神的话,有家人的温柔问候 — 不是比赛。',
    sections: [
      {
        title: '🌳 设计原则',
        body: '云端家人有四条红线,**永远不会改变**:\n\n· 不排名 — 列表按加入顺序,不按完成数或点数\n· 不显示落后 — 不秀「比某人少几节」\n· 里程碑式回馈 — 完成显示 ✓,不秀分数差距\n· 管理员是牧者,不是裁判 — 不能罚沉默的人\n\n点数**不是用来比较**,而是让你看见:你这周的成长,以及全家一起的果子。',
      },
      {
        title: '🚀 怎么加入 / 建立',
        body: '**加入团队**有三种方法:\n· 扫管理员给的 QR Code\n· 点分享链接 (verserain.com/?join=…)\n· 手动输入邀请码 (XXX-XXXX)\n\n**建立团队**:点「+ 建立团队」,取名字、写描述,你就是第一位管理员。\n\n· 一个人可同时加入 **20 个团**\n· 一个人可建立 **5 个团**\n· 一个团最多 **200 位团员、8 位管理员**\n· 同一人在不同团可扮演不同角色(A 团是管理员,B 团是团员)',
      },
      {
        title: '📖 三大功能',
        body: '**读经进度表** — 管理员设计项目(标题、经文清单、目标日期、给团员的话)。团员点经文按钮标记完成 ✓。\n\n**心得 · 代祷** — 每个项目下方可发分享:\n· 心得(蓝标)— 个人领受、见证\n· 代祷(紫标)— 请小组为你代祷\n团员都看得到,可按 emoji 回应 (❤️ 🙏 ✨ 🌧️)。\n\n**鼓励 (Cheer)** — 对团员卡片送 emoji 或写留言(140 字)。也可对心得按 emoji 回应。',
      },
      {
        title: '🍎 点数规则',
        body: '点数整合进你的「果园 garden」,**不另立货币**。\n\n· 读一节经文(首次): **3 点**\n· 写心得 / 代祷(同项目每天首篇): **15 点**\n· 心得被别人按 emoji(每位回应者): **+2 点**\n· 一键 emoji 鼓励: **1 点** (每日上限 10)\n· 写留言鼓励: **5 点** (每日上限 5 则)\n· 对心得按 emoji 回应: **2 点** (每日上限 20 次)\n· 管理员建立团队: **20 点** (一次性)\n· 进度表项目有经文清单: **10 点** (每项目一次性)\n· 进度表项目有有意义描述(>20 字): **5 点** (每项目一次性)',
      },
      {
        title: '❓ 常见问题',
        body: '**点数会排名吗?** 永远不会。团员只看见自己的点数和全团集体本周总数。\n\n**读同一节在多个团会多赚吗?** 不会。读经是个人的事 — 一节经文一生只计一次 3 点。但「心得、鼓励」是社群动作,不同团各自计算。\n\n**离团点数会收回吗?** 不会。累计在你的个人果园里,离团不影响。\n\n**内容让我不舒服怎么办?** 找管理员 — 管理员可以删除任何团员的心得 / 代祷。',
      },
    ],
    closeBtn: '关闭',
    detailLink: '完整版说明在 TEAMS.zh-cn.md',
  },

  en: {
    title: 'Cloud Family · Guide',
    intro: 'God\'s word every day, and warm greetings from family — not a competition.',
    sections: [
      {
        title: '🌳 Design principles',
        body: 'Four red lines we **never cross**:\n\n· No ranking — lists are ordered by join time, never by completions or points\n· No "behind" framing — you never see "you have N fewer verses than X"\n· Milestone feedback, not score gaps — completing shows ✓, not a delta\n· Admins are shepherds, not referees — they cannot punish silent members\n\nPoints exist **not for comparison**, but so you can see your own growth this week and your team\'s collective fruit.',
      },
      {
        title: '🚀 Join or create',
        body: '**Join a team** three ways:\n· Scan the admin\'s QR code\n· Tap a share link (verserain.com/?join=…)\n· Enter an invite code manually (XXX-XXXX)\n\n**Create a team**: tap "+ Create team", give it a name and short description — you become the first admin.\n\n· One person can join **20 teams** at the same time\n· One person can create **5 teams**\n· A team holds at most **200 members, 8 admins**\n· One person can have different roles in different teams (admin in team A, member in team B)',
      },
      {
        title: '📖 The three features',
        body: '**Reading schedule** — admin sets up items (title, verses, target date, note to the team). Members tap verse buttons to mark them complete ✓.\n\n**Reflections · Prayers** — under each item, anyone can post:\n· Reflection (blue tag) — personal insight, testimony\n· Prayer (purple tag) — what the team should pray for you about\nAll members see them. React with emoji (❤️ 🙏 ✨ 🌧️).\n\n**Cheer** — send emoji or a short note (140 chars) to a member\'s card. React to reflections similarly.',
      },
      {
        title: '🍎 Point rules',
        body: 'Points integrate into your existing fruit garden — **no separate currency**.\n\n· Mark a verse complete (first time): **3 pts**\n· Write reflection / prayer (first per item per day): **15 pts**\n· Your reflection receives an emoji reaction (per unique reactor): **+2 pts**\n· Quick-tap emoji on a member: **1 pt** (daily cap 10)\n· Text cheer on a member: **5 pts** (daily cap 5 notes)\n· Emoji react to a reflection: **2 pts** (daily cap 20 times)\n· Admin creates a team: **20 pts** (one-time)\n· Schedule item has verses listed: **10 pts** (one-time per item)\n· Schedule item has a meaningful description (>20 chars): **5 pts** (one-time per item)',
      },
      {
        title: '❓ Top questions',
        body: '**Will points ever be ranked?** Never. Members only see their own points and the team\'s collective weekly total.\n\n**Reading the same verse in multiple teams — extra points?** No. Reading is personal — each verse earns 3 pts once in your lifetime. But reflections and cheers are social acts and count separately per team.\n\n**If I leave a team, do I lose my points?** No. Points accumulate in your personal garden globally.\n\n**Something a member wrote bothers me — what now?** Talk to the admin — admins can delete any member\'s reflection or prayer.',
      },
    ],
    closeBtn: 'Close',
    detailLink: 'Full guide in TEAMS.en.md',
  },

  he: {
    title: 'משפחת הענן · מדריך',
    intro: 'דבר אלוהים בכל יום, וברכה חמה מבני המשפחה — לא תחרות.',
    sections: [
      {
        title: '🌳 עקרונות העיצוב',
        body: 'ארבעה קווים אדומים ש**לעולם לא נחצה**:\n\n· בלי דירוג — הרשימות מסודרות לפי סדר ההצטרפות, לעולם לא לפי מספר ההשלמות או הנקודות\n· בלי "פיגור" — לעולם לא תראו "יש לכם N פסוקים פחות מאשר X"\n· משוב של אבני דרך, לא פערי ניקוד — השלמה מסומנת ב-✓, לא בהפרש\n· המנהלים הם רועים, לא שופטים — הם אינם יכולים להעניש את מי ששותק\n\nהנקודות קיימות **לא לשם השוואה**, אלא כדי שתראו את הצמיחה שלכם השבוע ואת הפרי שכל המשפחה נושאת יחד.',
      },
      {
        title: '🚀 להצטרף או ליצור',
        body: '**להצטרף לקבוצה** בשלוש דרכים:\n· לסרוק את ה-QR Code של המנהל\n· ללחוץ על קישור שיתוף (verserain.com/?join=…)\n· להקליד קוד הזמנה ידנית (XXX-XXXX)\n\n**ליצור קבוצה**: לחצו על "+ צור קבוצה", תנו לה שם ותיאור קצר — ואתם הופכים למנהל הראשון.\n\n· אדם אחד יכול להצטרף ל-**20 קבוצות** במקביל\n· אדם אחד יכול ליצור **5 קבוצות**\n· בקבוצה אחת יש לכל היותר **200 חברים ו-8 מנהלים**\n· אותו אדם יכול למלא תפקידים שונים בקבוצות שונות (מנהל בקבוצה א, חבר בקבוצה ב)',
      },
      {
        title: '📖 שלוש התכונות',
        body: '**לוח קריאה** — המנהל מגדיר פריטים (כותרת, רשימת פסוקים, תאריך יעד, מילה לחברי הקבוצה). החברים לוחצים על כפתורי הפסוקים כדי לסמן השלמה ✓.\n\n**הגיגים · תפילות** — מתחת לכל פריט כל אחד יכול לפרסם:\n· הגות (תווית כחולה) — תובנה אישית, עדות\n· תפילה (תווית סגולה) — מה שתרצו שהקבוצה תתפלל עבורכם\nכל החברים רואים אותן, ואפשר להגיב באמוג\'י (❤️ 🙏 ✨ 🌧️).\n\n**עידוד (Cheer)** — שלחו אמוג\'י או פתק קצר (140 תווים) לכרטיס של חבר. אפשר גם להגיב באמוג\'י להגיגים.',
      },
      {
        title: '🍎 כללי הנקודות',
        body: 'הנקודות משתלבות בגן הפירות הקיים שלכם — **בלי מטבע נפרד**.\n\n· סימון פסוק כהושלם (בפעם הראשונה): **3 נקודות**\n· כתיבת הגות / תפילה (הראשונה בכל פריט בכל יום): **15 נקודות**\n· ההגות שלכם מקבלת תגובת אמוג\'י (לכל מגיב ייחודי): **+2 נקודות**\n· אמוג\'י מהיר לחבר: **נקודה 1** (מגבלה יומית 10)\n· פתק עידוד לחבר: **5 נקודות** (מגבלה יומית 5 פתקים)\n· תגובת אמוג\'י להגות: **2 נקודות** (מגבלה יומית 20 פעמים)\n· מנהל יוצר קבוצה: **20 נקודות** (חד-פעמי)\n· לפריט בלוח יש רשימת פסוקים: **10 נקודות** (חד-פעמי לכל פריט)\n· לפריט בלוח יש תיאור בעל משמעות (מעל 20 תווים): **5 נקודות** (חד-פעמי לכל פריט)',
      },
      {
        title: '❓ שאלות נפוצות',
        body: '**האם הנקודות ידורגו אי פעם?** לעולם לא. כל חבר רואה רק את הנקודות של עצמו ואת הסך השבועי המשותף של הקבוצה.\n\n**קריאת אותו פסוק בכמה קבוצות — נקודות נוספות?** לא. הקריאה היא עניין אישי — כל פסוק מזכה ב-3 נקודות פעם אחת בחיים. אבל הגיגים ועידודים הם מעשים של קהילה, ונספרים בנפרד בכל קבוצה.\n\n**אם אעזוב קבוצה, אאבד את הנקודות?** לא. הנקודות נצברות בגן האישי שלכם, והעזיבה אינה משפיעה עליהן.\n\n**משהו שחבר כתב מפריע לי — מה עכשיו?** דברו עם המנהל — מנהלים יכולים למחוק כל הגות או תפילה של כל חבר.',
      },
    ],
    closeBtn: 'סגירה',
    detailLink: 'המדריך המלא נמצא ב-TEAMS.en.md',
  },

  fa: {
    title: 'خانوادهٔ ابری · راهنما',
    intro: 'هر روز کلام خدا و سلامی گرم از خانواده — نه یک مسابقه.',
    sections: [
      {
        title: '🌳 اصول طراحی',
        body: 'چهار خط قرمز که **هرگز از آنها نمی‌گذریم**:\n\n· بدون رتبه‌بندی — فهرست‌ها بر پایهٔ زمان پیوستن مرتب می‌شوند، نه بر پایهٔ تعداد آیه‌ها یا امتیازها\n· بدون نشان دادن «عقب‌ماندگی» — هرگز نمی‌بینید «شما N آیه از X کمتر دارید»\n· بازخورد در نقطه‌های عطف، نه فاصلهٔ امتیاز — تکمیل با ✓ نشان داده می‌شود، نه با اختلاف\n· مدیران شبان‌اند، نه داور — نمی‌توانند اعضای خاموش را تنبیه کنند\n\nامتیازها **برای مقایسه نیستند**، بلکه هستند تا رشد خودتان را در این هفته و میوهٔ جمعی همهٔ خانواده را ببینید.',
      },
      {
        title: '🚀 پیوستن یا ساختن',
        body: '**پیوستن به یک تیم** به سه روش:\n· اسکن QR Code مدیر\n· زدن روی پیوند اشتراک (verserain.com/?join=…)\n· وارد کردن دستی کد دعوت (XXX-XXXX)\n\n**ساختن تیم**: روی «+ ساختن تیم» بزنید، نام و توضیحی کوتاه بنویسید — شما نخستین مدیر می‌شوید.\n\n· هر فرد می‌تواند هم‌زمان به **20 تیم** بپیوندد\n· هر فرد می‌تواند **5 تیم** بسازد\n· هر تیم حداکثر **200 عضو و 8 مدیر** دارد\n· یک نفر می‌تواند در تیم‌های گوناگون نقش‌های متفاوت داشته باشد (مدیر در تیم الف، عضو در تیم ب)',
      },
      {
        title: '📖 سه قابلیت اصلی',
        body: '**برنامهٔ مطالعه** — مدیر موردها را می‌سازد (عنوان، فهرست آیه‌ها، تاریخ هدف، سخنی برای اعضا). اعضا با زدن دکمهٔ هر آیه، آن را تکمیل‌شده ✓ علامت می‌زنند.\n\n**تأمل‌ها · دعاها** — زیر هر مورد، هر کسی می‌تواند بنویسد:\n· تأمل (برچسب آبی) — دریافت شخصی، شهادت\n· دعا (برچسب بنفش) — آنچه می‌خواهید تیم برایتان دعا کند\nهمهٔ اعضا آنها را می‌بینند و می‌توانند با ایموجی واکنش دهند (❤️ 🙏 ✨ 🌧️).\n\n**تشویق (Cheer)** — برای کارت یک عضو ایموجی یا یادداشتی کوتاه (140 نویسه) بفرستید. به تأمل‌ها هم می‌توانید با ایموجی واکنش دهید.',
      },
      {
        title: '🍎 قواعد امتیاز',
        body: 'امتیازها در همان باغ میوهٔ کنونی شما جمع می‌شوند — **ارز جداگانه‌ای در کار نیست**.\n\n· علامت زدن یک آیه به‌عنوان خوانده‌شده (بار نخست): **3 امتیاز**\n· نوشتن تأمل / دعا (نخستین نوشته برای هر مورد در هر روز): **15 امتیاز**\n· دریافت واکنش ایموجی روی تأمل شما (به ازای هر واکنش‌دهندهٔ یکتا): **+2 امتیاز**\n· ایموجی سریع برای یک عضو: **1 امتیاز** (سقف روزانه 10)\n· یادداشت تشویقی برای یک عضو: **5 امتیاز** (سقف روزانه 5 یادداشت)\n· واکنش ایموجی به یک تأمل: **2 امتیاز** (سقف روزانه 20 بار)\n· ساختن تیم به دست مدیر: **20 امتیاز** (یک‌بار)\n· مورد برنامه فهرست آیه‌ها دارد: **10 امتیاز** (یک‌بار برای هر مورد)\n· مورد برنامه توضیحی معنادار دارد (بیش از 20 نویسه): **5 امتیاز** (یک‌بار برای هر مورد)',
      },
      {
        title: '❓ پرسش‌های پرتکرار',
        body: '**آیا امتیازها روزی رتبه‌بندی می‌شوند؟** هرگز. هر عضو تنها امتیاز خودش و مجموع هفتگی جمعی تیم را می‌بیند.\n\n**خواندن یک آیه در چند تیم امتیاز بیشتری می‌دهد؟** نه. خواندن کاری شخصی است — هر آیه در تمام عمر تنها یک‌بار 3 امتیاز دارد. اما تأمل و تشویق کنش‌هایی اجتماعی‌اند و در هر تیم جداگانه شمرده می‌شوند.\n\n**اگر تیمی را ترک کنم، امتیازهایم را از دست می‌دهم؟** نه. امتیازها در باغ شخصی شما می‌مانند و ترک تیم بر آنها اثری ندارد.\n\n**نوشتهٔ یکی از اعضا آزارم می‌دهد — چه کنم؟** با مدیر صحبت کنید — مدیران می‌توانند تأمل یا دعای هر عضوی را حذف کنند.',
      },
    ],
    closeBtn: 'بستن',
    detailLink: 'راهنمای کامل در TEAMS.en.md',
  },

  ar: {
    title: 'عائلة السحاب · الدليل',
    intro: 'كلمة الله كل يوم، وتحية دافئة من الأهل — وليست مسابقة.',
    sections: [
      {
        title: '🌳 مبادئ التصميم',
        body: 'أربعة خطوط حمراء **لا نتجاوزها أبدًا**:\n\n· لا ترتيب تنافسي — القوائم مرتبة حسب وقت الانضمام، لا حسب عدد الآيات أو النقاط\n· لا عبارات «أنت متأخر» — لن ترى أبدًا «ينقصك N آية عن فلان»\n· تشجيع عند المحطات لا بفارق النقاط — الإتمام يظهر ✓، لا فرقًا في الأرقام\n· المشرفون رعاة لا حكّام — لا يمكنهم معاقبة الأعضاء الصامتين\n\nالنقاط ليست **للمقارنة**، بل لترى نموّك أنت هذا الأسبوع وثمر العائلة كلها معًا.',
      },
      {
        title: '🚀 الانضمام أو الإنشاء',
        body: '**الانضمام إلى فريق** بثلاث طرق:\n· مسح QR Code الذي يعطيك إياه المشرف\n· الضغط على رابط المشاركة (verserain.com/?join=…)\n· إدخال رمز الدعوة يدويًا (XXX-XXXX)\n\n**إنشاء فريق**: اضغط «+ إنشاء فريق»، واختر اسمًا ووصفًا قصيرًا — فتصير أول مشرف.\n\n· يستطيع الشخص الواحد الانضمام إلى **20 فريقًا** في الوقت نفسه\n· يستطيع الشخص الواحد إنشاء **5 فرق**\n· يتسع الفريق لـ **200 عضو و8 مشرفين** كحد أقصى\n· يمكن للشخص نفسه أن يكون له دور مختلف في كل فريق (مشرف في الفريق أ، عضو في الفريق ب)',
      },
      {
        title: '📖 المزايا الثلاث',
        body: '**جدول القراءة** — يُعدّ المشرف البنود (عنوان، قائمة الآيات، التاريخ المستهدف، كلمة للأعضاء). يضغط الأعضاء أزرار الآيات لتعليمها مكتملة ✓.\n\n**تأملات · طلبات صلاة** — تحت كل بند يستطيع أي عضو أن ينشر:\n· تأمل (وسم أزرق) — إدراك شخصي أو شهادة\n· صلاة (وسم بنفسجي) — ما تريد أن يصلي الفريق لأجله\nيراها جميع الأعضاء، ويمكن التفاعل بالإيموجي (❤️ 🙏 ✨ 🌧️).\n\n**تشجيع (Cheer)** — أرسل إيموجي أو رسالة قصيرة (140 حرفًا) إلى بطاقة عضو. ويمكنك أيضًا التفاعل بالإيموجي مع التأملات.',
      },
      {
        title: '🍎 قواعد النقاط',
        body: 'تندمج النقاط في بستان ثمارك الحالي — **بلا عملة منفصلة**.\n\n· تعليم آية كمقروءة (أول مرة): **3 نقاط**\n· كتابة تأمل / صلاة (الأولى لكل بند في اليوم): **15 نقطة**\n· تلقّي تفاعل إيموجي على تأملك (لكل متفاعل مختلف): **+2 نقطة**\n· إيموجي سريع لعضو: **1 نقطة** (الحد اليومي 10)\n· رسالة تشجيع لعضو: **5 نقاط** (الحد اليومي 5 رسائل)\n· تفاعل إيموجي مع تأمل: **2 نقطة** (الحد اليومي 20 مرة)\n· إنشاء المشرف لفريق: **20 نقطة** (مرة واحدة)\n· بند الجدول يحتوي قائمة آيات: **10 نقاط** (مرة واحدة لكل بند)\n· بند الجدول له وصف ذو معنى (أكثر من 20 حرفًا): **5 نقاط** (مرة واحدة لكل بند)',
      },
      {
        title: '❓ أسئلة شائعة',
        body: '**هل تُرتَّب النقاط تنافسيًا؟** أبدًا. لا يرى العضو إلا نقاطه هو ومجموع الفريق الأسبوعي المشترك.\n\n**هل قراءة الآية نفسها في عدة فرق تعطي نقاطًا إضافية؟** لا. القراءة أمر شخصي — كل آية تُحتسب 3 نقاط مرة واحدة في العمر. أما التأملات والتشجيعات فأفعال جماعية، وتُحسب في كل فريق على حدة.\n\n**إن غادرت فريقًا، هل أفقد نقاطي؟** لا. النقاط تتراكم في بستانك الشخصي، والمغادرة لا تؤثر فيها.\n\n**كتب أحد الأعضاء ما يزعجني — ماذا أفعل؟** تحدث مع المشرف — يستطيع المشرفون حذف أي تأمل أو صلاة لأي عضو.',
      },
    ],
    closeBtn: 'إغلاق',
    detailLink: 'الدليل الكامل في TEAMS.en.md',
  },

  ja: {
    title: 'クラウド・ファミリー · 使い方ガイド',
    intro: '毎日、神のことばと、家族からのあたたかい挨拶を — 競争ではありません。',
    sections: [
      {
        title: '🌳 設計の原則',
        body: '**決して越えない**4つのレッドラインがあります。\n\n· ランキングなし — 一覧は参加順に並び、達成数やポイント順にはしません\n· 「遅れている」表示なし — 「あなたは◯◯さんより N 節少ない」とは決して見せません\n· 点差ではなくマイルストーンで励ます — 完了は ✓ で示し、差は見せません\n· 管理者は牧者であって審判ではありません — 沈黙している人を罰することはできません\n\nポイントは**比較のためではなく**、今週の自分の成長と、家族みんなで結んだ実を見るためにあります。',
      },
      {
        title: '🚀 参加する / つくる',
        body: '**チームに参加する**方法は3つ:\n· 管理者の QR Code を読み取る\n· 共有リンクをタップする (verserain.com/?join=…)\n· 招待コードを手で入力する (XXX-XXXX)\n\n**チームをつくる**: 「+ チームを作成」をタップし、名前と短い説明を入れると、あなたが最初の管理者になります。\n\n· 1人が同時に参加できるのは **20 チーム**まで\n· 1人が作成できるのは **5 チーム**まで\n· 1つのチームは最大 **200 名のメンバー、8 名の管理者**\n· 同じ人がチームごとに違う役割を持てます(A チームでは管理者、B チームではメンバー)',
      },
      {
        title: '📖 3つの機能',
        body: '**読書スケジュール** — 管理者が項目を用意します(タイトル、聖句リスト、目標日、メンバーへのひとこと)。メンバーは聖句ボタンをタップして完了 ✓ を記録します。\n\n**分かち合い · 祈りのリクエスト** — 各項目の下に、だれでも投稿できます:\n· 分かち合い(青いタグ)— 個人的な気づき、証し\n· 祈り(紫のタグ)— チームに祈ってほしいこと\nメンバー全員が見ることができ、絵文字でリアクションできます (❤️ 🙏 ✨ 🌧️)。\n\n**チア (Cheer)** — メンバーのカードに絵文字や短いメッセージ(140 文字)を送ります。分かち合いにも絵文字でリアクションできます。',
      },
      {
        title: '🍎 ポイントのルール',
        body: 'ポイントは今ある「果樹園 garden」に統合されます — **別の通貨は作りません**。\n\n· 聖句を完了にする(初回): **3 ポイント**\n· 分かち合い / 祈りを書く(同じ項目につき1日1回目): **15 ポイント**\n· 自分の分かち合いに絵文字リアクションがつく(リアクションした人ごとに): **+2 ポイント**\n· メンバーへのワンタップ絵文字: **1 ポイント**(1日 10 回まで)\n· メンバーへのメッセージ: **5 ポイント**(1日 5 件まで)\n· 分かち合いへの絵文字リアクション: **2 ポイント**(1日 20 回まで)\n· 管理者がチームを作成: **20 ポイント**(1回のみ)\n· スケジュール項目に聖句リストがある: **10 ポイント**(項目ごとに1回)\n· スケジュール項目に意味のある説明がある(20 文字超): **5 ポイント**(項目ごとに1回)',
      },
      {
        title: '❓ よくある質問',
        body: '**ポイントで順位がつくことはありますか?** ありません。メンバーが見るのは自分のポイントと、チーム全体の今週の合計だけです。\n\n**同じ聖句を複数のチームで読むとポイントは増えますか?** 増えません。読むことは個人的な営みです — 1つの聖句につき生涯で1回だけ 3 ポイントです。ただし分かち合いやチアは交わりの行いなので、チームごとに別々に数えます。\n\n**チームを抜けるとポイントは失われますか?** 失われません。ポイントはあなた個人の果樹園に積み上がり、脱退の影響を受けません。\n\n**だれかの書いた内容が気になります。どうすれば?** 管理者に相談してください — 管理者はどのメンバーの分かち合い / 祈りも削除できます。',
      },
    ],
    closeBtn: '閉じる',
    detailLink: '詳しいガイドは TEAMS.en.md にあります',
  },

  ko: {
    title: '클라우드 패밀리 · 사용 안내',
    intro: '날마다 하나님의 말씀과 가족의 따뜻한 안부를 — 경쟁이 아닙니다.',
    sections: [
      {
        title: '🌳 설계 원칙',
        body: '우리가 **결코 넘지 않는** 네 가지 선이 있습니다:\n\n· 순위 없음 — 목록은 가입한 순서대로이며, 완료 수나 점수 순이 아닙니다\n· 뒤처짐을 드러내지 않음 — "○○님보다 N절 적습니다" 같은 표시는 하지 않습니다\n· 점수 차가 아니라 이정표로 응답 — 완료하면 ✓ 만 표시하고 차이는 보여주지 않습니다\n· 관리자는 목자이지 심판이 아닙니다 — 조용한 지체를 벌할 수 없습니다\n\n점수는 **비교하라고 있는 것이 아니라**, 이번 주 나의 자람과 온 가족이 함께 맺은 열매를 보라고 있는 것입니다.',
      },
      {
        title: '🚀 가입하기 / 만들기',
        body: '**팀에 가입하는** 세 가지 방법:\n· 관리자의 QR Code 스캔하기\n· 공유 링크 누르기 (verserain.com/?join=…)\n· 초대 코드를 직접 입력하기 (XXX-XXXX)\n\n**팀 만들기**: "+ 팀 만들기"를 누르고 이름과 짧은 소개를 적으면, 당신이 첫 번째 관리자가 됩니다.\n\n· 한 사람이 동시에 **20개 팀**에 가입할 수 있습니다\n· 한 사람이 **5개 팀**을 만들 수 있습니다\n· 한 팀은 최대 **200명의 팀원, 8명의 관리자**\n· 같은 사람이 팀마다 다른 역할을 가질 수 있습니다 (A팀에서는 관리자, B팀에서는 팀원)',
      },
      {
        title: '📖 세 가지 기능',
        body: '**읽기 진도표** — 관리자가 항목을 만듭니다 (제목, 말씀 목록, 목표 날짜, 팀원에게 전하는 말). 팀원은 말씀 버튼을 눌러 완료 ✓ 를 표시합니다.\n\n**나눔 · 기도제목** — 각 항목 아래에 누구나 올릴 수 있습니다:\n· 나눔 (파란 태그) — 개인적인 깨달음, 간증\n· 기도 (보라 태그) — 팀이 나를 위해 기도해 주기를 바라는 제목\n모든 팀원이 볼 수 있고, 이모지로 반응할 수 있습니다 (❤️ 🙏 ✨ 🌧️).\n\n**격려 (Cheer)** — 팀원의 카드에 이모지나 짧은 메시지(140자)를 보냅니다. 나눔에도 이모지로 반응할 수 있습니다.',
      },
      {
        title: '🍎 점수 규칙',
        body: '점수는 이미 있는 열매 정원(garden)에 그대로 합해집니다 — **따로 화폐를 만들지 않습니다**.\n\n· 말씀 한 절 완료 표시 (처음 한 번): **3점**\n· 나눔 / 기도 쓰기 (같은 항목에서 하루 첫 글): **15점**\n· 내 나눔에 이모지 반응이 달림 (반응한 사람마다): **+2점**\n· 팀원에게 원터치 이모지: **1점** (하루 최대 10회)\n· 팀원에게 메시지 격려: **5점** (하루 최대 5개)\n· 나눔에 이모지로 반응: **2점** (하루 최대 20회)\n· 관리자가 팀을 만듦: **20점** (1회성)\n· 진도표 항목에 말씀 목록이 있음: **10점** (항목당 1회)\n· 진도표 항목에 의미 있는 설명이 있음 (20자 초과): **5점** (항목당 1회)',
      },
      {
        title: '❓ 자주 묻는 질문',
        body: '**점수로 순위를 매기게 되나요?** 결코 아닙니다. 팀원은 자신의 점수와 팀 전체의 이번 주 합계만 봅니다.\n\n**같은 말씀을 여러 팀에서 읽으면 점수를 더 받나요?** 아닙니다. 읽기는 개인의 일입니다 — 한 절은 평생 한 번만 3점으로 계산됩니다. 다만 나눔과 격려는 공동체의 행동이므로 팀마다 따로 계산됩니다.\n\n**팀을 떠나면 점수가 사라지나요?** 아닙니다. 점수는 개인 정원에 그대로 쌓이며 탈퇴해도 영향을 받지 않습니다.\n\n**누군가 쓴 글이 불편합니다 — 어떻게 하나요?** 관리자에게 이야기하세요 — 관리자는 어떤 팀원의 나눔이나 기도든 삭제할 수 있습니다.',
      },
    ],
    closeBtn: '닫기',
    detailLink: '전체 안내는 TEAMS.en.md 에 있습니다',
  },

  es: {
    title: 'Familia en la Nube · Guía',
    intro: 'La Palabra de Dios cada día y el saludo cálido de la familia — no es una competencia.',
    sections: [
      {
        title: '🌳 Principios de diseño',
        body: 'Cuatro líneas rojas que **nunca cruzamos**:\n\n· Sin clasificaciones — las listas se ordenan por la fecha en que cada uno entró, nunca por versículos completados ni por puntos\n· Sin señalar a nadie como "atrasado" — nunca verás "te faltan N versículos respecto a X"\n· Reconocimiento por hitos, no por diferencia de puntos — al completar aparece ✓, no una brecha\n· Los administradores son pastores, no árbitros — no pueden castigar a quien guarda silencio\n\nLos puntos existen **no para comparar**, sino para que veas tu propio crecimiento esta semana y el fruto que da toda la familia junta.',
      },
      {
        title: '🚀 Unirse o crear',
        body: '**Unirse a un equipo** de tres maneras:\n· Escanear el QR Code del administrador\n· Tocar un enlace compartido (verserain.com/?join=…)\n· Escribir el código de invitación a mano (XXX-XXXX)\n\n**Crear un equipo**: toca "+ Crear equipo", ponle nombre y una breve descripción — te conviertes en el primer administrador.\n\n· Una persona puede pertenecer a **20 equipos** al mismo tiempo\n· Una persona puede crear **5 equipos**\n· Un equipo admite como máximo **200 miembros y 8 administradores**\n· La misma persona puede tener papeles distintos en equipos distintos (administrador en el equipo A, miembro en el equipo B)',
      },
      {
        title: '📖 Las tres funciones',
        body: '**Plan de lectura** — el administrador prepara los elementos (título, lista de versículos, fecha objetivo, una palabra para el equipo). Los miembros tocan los botones de los versículos para marcarlos como completados ✓.\n\n**Reflexiones · Peticiones de oración** — debajo de cada elemento, cualquiera puede publicar:\n· Reflexión (etiqueta azul) — lo que recibiste, un testimonio\n· Oración (etiqueta morada) — aquello por lo que quieres que el equipo ore\nTodos los miembros las ven y pueden reaccionar con emoji (❤️ 🙏 ✨ 🌧️).\n\n**Ánimo (Cheer)** — envía un emoji o una nota corta (140 caracteres) a la tarjeta de un miembro. También puedes reaccionar con emoji a las reflexiones.',
      },
      {
        title: '🍎 Reglas de puntos',
        body: 'Los puntos se integran en tu huerto de frutos ya existente — **no hay una moneda aparte**.\n\n· Marcar un versículo como leído (la primera vez): **3 pts**\n· Escribir una reflexión / oración (la primera de cada elemento, cada día): **15 pts**\n· Tu reflexión recibe una reacción emoji (por cada persona distinta): **+2 pts**\n· Emoji rápido a un miembro: **1 pt** (tope diario 10)\n· Nota de ánimo a un miembro: **5 pts** (tope diario 5 notas)\n· Reaccionar con emoji a una reflexión: **2 pts** (tope diario 20 veces)\n· El administrador crea un equipo: **20 pts** (una sola vez)\n· El elemento del plan incluye lista de versículos: **10 pts** (una vez por elemento)\n· El elemento del plan tiene una descripción con sentido (más de 20 caracteres): **5 pts** (una vez por elemento)',
      },
      {
        title: '❓ Preguntas frecuentes',
        body: '**¿Alguna vez se clasificarán los puntos?** Nunca. Cada miembro solo ve sus propios puntos y el total semanal de todo el equipo.\n\n**¿Leer el mismo versículo en varios equipos da más puntos?** No. La lectura es algo personal — cada versículo da 3 pts una sola vez en la vida. Pero las reflexiones y los ánimos son actos de comunidad y se cuentan por separado en cada equipo.\n\n**Si dejo un equipo, ¿pierdo mis puntos?** No. Los puntos se acumulan en tu huerto personal y salir de un equipo no los afecta.\n\n**Algo que escribió un miembro me incomoda — ¿qué hago?** Habla con el administrador — los administradores pueden borrar la reflexión o la oración de cualquier miembro.',
      },
    ],
    closeBtn: 'Cerrar',
    detailLink: 'Guía completa en TEAMS.en.md',
  },

  tr: {
    title: 'Bulut Ailesi · Kılavuz',
    intro: 'Her gün Tanrı\'nın sözü ve ailenin sıcak selamı — bir yarışma değil.',
    sections: [
      {
        title: '🌳 Tasarım ilkeleri',
        body: '**Asla aşmadığımız** dört kırmızı çizgi:\n\n· Sıralama yok — listeler katılma sırasına göre dizilir, tamamlanan ayete ya da puana göre değil\n· "Geride kaldın" yok — "X\'ten N ayet gerisin" gibi bir şey asla görmezsiniz\n· Puan farkı değil, dönüm noktası geri bildirimi — tamamlanan ✓ olarak görünür, fark olarak değil\n· Yöneticiler çobandır, hakem değil — sessiz kalan üyeyi cezalandıramazlar\n\nPuanlar **karşılaştırma için değil**, bu haftaki kendi büyümenizi ve ailenin birlikte verdiği meyveyi görebilesiniz diye vardır.',
      },
      {
        title: '🚀 Katılmak veya kurmak',
        body: '**Bir takıma katılmanın** üç yolu:\n· Yöneticinin verdiği QR Code\'u taramak\n· Paylaşım bağlantısına dokunmak (verserain.com/?join=…)\n· Davet kodunu elle girmek (XXX-XXXX)\n\n**Takım kurmak**: "+ Takım kur"a dokunun, bir ad ve kısa bir açıklama yazın — ilk yönetici siz olursunuz.\n\n· Bir kişi aynı anda **20 takıma** katılabilir\n· Bir kişi **5 takım** kurabilir\n· Bir takımda en çok **200 üye, 8 yönetici** bulunur\n· Aynı kişi farklı takımlarda farklı roller üstlenebilir (A takımında yönetici, B takımında üye)',
      },
      {
        title: '📖 Üç temel özellik',
        body: '**Okuma programı** — yönetici maddeleri hazırlar (başlık, ayet listesi, hedef tarih, üyelere bir söz). Üyeler ayet düğmelerine dokunarak tamamlandı ✓ diye işaretler.\n\n**Paylaşımlar · Dua istekleri** — her maddenin altına herkes yazabilir:\n· Paylaşım (mavi etiket) — kişisel kavrayış, tanıklık\n· Dua (mor etiket) — takımın sizin için dua etmesini istediğiniz konu\nBütün üyeler görür ve emoji ile karşılık verebilir (❤️ 🙏 ✨ 🌧️).\n\n**Cesaret ver (Cheer)** — bir üyenin kartına emoji ya da kısa bir not (140 karakter) gönderin. Paylaşımlara da emoji ile karşılık verebilirsiniz.',
      },
      {
        title: '🍎 Puan kuralları',
        body: 'Puanlar hâlihazırdaki meyve bahçenize eklenir — **ayrı bir para birimi yoktur**.\n\n· Bir ayeti tamamlandı işaretlemek (ilk kez): **3 puan**\n· Paylaşım / dua yazmak (madde başına günün ilki): **15 puan**\n· Paylaşımınıza emoji karşılığı gelmesi (her farklı kişi için): **+2 puan**\n· Bir üyeye tek dokunuşla emoji: **1 puan** (günlük sınır 10)\n· Bir üyeye not yazmak: **5 puan** (günlük sınır 5 not)\n· Bir paylaşıma emoji ile karşılık vermek: **2 puan** (günlük sınır 20 kez)\n· Yöneticinin takım kurması: **20 puan** (bir defaya mahsus)\n· Program maddesinde ayet listesi olması: **10 puan** (madde başına bir kez)\n· Program maddesinde anlamlı bir açıklama olması (20 karakterden uzun): **5 puan** (madde başına bir kez)',
      },
      {
        title: '❓ Sık sorulan sorular',
        body: '**Puanlar hiç sıralanacak mı?** Asla. Üyeler yalnızca kendi puanlarını ve takımın bu haftaki ortak toplamını görür.\n\n**Aynı ayeti birkaç takımda okumak fazladan puan verir mi?** Hayır. Okumak kişisel bir iştir — her ayet ömür boyu yalnızca bir kez 3 puan kazandırır. Ama paylaşımlar ve cesaretlendirmeler topluluk eylemleridir; her takımda ayrı sayılır.\n\n**Bir takımdan ayrılırsam puanlarımı kaybeder miyim?** Hayır. Puanlar kişisel bahçenizde birikir, ayrılmak onları etkilemez.\n\n**Bir üyenin yazdığı şey beni rahatsız etti — ne yapmalıyım?** Yöneticiyle konuşun — yöneticiler herhangi bir üyenin paylaşımını ya da duasını silebilir.',
      },
    ],
    closeBtn: 'Kapat',
    detailLink: 'Tam kılavuz TEAMS.en.md dosyasında',
  },

  de: {
    title: 'Wolken-Familie · Anleitung',
    intro: 'Jeden Tag Gottes Wort und ein herzlicher Gruß von der Familie — kein Wettbewerb.',
    sections: [
      {
        title: '🌳 Gestaltungsprinzipien',
        body: 'Vier rote Linien, die wir **niemals überschreiten**:\n\n· Keine Rangliste — Listen sind nach Beitrittszeit sortiert, nie nach erledigten Versen oder Punkten\n· Kein "du hinkst hinterher" — du siehst nie "dir fehlen N Verse gegenüber X"\n· Rückmeldung an Meilensteinen statt Punktabstand — Erledigtes zeigt ✓, keine Differenz\n· Admins sind Hirten, keine Schiedsrichter — sie können stille Mitglieder nicht bestrafen\n\nPunkte gibt es **nicht zum Vergleichen**, sondern damit du dein eigenes Wachstum in dieser Woche und die gemeinsame Frucht der ganzen Familie sehen kannst.',
      },
      {
        title: '🚀 Beitreten oder gründen',
        body: 'Einem **Team beitreten** — auf drei Wegen:\n· Den QR Code des Admins scannen\n· Auf einen Einladungslink tippen (verserain.com/?join=…)\n· Den Einladungscode von Hand eingeben (XXX-XXXX)\n\n**Team gründen**: Tippe auf "+ Team erstellen", gib einen Namen und eine kurze Beschreibung ein — du wirst der erste Admin.\n\n· Eine Person kann gleichzeitig **20 Teams** beitreten\n· Eine Person kann **5 Teams** gründen\n· Ein Team fasst höchstens **200 Mitglieder und 8 Admins**\n· Dieselbe Person kann in verschiedenen Teams verschiedene Rollen haben (Admin in Team A, Mitglied in Team B)',
      },
      {
        title: '📖 Die drei Funktionen',
        body: '**Leseplan** — der Admin legt Einträge an (Titel, Versliste, Zieldatum, ein Wort an das Team). Mitglieder tippen auf die Vers-Schaltflächen und markieren sie als erledigt ✓.\n\n**Gedanken · Gebetsanliegen** — unter jedem Eintrag kann jede und jeder etwas posten:\n· Gedanke (blaue Markierung) — persönliche Erkenntnis, Zeugnis\n· Gebet (violette Markierung) — wofür das Team für dich beten soll\nAlle Mitglieder sehen es und können mit Emoji reagieren (❤️ 🙏 ✨ 🌧️).\n\n**Ermutigung (Cheer)** — sende ein Emoji oder eine kurze Nachricht (140 Zeichen) an die Karte eines Mitglieds. Auf Gedanken kannst du ebenso mit Emoji reagieren.',
      },
      {
        title: '🍎 Punkteregeln',
        body: 'Die Punkte fließen in deinen bestehenden Fruchtgarten — **keine eigene Währung**.\n\n· Einen Vers als gelesen markieren (beim ersten Mal): **3 Punkte**\n· Gedanke / Gebet schreiben (der erste je Eintrag und Tag): **15 Punkte**\n· Dein Gedanke bekommt eine Emoji-Reaktion (je einzelner Person): **+2 Punkte**\n· Schnelles Emoji für ein Mitglied: **1 Punkt** (Tageslimit 10)\n· Ermutigende Nachricht an ein Mitglied: **5 Punkte** (Tageslimit 5 Nachrichten)\n· Mit Emoji auf einen Gedanken reagieren: **2 Punkte** (Tageslimit 20 Mal)\n· Admin gründet ein Team: **20 Punkte** (einmalig)\n· Ein Planeintrag enthält eine Versliste: **10 Punkte** (einmalig je Eintrag)\n· Ein Planeintrag hat eine sinnvolle Beschreibung (über 20 Zeichen): **5 Punkte** (einmalig je Eintrag)',
      },
      {
        title: '❓ Häufige Fragen',
        body: '**Werden die Punkte je in eine Rangliste gebracht?** Niemals. Mitglieder sehen nur ihre eigenen Punkte und die gemeinsame Wochensumme des Teams.\n\n**Gibt es mehr Punkte, wenn ich denselben Vers in mehreren Teams lese?** Nein. Lesen ist eine persönliche Sache — jeder Vers zählt lebenslang nur einmal 3 Punkte. Gedanken und Ermutigungen sind dagegen gemeinschaftliche Handlungen und werden je Team getrennt gezählt.\n\n**Verliere ich meine Punkte, wenn ich ein Team verlasse?** Nein. Die Punkte sammeln sich in deinem persönlichen Garten und bleiben erhalten.\n\n**Etwas, das ein Mitglied geschrieben hat, stört mich — was nun?** Sprich mit dem Admin — Admins können den Gedanken oder das Gebet jedes Mitglieds löschen.',
      },
    ],
    closeBtn: 'Schließen',
    detailLink: 'Vollständige Anleitung in TEAMS.en.md',
  },

  my: {
    title: 'မိုးတိမ်မိသားစု · လမ်းညွှန်',
    intro: 'နေ့စဉ် ဘုရားသခင်၏ နှုတ်ကပတ်တော်နှင့် မိသားစု၏ နွေးထွေးသော နှုတ်ဆက်စကား — ပြိုင်ပွဲ မဟုတ်ပါ။',
    sections: [
      {
        title: '🌳 ဒီဇိုင်း အခြေခံမူများ',
        body: 'ကျွန်ုပ်တို့ **ဘယ်တော့မှ မကျော်လွန်သည့်** မျဉ်းနီ လေးခု ရှိပါသည်:\n\n· အဆင့်သတ်မှတ်ခြင်း မရှိပါ — စာရင်းများကို ဝင်ရောက်သည့် အချိန်အလိုက် စီထားပြီး ပြီးစီးမှု အရေအတွက် သို့မဟုတ် အမှတ်အလိုက် မစီပါ\n· "နောက်ကျနေသည်" ဟု မပြပါ — "သင်သည် X ထက် အခန်းငယ် N ခု နည်းနေသည်" ဟု ဘယ်တော့မှ မမြင်ရပါ\n· အမှတ်ကွာဟမှု မဟုတ်ဘဲ မှတ်တိုင်အလိုက် တုံ့ပြန်ချက် — ပြီးစီးလျှင် ✓ ပြသည်၊ ကွာဟချက် မပြပါ\n· စီမံခန့်ခွဲသူများသည် သိုးထိန်းများ ဖြစ်ကြပြီး ဒိုင်လူကြီး မဟုတ်ပါ — တိတ်ဆိတ်နေသူများကို အပြစ်ပေး၍ မရပါ\n\nအမှတ်များသည် **နှိုင်းယှဉ်ရန် မဟုတ်ဘဲ**၊ ဤအပတ်တွင် သင်၏ ကိုယ်ပိုင် ကြီးထွားမှုနှင့် မိသားစုတစ်ခုလုံး၏ စုပေါင်း အသီးအပွင့်ကို မြင်နိုင်စေရန် ဖြစ်သည်။',
      },
      {
        title: '🚀 ဝင်ရောက်ခြင်း သို့မဟုတ် ဖွဲ့စည်းခြင်း',
        body: '**အဖွဲ့တစ်ခုသို့ ဝင်ရောက်ရန်** နည်းလမ်း သုံးမျိုး:\n· စီမံခန့်ခွဲသူ၏ QR Code ကို စကင်ဖတ်ပါ\n· မျှဝေထားသော လင့်ခ်ကို နှိပ်ပါ (verserain.com/?join=…)\n· ဖိတ်ကြားကုဒ်ကို လက်ဖြင့် ရိုက်ထည့်ပါ (XXX-XXXX)\n\n**အဖွဲ့ဖွဲ့ရန်**: "+ အဖွဲ့ဖွဲ့မည်" ကို နှိပ်ပြီး နာမည်နှင့် အကျဉ်းချုပ် ဖော်ပြချက် ရေးပါ — သင်သည် ပထမဆုံး စီမံခန့်ခွဲသူ ဖြစ်လာမည်။\n\n· တစ်ဦးလျှင် တစ်ချိန်တည်းတွင် **အဖွဲ့ 20** ခုအထိ ဝင်နိုင်သည်\n· တစ်ဦးလျှင် **အဖွဲ့ 5** ခု ဖွဲ့နိုင်သည်\n· အဖွဲ့တစ်ခုတွင် အများဆုံး **အဖွဲ့ဝင် 200 ဦး၊ စီမံခန့်ခွဲသူ 8 ဦး**\n· တစ်ဦးတည်းသည် အဖွဲ့အလိုက် မတူညီသော အခန်းကဏ္ဍ ရှိနိုင်သည် (A အဖွဲ့တွင် စီမံခန့်ခွဲသူ၊ B အဖွဲ့တွင် အဖွဲ့ဝင်)',
      },
      {
        title: '📖 အဓိက လုပ်ဆောင်ချက် သုံးမျိုး',
        body: '**ကျမ်းဖတ် အစီအစဉ်** — စီမံခန့်ခွဲသူက အကြောင်းအရာများ ဖန်တီးသည် (ခေါင်းစဉ်၊ ကျမ်းချက် စာရင်း၊ ရည်မှန်းရက်၊ အဖွဲ့ဝင်များအတွက် စကားတစ်ခွန်း)။ အဖွဲ့ဝင်များက ကျမ်းချက် ခလုတ်ကို နှိပ်၍ ပြီးစီးကြောင်း ✓ မှတ်သားသည်။\n\n**ခံစားချက် · ဆုတောင်း** — အကြောင်းအရာ တစ်ခုစီ၏ အောက်တွင် မည်သူမဆို တင်နိုင်သည်:\n· ခံစားချက် (အပြာရောင် အမှတ်အသား) — ကိုယ်ပိုင် ခံယူချက်၊ သက်သေခံချက်\n· ဆုတောင်း (ခရမ်းရောင် အမှတ်အသား) — အဖွဲ့က သင့်အတွက် ဆုတောင်းပေးစေလိုသည့် အကြောင်းအရာ\nအဖွဲ့ဝင် အားလုံး မြင်နိုင်ပြီး emoji ဖြင့် တုံ့ပြန်နိုင်သည် (❤️ 🙏 ✨ 🌧️)။\n\n**အားပေးခြင်း (Cheer)** — အဖွဲ့ဝင်၏ ကတ်ပေါ်သို့ emoji သို့မဟုတ် စာတိုတစ်စောင် (140 လုံး) ပို့ပါ။ ခံစားချက်များကိုလည်း emoji ဖြင့် တုံ့ပြန်နိုင်သည်။',
      },
      {
        title: '🍎 အမှတ် စည်းမျဉ်းများ',
        body: 'အမှတ်များသည် သင့်တွင် ရှိပြီးသား သစ်သီးဥယျာဉ် (garden) ထဲသို့ ပေါင်းစည်းသွားသည် — **သီးခြား ငွေကြေး မရှိပါ**။\n\n· ကျမ်းချက်တစ်ခု ပြီးစီးကြောင်း မှတ်သားခြင်း (ပထမဆုံး အကြိမ်): **3 မှတ်**\n· ခံစားချက် / ဆုတောင်း ရေးခြင်း (အကြောင်းအရာ တစ်ခုလျှင် တစ်ရက်တွင် ပထမဆုံး တစ်စောင်): **15 မှတ်**\n· သင့်ခံစားချက်ကို emoji ဖြင့် တုံ့ပြန်ခံရခြင်း (တုံ့ပြန်သူ တစ်ဦးလျှင်): **+2 မှတ်**\n· အဖွဲ့ဝင်တစ်ဦးအား တစ်ချက်နှိပ် emoji: **1 မှတ်** (တစ်ရက် အများဆုံး 10)\n· အဖွဲ့ဝင်တစ်ဦးအား စာတိုဖြင့် အားပေးခြင်း: **5 မှတ်** (တစ်ရက် အများဆုံး 5 စောင်)\n· ခံစားချက်တစ်ခုကို emoji ဖြင့် တုံ့ပြန်ခြင်း: **2 မှတ်** (တစ်ရက် အများဆုံး 20 ကြိမ်)\n· စီမံခန့်ခွဲသူက အဖွဲ့ ဖွဲ့စည်းခြင်း: **20 မှတ်** (တစ်ကြိမ်သာ)\n· အစီအစဉ် အကြောင်းအရာတွင် ကျမ်းချက် စာရင်း ပါဝင်ခြင်း: **10 မှတ်** (အကြောင်းအရာ တစ်ခုလျှင် တစ်ကြိမ်)\n· အစီအစဉ် အကြောင်းအရာတွင် အဓိပ္ပာယ်ရှိသော ဖော်ပြချက် ပါဝင်ခြင်း (စာလုံး 20 ကျော်): **5 မှတ်** (အကြောင်းအရာ တစ်ခုလျှင် တစ်ကြိမ်)',
      },
      {
        title: '❓ အမေးများသော မေးခွန်းများ',
        body: '**အမှတ်များကို အဆင့်သတ်မှတ်မည်လား?** ဘယ်တော့မှ မလုပ်ပါ။ အဖွဲ့ဝင်များသည် မိမိ၏ အမှတ်နှင့် အဖွဲ့တစ်ခုလုံး၏ ဤအပတ် စုစုပေါင်းကိုသာ မြင်ရသည်။\n\n**ကျမ်းချက် တစ်ခုတည်းကို အဖွဲ့များစွာတွင် ဖတ်လျှင် အမှတ် ပိုရမလား?** မရပါ။ ကျမ်းဖတ်ခြင်းသည် ကိုယ်ပိုင် ကိစ္စဖြစ်သည် — ကျမ်းချက်တစ်ခုလျှင် တစ်သက်တာတွင် တစ်ကြိမ်သာ 3 မှတ် ရသည်။ သို့သော် ခံစားချက်နှင့် အားပေးမှုများသည် အသိုင်းအဝိုင်း၏ လုပ်ဆောင်ချက်များ ဖြစ်သဖြင့် အဖွဲ့အလိုက် သီးခြား တွက်ချက်သည်။\n\n**အဖွဲ့မှ ထွက်လျှင် အမှတ်များ ဆုံးရှုံးမလား?** မဆုံးရှုံးပါ။ အမှတ်များသည် သင့်ကိုယ်ပိုင် ဥယျာဉ်ထဲတွင် စုဆောင်းနေပြီး ထွက်ခွာမှုက မထိခိုက်ပါ။\n\n**အဖွဲ့ဝင်တစ်ဦး ရေးထားသည့် အရာက စိတ်မသက်မသာ ဖြစ်စေသည် — ဘာလုပ်ရမလဲ?** စီမံခန့်ခွဲသူနှင့် ပြောပါ — စီမံခန့်ခွဲသူသည် မည်သည့် အဖွဲ့ဝင်၏ ခံစားချက် သို့မဟုတ် ဆုတောင်းကိုမဆို ဖျက်နိုင်သည်။',
      },
    ],
    closeBtn: 'ပိတ်မည်',
    detailLink: 'အပြည့်အစုံ လမ်းညွှန်ကို TEAMS.en.md တွင် ကြည့်ပါ',
  },

  vi: {
    title: 'Gia Đình Trên Mây · Hướng dẫn',
    intro: 'Mỗi ngày có Lời Chúa và lời hỏi thăm ấm áp của người nhà — không phải một cuộc thi.',
    sections: [
      {
        title: '🌳 Nguyên tắc thiết kế',
        body: 'Bốn lằn ranh chúng tôi **không bao giờ vượt qua**:\n\n· Không xếp hạng — danh sách sắp theo thứ tự tham gia, không theo số câu đã đọc hay điểm số\n· Không nói ai "đang tụt lại" — bạn sẽ không bao giờ thấy "bạn đọc ít hơn X N câu"\n· Phản hồi theo cột mốc, không theo khoảng cách điểm — hoàn thành thì hiện ✓, không hiện chênh lệch\n· Quản trị viên là người chăn bầy, không phải trọng tài — họ không thể phạt người đang im lặng\n\nĐiểm số **không phải để so sánh**, mà để bạn thấy sự lớn lên của chính mình trong tuần này và bông trái chung của cả nhà.',
      },
      {
        title: '🚀 Tham gia hoặc lập nhóm',
        body: '**Tham gia một nhóm** bằng ba cách:\n· Quét QR Code của quản trị viên\n· Nhấn vào liên kết chia sẻ (verserain.com/?join=…)\n· Nhập mã mời thủ công (XXX-XXXX)\n\n**Lập nhóm**: nhấn "+ Tạo nhóm", đặt tên và viết mô tả ngắn — bạn trở thành quản trị viên đầu tiên.\n\n· Một người có thể tham gia **20 nhóm** cùng lúc\n· Một người có thể tạo **5 nhóm**\n· Mỗi nhóm nhận tối đa **200 thành viên, 8 quản trị viên**\n· Cùng một người có thể giữ vai trò khác nhau ở các nhóm khác nhau (quản trị viên ở nhóm A, thành viên ở nhóm B)',
      },
      {
        title: '📖 Ba tính năng chính',
        body: '**Lịch đọc Kinh Thánh** — quản trị viên soạn các mục (tiêu đề, danh sách câu Kinh Thánh, ngày mục tiêu, đôi lời gửi nhóm). Thành viên nhấn nút câu Kinh Thánh để đánh dấu hoàn thành ✓.\n\n**Cảm nhận · Cầu nguyện** — dưới mỗi mục, ai cũng có thể đăng:\n· Cảm nhận (nhãn xanh) — điều nhận được, lời chứng\n· Cầu nguyện (nhãn tím) — điều bạn xin nhóm cầu thay\nMọi thành viên đều thấy và có thể bày tỏ bằng emoji (❤️ 🙏 ✨ 🌧️).\n\n**Khích lệ (Cheer)** — gửi emoji hoặc một lời nhắn ngắn (140 ký tự) tới thẻ của một thành viên. Bạn cũng có thể thả emoji cho các cảm nhận.',
      },
      {
        title: '🍎 Quy tắc điểm',
        body: 'Điểm được cộng vào vườn trái cây sẵn có của bạn — **không có loại tiền riêng**.\n\n· Đánh dấu một câu Kinh Thánh đã đọc (lần đầu): **3 điểm**\n· Viết cảm nhận / cầu nguyện (bài đầu tiên mỗi mục mỗi ngày): **15 điểm**\n· Cảm nhận của bạn nhận được emoji (mỗi người thả khác nhau): **+2 điểm**\n· Thả emoji nhanh cho một thành viên: **1 điểm** (tối đa 10 lần mỗi ngày)\n· Gửi lời nhắn khích lệ cho một thành viên: **5 điểm** (tối đa 5 lời nhắn mỗi ngày)\n· Thả emoji cho một cảm nhận: **2 điểm** (tối đa 20 lần mỗi ngày)\n· Quản trị viên tạo nhóm: **20 điểm** (một lần duy nhất)\n· Mục trong lịch có danh sách câu Kinh Thánh: **10 điểm** (một lần cho mỗi mục)\n· Mục trong lịch có mô tả có ý nghĩa (hơn 20 ký tự): **5 điểm** (một lần cho mỗi mục)',
      },
      {
        title: '❓ Câu hỏi thường gặp',
        body: '**Điểm có bao giờ được xếp hạng không?** Không bao giờ. Thành viên chỉ thấy điểm của chính mình và tổng điểm chung của cả nhóm trong tuần.\n\n**Đọc cùng một câu ở nhiều nhóm có được nhiều điểm hơn không?** Không. Việc đọc là chuyện cá nhân — mỗi câu Kinh Thánh chỉ tính 3 điểm một lần trong đời. Nhưng cảm nhận và khích lệ là hành động cộng đồng, nên được tính riêng theo từng nhóm.\n\n**Nếu rời nhóm, tôi có mất điểm không?** Không. Điểm tích lũy trong vườn cá nhân của bạn, rời nhóm không ảnh hưởng.\n\n**Một thành viên viết điều khiến tôi khó chịu — tôi nên làm gì?** Hãy nói với quản trị viên — quản trị viên có thể xóa cảm nhận hoặc lời cầu nguyện của bất kỳ thành viên nào.',
      },
    ],
    closeBtn: 'Đóng',
    detailLink: 'Hướng dẫn đầy đủ trong TEAMS.en.md',
  },

  id: {
    title: 'Keluarga Awan · Panduan',
    intro: 'Firman Tuhan setiap hari, dan sapaan hangat dari keluarga — bukan perlombaan.',
    sections: [
      {
        title: '🌳 Prinsip perancangan',
        body: 'Empat garis merah yang **tidak pernah kami lewati**:\n\n· Tanpa peringkat — daftar diurutkan menurut waktu bergabung, bukan menurut jumlah ayat atau poin\n· Tanpa label "tertinggal" — Anda tidak akan pernah melihat "Anda kurang N ayat dari X"\n· Umpan balik berupa tonggak, bukan selisih poin — yang selesai ditandai ✓, bukan selisih angka\n· Admin adalah gembala, bukan wasit — mereka tidak boleh menghukum anggota yang diam\n\nPoin ada **bukan untuk membandingkan**, melainkan agar Anda melihat pertumbuhan Anda sendiri minggu ini dan buah yang dihasilkan seluruh keluarga bersama-sama.',
      },
      {
        title: '🚀 Bergabung atau membuat',
        body: '**Bergabung dengan tim** lewat tiga cara:\n· Memindai QR Code dari admin\n· Menekan tautan berbagi (verserain.com/?join=…)\n· Memasukkan kode undangan secara manual (XXX-XXXX)\n\n**Membuat tim**: tekan "+ Buat tim", beri nama dan deskripsi singkat — Anda menjadi admin pertama.\n\n· Satu orang dapat bergabung dengan **20 tim** sekaligus\n· Satu orang dapat membuat **5 tim**\n· Satu tim menampung paling banyak **200 anggota dan 8 admin**\n· Orang yang sama bisa berperan berbeda di tim berbeda (admin di tim A, anggota di tim B)',
      },
      {
        title: '📖 Tiga fitur utama',
        body: '**Jadwal pembacaan** — admin menyusun butir-butir (judul, daftar ayat, tanggal sasaran, sepatah kata untuk anggota). Anggota menekan tombol ayat untuk menandainya selesai ✓.\n\n**Renungan · Doa** — di bawah setiap butir, siapa pun boleh menulis:\n· Renungan (label biru) — pemahaman pribadi, kesaksian\n· Doa (label ungu) — hal yang Anda minta didoakan tim\nSemua anggota melihatnya dan dapat memberi reaksi emoji (❤️ 🙏 ✨ 🌧️).\n\n**Penyemangat (Cheer)** — kirim emoji atau pesan singkat (140 karakter) ke kartu seorang anggota. Renungan pun bisa diberi reaksi emoji.',
      },
      {
        title: '🍎 Aturan poin',
        body: 'Poin menyatu ke kebun buah Anda yang sudah ada — **tidak ada mata uang terpisah**.\n\n· Menandai satu ayat selesai (pertama kali): **3 poin**\n· Menulis renungan / doa (yang pertama per butir per hari): **15 poin**\n· Renungan Anda menerima reaksi emoji (per orang yang berbeda): **+2 poin**\n· Emoji sekali tekan untuk seorang anggota: **1 poin** (batas harian 10)\n· Pesan penyemangat untuk seorang anggota: **5 poin** (batas harian 5 pesan)\n· Memberi reaksi emoji pada renungan: **2 poin** (batas harian 20 kali)\n· Admin membuat tim: **20 poin** (sekali saja)\n· Butir jadwal memuat daftar ayat: **10 poin** (sekali per butir)\n· Butir jadwal memiliki deskripsi yang bermakna (lebih dari 20 karakter): **5 poin** (sekali per butir)',
      },
      {
        title: '❓ Pertanyaan umum',
        body: '**Apakah poin akan pernah diperingkat?** Tidak pernah. Anggota hanya melihat poinnya sendiri dan total mingguan seluruh tim.\n\n**Membaca ayat yang sama di beberapa tim, apakah poinnya berlipat?** Tidak. Membaca adalah perkara pribadi — setiap ayat bernilai 3 poin sekali seumur hidup. Namun renungan dan penyemangat adalah tindakan komunitas, jadi dihitung terpisah di tiap tim.\n\n**Kalau saya keluar dari tim, apakah poin saya hilang?** Tidak. Poin terkumpul di kebun pribadi Anda dan keluar dari tim tidak memengaruhinya.\n\n**Ada tulisan anggota yang membuat saya tidak nyaman — bagaimana?** Bicaralah dengan admin — admin dapat menghapus renungan atau doa anggota mana pun.',
      },
    ],
    closeBtn: 'Tutup',
    detailLink: 'Panduan lengkap ada di TEAMS.en.md',
  },

  ms: {
    title: 'Keluarga Awan · Panduan',
    intro: 'Firman Tuhan setiap hari, dan sapaan mesra daripada keluarga — bukan pertandingan.',
    sections: [
      {
        title: '🌳 Prinsip reka bentuk',
        body: 'Empat garisan merah yang **tidak akan kami lintasi**:\n\n· Tiada kedudukan — senarai disusun mengikut masa menyertai, bukan mengikut jumlah ayat atau mata\n· Tiada label "ketinggalan" — anda tidak akan melihat "anda kurang N ayat berbanding X"\n· Maklum balas mengikut pencapaian, bukan jurang mata — yang selesai ditanda ✓, bukan beza angka\n· Pentadbir ialah gembala, bukan pengadil — mereka tidak boleh menghukum ahli yang berdiam diri\n\nMata wujud **bukan untuk membanding-banding**, tetapi supaya anda nampak pertumbuhan anda sendiri minggu ini dan buah yang dihasilkan seluruh keluarga bersama-sama.',
      },
      {
        title: '🚀 Menyertai atau menubuhkan',
        body: '**Menyertai pasukan** melalui tiga cara:\n· Imbas QR Code daripada pentadbir\n· Ketik pautan kongsi (verserain.com/?join=…)\n· Masukkan kod jemputan secara manual (XXX-XXXX)\n\n**Menubuhkan pasukan**: ketik "+ Tubuhkan pasukan", beri nama dan penerangan ringkas — anda menjadi pentadbir pertama.\n\n· Seorang boleh menyertai **20 pasukan** serentak\n· Seorang boleh menubuhkan **5 pasukan**\n· Satu pasukan memuatkan paling ramai **200 ahli dan 8 pentadbir**\n· Orang yang sama boleh memegang peranan berbeza dalam pasukan berbeza (pentadbir dalam pasukan A, ahli dalam pasukan B)',
      },
      {
        title: '📖 Tiga fungsi utama',
        body: '**Jadual bacaan** — pentadbir menyediakan item (tajuk, senarai ayat, tarikh sasaran, sepatah kata untuk ahli). Ahli mengetik butang ayat untuk menandakannya selesai ✓.\n\n**Renungan · Doa** — di bawah setiap item, sesiapa sahaja boleh menulis:\n· Renungan (label biru) — pengertian peribadi, kesaksian\n· Doa (label ungu) — perkara yang anda mahu pasukan doakan untuk anda\nSemua ahli dapat melihatnya dan boleh bertindak balas dengan emoji (❤️ 🙏 ✨ 🌧️).\n\n**Sokongan (Cheer)** — hantar emoji atau nota pendek (140 aksara) ke kad seorang ahli. Renungan juga boleh dibalas dengan emoji.',
      },
      {
        title: '🍎 Peraturan mata',
        body: 'Mata disepadukan ke dalam kebun buah anda yang sedia ada — **tiada mata wang berasingan**.\n\n· Menanda satu ayat selesai (kali pertama): **3 mata**\n· Menulis renungan / doa (yang pertama bagi setiap item setiap hari): **15 mata**\n· Renungan anda menerima reaksi emoji (bagi setiap orang berlainan): **+2 mata**\n· Emoji satu ketikan kepada seorang ahli: **1 mata** (had harian 10)\n· Nota sokongan kepada seorang ahli: **5 mata** (had harian 5 nota)\n· Bertindak balas dengan emoji pada renungan: **2 mata** (had harian 20 kali)\n· Pentadbir menubuhkan pasukan: **20 mata** (sekali sahaja)\n· Item jadual mempunyai senarai ayat: **10 mata** (sekali bagi setiap item)\n· Item jadual mempunyai penerangan yang bermakna (lebih 20 aksara): **5 mata** (sekali bagi setiap item)',
      },
      {
        title: '❓ Soalan lazim',
        body: '**Adakah mata akan disusun mengikut kedudukan?** Tidak sekali-kali. Ahli hanya melihat mata sendiri dan jumlah mingguan pasukan secara kolektif.\n\n**Membaca ayat yang sama dalam beberapa pasukan, dapat mata lebih?** Tidak. Membaca ialah hal peribadi — setiap ayat bernilai 3 mata sekali seumur hidup. Tetapi renungan dan sokongan ialah tindakan komuniti, jadi dikira berasingan bagi setiap pasukan.\n\n**Jika saya keluar daripada pasukan, adakah mata saya hilang?** Tidak. Mata terkumpul dalam kebun peribadi anda dan tidak terjejas.\n\n**Ada tulisan ahli yang membuat saya tidak selesa — apa patut saya buat?** Berbincang dengan pentadbir — pentadbir boleh memadam renungan atau doa mana-mana ahli.',
      },
    ],
    closeBtn: 'Tutup',
    detailLink: 'Panduan penuh dalam TEAMS.en.md',
  },
};

// Every UI language we ship a help pack for.
const HELP_LANGS = [
  'zh', 'cuvs', 'en',
  'he', 'fa', 'ar', 'ja', 'ko', 'es', 'tr', 'de', 'my', 'vi', 'id', 'ms',
];

// Map any uiLang code to one of our content packs.
// Every supported UI language now has its own pack; anything unknown
// (or missing) falls back to English.
export function resolveHelpLang(uiLang) {
  if (HELP_LANGS.includes(uiLang) && HELP_CONTENT[uiLang]) return uiLang;
  return 'en';
}
