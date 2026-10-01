// The 'sponsor' page — moved out of App.jsx unchanged (UI/UX 第 4 階段).
import { Gift } from 'lucide-react';
import { SHOW_DONATE } from '../lib/routes.js';
import { SHOW_CHARITY } from '../../api/_lib/features.js';

export default function SponsorPage({ t, setMainTab }) {
  const card = { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '1rem 1.2rem', marginBottom: '1rem' };
  const h3 = { margin: '0 0 0.6rem', color: '#1e293b', fontSize: '1.05rem' };
  const step = (n, title, body) => (
    <div key={n} style={{ display: 'flex', gap: '0.8rem', alignItems: 'flex-start' }}>
      <div style={{ flexShrink: 0, width: 28, height: 28, borderRadius: '50%', background: '#7c3aed', color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: '0.9rem' }}>{n}</div>
      <div><b style={{ color: '#1e293b' }}>{title}</b><div style={{ color: '#475569', fontSize: '0.9rem', lineHeight: 1.6 }}>{body}</div></div>
    </div>
  );
  return (
    <div style={{ backgroundColor: '#fbf8ff', borderRadius: '8px', border: '1px solid #ddd6fe', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.6rem', marginBottom: '0.8rem' }}>
        <h2 style={{ color: '#1e293b', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Gift size={26} /> {t('贊助經文雨', 'Sponsor VerseRain')}</h2>
        <button type="button" onClick={() => setMainTab('advanced')} style={{ background: 'transparent', border: '1px solid #cbd5e1', color: '#64748b', borderRadius: '6px', padding: '0.35rem 0.8rem', cursor: 'pointer', fontSize: '0.85rem' }}>← {t('返回', 'Back')}</button>
      </div>
      {!SHOW_CHARITY && (
        <p data-testid="sponsor-shops-intro" style={{ color: '#475569', lineHeight: 1.7, marginTop: 0 }}>
          {t('一起推廣讀經與背經：玩家讀經累積點數，到合作商家折抵小額消費；折扣由商家自行提供並吸收，經文雨不經手任何款項。', 'Help spread Bible reading and memorisation: players earn points by reading and use them for a small discount at partner shops. The shop offers and absorbs the discount; VerseRain never handles money.')}
        </p>
      )}
      {/* 合作勸募（愛心方案）— paused with 愛心行動 (SHOW_CHARITY). */}
      {SHOW_CHARITY && (<>
        <p style={{ color: '#475569', lineHeight: 1.7, marginTop: 0 }}>
          {t('一起推廣讀經與背經。你的捐款不再變成玩家的禮券，而是交給合法的合作勸募團體，依它原定的計畫用在公益方案上（例如長者聚餐），不必等任何讀經條件；大家讀經累積點數、一起達到門檻時，再由合作企業另外加碼。', 'Help spread Bible reading and memorisation. Your gift no longer becomes vouchers for players: it goes to a licensed partner charity and is used for its planned project (such as a meal for the elderly) without waiting on any reading goal. When everyone’s reading points reach a shared target, a partner business adds an extra gift.')}
        </p>
        <div data-testid="partner-talks-notice" style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 10, padding: '0.7rem 1rem', marginBottom: '1rem', color: '#7c2d12', fontSize: '0.88rem', lineHeight: 1.7 }}>
          {t('新方案正在與合法勸募團體洽談合作，第一批方案確定後會公布在「愛心行動」頁。原本「通過經文換禮券」的獎勵已經停止。', 'We are in talks with licensed charities; the first projects will be announced on the Love in Action project page. The old “pass verses for a voucher” rewards have ended.')}
        </div>

        <div style={card}>
          <h3 style={h3}>🔁 {t('怎麼運作', 'How it works')}</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
            {step(1, t('合作機構選出既有公益方案', 'The partner charity picks one of its existing projects'), t('由合法的合作勸募團體，從它已經審核、正在執行的方案中選出一個（例如社區長者共餐），經它確認後才會出現在經文雨上。', 'A licensed partner charity chooses a project it has already approved and is running (for example community meals for the elderly); it appears in VerseRain only after the charity confirms.'))}
            {step(2, t('企業或個人捐款，依原計畫使用', 'Gifts are used as planned'), t('捐款直接交給合作勸募團體，由它開立收據，並依原定計畫與期程使用，不等待任何讀經條件；可以具名或匿名。經文雨不收款。', 'Gifts go straight to the partner charity, which issues the receipt and uses them on its original plan and schedule, without waiting on any reading goal; givers may be named or anonymous. VerseRain collects no money.'))}
            {step(3, t('大家讀經投點，達到門檻', 'Everyone reads and puts in points'), t('玩家把讀經得到的點數投入活動；公益投點另外記錄，不換算成金額。玩家自己不會拿到任何金錢或禮品。', 'Players put the points they earn from reading into the campaign; these are recorded separately and never converted into money. Players receive no money or gifts themselves.'))}
            {step(4, t('企業加碼，經機構確認後公布', 'A business adds a gift, published once the charity confirms'), t('達標後，合作企業依書面約定把加碼款交給合作勸募團體，用於同一方案；機構確認收款與撥款後，App 才公布結果。', 'When the target is reached, the partner business gives its extra gift to the charity for the same project under a written agreement; the app shows the result only after the charity confirms receipt and payout.'))}
          </div>
        </div>

        <div style={card}>
          <h3 style={h3}>🌱 {t('為什麼這樣設計', 'Why this design')}</h3>
          <ul style={{ margin: 0, paddingLeft: '1.2rem', color: '#475569', fontSize: '0.9rem', lineHeight: 1.8 }}>
            <li>{t('玩家的點數不再只是為自己累積折扣，而是真正拿來做有意義的事。', 'Players’ points stop being just discounts for themselves and go toward something meaningful.')}</li>
            <li>{t('不只企業家做好事，每一位讀經的人都一起貢獻；企業的捐款也間接鼓勵大家讀聖經。', 'It is not only business owners doing good — everyone who reads contributes, and the businesses’ gifts in turn encourage people to read the Bible.')}</li>
            <li>{t('經文雨不收款、不代收代付、不儲值、不兌現；勸募、收據與撥款都由合法的勸募團體負責。', 'VerseRain collects no money, pays nothing out on anyone’s behalf, holds no stored value and redeems nothing for cash; fundraising, receipts and payouts are handled by a licensed charity.')}</li>
          </ul>
        </div>

        <div style={card}>
          <h3 style={h3}>🤝 {t('受助對象與方案', 'Who is helped, and which projects')}</h3>
          <div style={{ color: '#475569', fontSize: '0.9rem', lineHeight: 1.7 }}>
            {t('由合作勸募團體依它的審核程序決定；受助資格與信仰、讀經或是否使用 App 無關。教會或機構有需要，請直接向合作勸募團體申請。', 'The partner charity decides through its own review; eligibility has nothing to do with faith, Bible reading or using the app. Churches or organisations in need should apply to the partner charity directly.')}
          </div>
        </div>

      </>)}

      <div style={card}>
        <h3 style={h3}>🏪 {t('商家贊助：以折扣回饋背經點數', 'Shop sponsorship: a discount for verse points')}</h3>
        <div style={{ color: '#475569', fontSize: '0.9rem', lineHeight: 1.7 }}>
          <div>1️⃣ {t('商家登記名稱、地址、5–20% 的折扣與照片，經審核後出現在「誰在玩」地圖上。', 'A shop registers its name, address, a 5–20% discount and a photo; after review it appears on the map.')}</div>
          <div>2️⃣ {t('玩家在地圖上點商家，用背經點數產生一次性折扣券（每 1,000 點折抵 NT$1；點數無現金價值，只能在合作商家折抵）。', 'Players tap the shop on the map and turn verse points into a one-time discount coupon (every 1,000 points takes NT$1 off; points have no cash value and only work at partner shops).')}</div>
          <div>3️⃣ {t('結帳時出示折扣券，店家在核銷頁確認；折扣由商家吸收，這就是商家的贊助。', 'The customer shows the coupon at checkout and the shop confirms it on the verify page; the shop absorbs the discount — that is its sponsorship.')}</div>
          {SHOW_CHARITY && <div>4️⃣ {t('商家也可以參與教會／機構的「愛心行動」，接受機構用玩家投入的額度折抵採購，上限由商家自訂。', 'Shops can also join a church or organisation’s Love in Action project and accept its allowance (contributed by players) against purchases, within caps the shop sets.')}</div>}
          <div style={{ color: '#64748b', fontSize: '0.82rem', marginTop: 4 }}>{t('每張券上限 NT$200、每人每月 NT$500、同一商家每天一張、30 分鐘內有效；商家可設每日折抵上限。', 'Caps: NT$200 per voucher, NT$500 per person per month, one per shop per day, valid 30 minutes; shops can set a daily cap.')}</div>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.7rem' }}>
          <button type="button" onClick={() => setMainTab('merchant')} style={{ background: '#d97706', color: '#fff', border: 'none', borderRadius: 6, padding: '0.35rem 0.9rem', cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem' }}>🏪 {t('登記商家／教會', 'Register a shop / church')}</button>
          <button type="button" onClick={() => setMainTab('verify')} style={{ background: 'transparent', color: '#0d9488', border: '1px solid #99f6e4', borderRadius: 6, padding: '0.35rem 0.9rem', cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem' }}>🎟️ {t('店家核銷頁', 'Shop verify page')}</button>
        </div>
      </div>

      {SHOW_CHARITY && (
        <div style={card}>
          <h3 style={h3}>🔍 {t('透明與隱私', 'Transparency & privacy')}</h3>
          <ul style={{ margin: 0, paddingLeft: '1.2rem', color: '#475569', fontSize: '0.9rem', lineHeight: 1.8 }}>
            <li>{t('點數進度隨時公開；達標結果與撥款狀態，經合作勸募團體確認後才公布。', 'Points progress is always public; whether the target was met and funds were paid out is shown only after the partner charity confirms it.')}</li>
            <li>{t('對機構與企業只提供彙總統計，不提供個人的讀經紀錄或所屬教會。', 'Charities and businesses get aggregate statistics only — never anyone’s reading record or church.')}</li>
            <li>{t('捐款人的收據資料由合作勸募團體保管，經文雨不保存。', 'Donors’ receipt details stay with the partner charity; VerseRain does not keep them.')}</li>
          </ul>
        </div>
      )}

      <div style={{ padding: '0.9rem 1rem', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, color: '#166534', fontSize: '0.9rem', lineHeight: 1.7 }}>
        <b>{t('想加入？', 'Want to join?')}</b>{' '}
        {SHOW_CHARITY
          ? t('企業願意提供捐款或加碼，歡迎寫信給我們，我們會協助聯繫合作勸募團體；有需要的教會或機構，請直接向合作勸募團體申請。', 'Businesses willing to give or offer a matching gift are welcome to email us and we will put you in touch with a partner charity; churches or organisations in need should apply to the partner charity directly.')
          : t('想讓你的商家加入，請按上方「登記商家／教會」；有任何問題，歡迎寫信給我們。', 'To bring your shop on board, tap “Register a shop / church” above; questions are welcome by email.')}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.6rem' }}>
          <a href={`mailto:hungry4grace@gmail.com?subject=${encodeURIComponent(SHOW_CHARITY ? '經文雨 愛心方案贊助（VerseRain Charity Projects）' : '經文雨 商家合作（VerseRain Partner Shops）')}`} style={{ background: '#166534', color: '#fff', borderRadius: 6, padding: '0.35rem 0.9rem', fontWeight: 700, textDecoration: 'none', fontSize: '0.85rem' }}>{t('聯絡我們', 'Contact us')} →</a>
          {SHOW_CHARITY && <button type="button" onClick={() => setMainTab('charity')} style={{ background: 'transparent', color: '#166534', border: '1px solid #86efac', borderRadius: 6, padding: '0.35rem 0.9rem', cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem' }}>{t('看看有哪些愛心行動', 'See the Love in Action projects')}</button>}
          <button type="button" onClick={() => setMainTab('sponsors')} style={{ background: 'transparent', color: '#166534', border: '1px solid #86efac', borderRadius: 6, padding: '0.35rem 0.9rem', cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem' }}>{t('感謝贊助者', 'Thank you, sponsors')}</button>
        </div>
        {SHOW_DONATE && <div style={{ color: '#64748b', fontSize: '0.82rem', marginTop: '0.6rem' }}>
          {t('個人小額支持 App 開發，請到', 'For small personal gifts toward development, see')}{' '}
          <button type="button" onClick={() => setMainTab('donate')} style={{ background: 'transparent', border: 'none', color: '#3b82f6', cursor: 'pointer', fontWeight: 700, padding: 0, fontSize: '0.82rem' }}>{t('支持經文雨', 'Support VerseRain')} →</button>
        </div>}
      </div>
    </div>
  );
}
