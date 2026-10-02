// The 我的 (advanced / me) tab — moved out of App.jsx unchanged (UI/UX 第 4 階段).
import { Button, ListGroup, ListRow } from '../ui';
import { CloudRain, Crown, Gift, Heart, Info, Languages, Library, Mail, MessageCircle, Settings, Store, Ticket, TreePine, UserRound, Users } from 'lucide-react';
import { SHOW_DONATE } from '../lib/routes.js';
import { SHOW_CHARITY } from '../../api/_lib/features.js';

export default function AdvancedPage({ t, combinedInbox, isPremium, isSuperAdmin, menuScrollRef, playerName, pushStatus, scrollMenuTo, setMainTab, setShowEncouragePanel, setShowLoginModal, setShowPushModal, userEmail }) {
  const go = (id) => { setMainTab(id); const el = menuScrollRef.current; if (el) el.scrollTop = 0; };
  const unread = combinedInbox.unread;
  const row = (key, Icon, color, title, desc, onClick, badge = null) => (
    <ListRow key={key} testId={`me-${key}`} icon={<Icon size={24} />} iconColor={color} title={title} desc={desc} onClick={onClick} badge={badge} />
  );
  return (
    <div data-testid="me-page" style={{ maxWidth: 640, margin: '0 auto', padding: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-5)', color: 'var(--color-text)' }}>
      <h1 style={{ margin: 0, fontSize: 'var(--fs-display)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}><UserRound size={28} /> {t('我的', 'Me')}</h1>

      {/* Account */}
      <section data-testid="me-account" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: 'var(--space-4) var(--space-5)', display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
        {userEmail ? (
          <>
            <div style={{ flex: '1 1 12rem', minWidth: 0 }}>
              <div style={{ fontWeight: 800, fontSize: 'var(--fs-heading)', overflowWrap: 'anywhere' }}>{playerName}{isPremium && <Crown size={16} style={{ color: '#fbbf24', marginLeft: 4 }} />}</div>
              <div style={{ color: 'var(--color-text-2)', fontSize: 'var(--fs-small)', overflowWrap: 'anywhere' }}>{userEmail}</div>
            </div>
            <Button variant="secondary" size="sm" onClick={() => go('garden')} icon={<TreePine size={18} />}>{t('我的園子', 'My Garden')}</Button>
          </>
        ) : (
          <>
            <div style={{ flex: '1 1 12rem', minWidth: 0 }}>
              <div style={{ fontWeight: 800, fontSize: 'var(--fs-heading)' }}>{playerName ? t('訪客：{name}', 'Guest: {name}').replace('{name}', String(playerName)) : t('還沒登入', 'Not logged in')}</div>
              <div style={{ color: 'var(--color-text-2)', fontSize: 'var(--fs-small)' }}>{t('登入後，成績和園子才會存進你的帳號。', 'Log in so your scores and garden are saved to your account.')}</div>
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
              <Button variant="secondary" size="sm" onClick={() => setShowLoginModal('login')}>{t('登入', 'Log In')}</Button>
              <Button size="sm" onClick={() => setShowLoginModal('signup')}>{t('申請帳號', 'Sign Up')}</Button>
            </div>
          </>
        )}
      </section>

      <ListGroup title={t('我的帳號', 'My account')} testId="me-group-account">
        {row('settings', Settings, '#475569', t('設定', 'Settings'), t('語言、聖經譯本、語音、通知、省電', 'Language, Bible version, voice, notifications, battery'), () => go('settings'))}
        {userEmail && row('inbox', Mail, '#2563eb', t('通知與鼓勵', 'Notifications'), t('收到的鼓勵、提醒和獎勵', 'Encouragement, reminders and rewards'), () => setShowEncouragePanel(true), unread > 0 ? <span className="ui-badge">{unread > 99 ? '99+' : unread}</span> : null)}
        {row('invite', Users, '#10b981', t('推薦朋友', 'Invite friends'), t('分享你的推薦連結，朋友第一次過關雙方都得獎勵', 'Share your link — you both get a reward on their first clear'), () => { setMainTab('garden'); setTimeout(() => scrollMenuTo(document.getElementById('garden-invite')), 350); })}
        {row('sponsors', Gift, '#f59e0b', t('贊助者與我的折抵', 'Sponsors & my discounts'), t('感謝贊助者、查看我的折抵紀錄', 'Thank our sponsors, see your discounts'), () => go('sponsors'))}
        {row('morningPush', CloudRain, '#0ea5e9', pushStatus === 'subscribed' ? t('已開啟每日經文推播', 'Daily Verse Push: On') : t('開啟每日經文推播', 'Daily Verse Push'), t('每天上午 7 點手機推播今日經文', 'Get today\'s verse pushed at 7am'), () => setShowPushModal(true))}
      </ListGroup>

      <ListGroup title={SHOW_CHARITY ? t('愛心與合作', 'Giving & partners') : t('商家與合作', 'Shops & partners')} testId="me-group-partners">
        {SHOW_CHARITY && row('charity', Heart, '#e11d48', t('愛心行動', 'Love in Action'), t('投入點數，成為教會／機構的折抵額度', 'Turn points into a discount allowance for a church or organisation'), () => go('charity'))}
        {row('sponsor', Gift, '#7c3aed', t('贊助經文雨', 'Sponsor VerseRain'), SHOW_CHARITY ? t('企業家與教會如何加入推廣讀經', 'How businesses & churches can join') : t('商家如何用點數折扣推廣讀經', 'How shops can promote Bible reading with a points discount'), () => go('sponsor'))}
        {SHOW_DONATE && row('donate', Heart, '#ef4444', t('支持經文雨', 'Support VerseRain'), t('小額支持 App 開發與維運', 'Help fund development & hosting'), () => go('donate'))}
        {row('merchant', Store, '#d97706', t('登記商家／教會', 'Register a shop / church'), t('在「誰在玩」地圖上標記，提供點數折扣', 'Get on the map and offer a points discount'), () => go('merchant'))}
        {row('verify', Ticket, '#0d9488', t('折扣券核銷', 'Verify a coupon'), t('店家輸入代碼確認折扣', 'Shops confirm a customer’s voucher here'), () => go('verify'))}
      </ListGroup>

      <ListGroup title={t('學習與說明', 'Learn & help')} testId="me-group-help">
        {row('manual', Library, '#2563eb', t('使用說明', 'User guide'), t('怎麼玩、怎麼算分、常見問題', 'How to play, scoring and FAQ'), () => go('manual'))}
        {row('bilingual_rain', Languages, '#0ea5e9', t('雙語經文雨 Beta', 'Bilingual VerseRain Beta'), t('同時聽兩種語言的經文', 'Listen to verses in two languages'), () => go('bilingual_rain'))}
        {row('about', Info, '#14b8a6', t('關於我們', 'About'), t('VerseRain 開發資訊', 'Info & Credits'), () => go('about'))}
        {row('feedback', MessageCircle, '#ec4899', t('意見回饋', 'Feedback'), t('聯絡與建議', 'Bugs & Suggestions'), () => window.open(`mailto:hungry4grace@gmail.com?subject=${encodeURIComponent('經文雨 意見回饋（VerseRain Feedback）')}`, '_blank'))}
      </ListGroup>

      {isSuperAdmin && (
        <ListGroup title={t('管理', 'Admin')} testId="me-group-admin">
          {row('rewards_admin', Gift, '#f59e0b', t('獎勵管理', 'Reward Admin'), t('待發送的禮券與獎勵', 'Gift cards & rewards to send'), () => go('rewards_admin'))}
        </ListGroup>
      )}
    </div>
  );
}
