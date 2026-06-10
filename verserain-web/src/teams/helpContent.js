// In-app help content for the Companion Teams feature.
// Three languages: zh (Traditional Chinese), cuvs (Simplified Chinese), en.
// Other UI languages fall back to English at the modal level.
//
// Each language uses identical section keys so the modal can render
// without per-language branching. Sections are kept short — the full
// guide lives in TEAMS.md / TEAMS.en.md / TEAMS.zh-cn.md.

export const HELP_CONTENT = {
  zh: {
    title: '我的團隊 · 使用說明',
    intro: '一起讀經,彼此陪伴 — 不是比賽。',
    sections: [
      {
        title: '🌳 設計原則',
        body: '我的團隊有四條紅線,**永遠不會改變**:\n\n· 不排名 — 列表按加入順序,不按完成數或點數\n· 不顯示落後 — 不秀「比某人少幾節」\n· 里程碑式回饋 — 完成顯示 ✓,不秀分數差距\n· 管理員是牧者,不是裁判 — 不能罰沉默的人\n\n點數**不是用來比較**,而是讓你看見:你這週的成長,以及全團一起的果子。',
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
    title: '我的团队 · 使用说明',
    intro: '一起读经,彼此陪伴 — 不是比赛。',
    sections: [
      {
        title: '🌳 设计原则',
        body: '我的团队有四条红线,**永远不会改变**:\n\n· 不排名 — 列表按加入顺序,不按完成数或点数\n· 不显示落后 — 不秀「比某人少几节」\n· 里程碑式回馈 — 完成显示 ✓,不秀分数差距\n· 管理员是牧者,不是裁判 — 不能罚沉默的人\n\n点数**不是用来比较**,而是让你看见:你这周的成长,以及全团一起的果子。',
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
    title: 'My Teams · Guide',
    intro: 'Read the Bible together, walk alongside each other — not a competition.',
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
};

// Map any uiLang code to one of our three content packs.
export function resolveHelpLang(uiLang) {
  if (uiLang === 'zh') return 'zh';
  if (uiLang === 'cuvs') return 'cuvs';
  // All other languages — including fa, ar, he, ja, ko, es, tr, de, my, vi, id, ms —
  // fall back to English. Future PRs can add packs as needed.
  return 'en';
}
