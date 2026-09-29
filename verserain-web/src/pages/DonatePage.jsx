// The 'donate' page — moved out of App.jsx unchanged (UI/UX 第 4 階段).
import { DONATE_INFO } from '../lib/routes.js';
import { Heart } from 'lucide-react';
import { toast } from '../ui';

export default function DonatePage({ t, setMainTab, setToast }) {
  const info = DONATE_INFO;
  const soon = t('即將公布', 'Coming soon');
  const card = { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '1rem 1.2rem', marginBottom: '1rem' };
  const h3 = { margin: '0 0 0.6rem', color: '#1e293b', fontSize: '1.05rem' };
  const copy = async (label, value) => {
    try { await navigator.clipboard.writeText(value); toast.success(t('已複製{what}', 'Copied {what}').replace('{what}', label)); } catch { setToast(value); }
  };
  const row = (label, value) => (
    <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.6rem', padding: '0.45rem 0', borderBottom: '1px solid #f1f5f9', fontSize: '0.92rem' }}>
      <span style={{ color: '#64748b' }}>{label}</span>
      <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <b style={{ color: value ? '#1e293b' : '#94a3b8', fontFamily: value ? 'monospace' : 'inherit', fontWeight: value ? 700 : 500 }}>{value || soon}</b>
        {value && <button type="button" onClick={() => copy(label, value)} style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: 6, padding: '0.15rem 0.55rem', cursor: 'pointer', fontSize: '0.78rem', color: '#334155' }}>{t('複製', 'Copy')}</button>}
      </span>
    </div>
  );
  return (
    <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.6rem', marginBottom: '0.8rem' }}>
        <h2 style={{ color: '#1e293b', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Heart size={26} /> {t('支持經文雨', 'Support VerseRain')}</h2>
        <button type="button" onClick={() => setMainTab('advanced')} style={{ background: 'transparent', border: '1px solid #cbd5e1', color: '#64748b', borderRadius: '6px', padding: '0.35rem 0.8rem', cursor: 'pointer', fontSize: '0.85rem' }}>← {t('返回', 'Back')}</button>
      </div>
      <p style={{ color: '#475569', lineHeight: 1.7, marginTop: 0 }}>
        {t('經文雨免費、沒有廣告，也不販售任何資料。你的支持會用在伺服器、語音朗讀、多語翻譯與持續開發，讓更多人能免費讀經、背經。', 'VerseRain is free, ad-free, and sells no data. Your support pays for servers, voice narration, translations, and ongoing development so more people can read and memorise Scripture for free.')}
      </p>
      <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: '0.8rem 1rem', marginBottom: '1rem', color: '#78350f', fontSize: '0.9rem', lineHeight: 1.7 }}>
        <b>{t('請先了解：', 'Please note:')}</b>{' '}
        {t('這是對開發者個人的支持（贈與），不是公益勸募，因此無法開立捐贈收據、不能抵稅。若你是教會或企業，想為愛心方案捐款並需要收據，請走「贊助經文雨」方案：捐款直接交給合作的合法勸募團體，由它開立收據。', 'This is a personal gift to the developer, not a charitable appeal, so no donation receipt or tax deduction can be issued. Churches and businesses that want to give to charity projects and need a receipt should use the “Sponsor VerseRain” programme: gifts go straight to a licensed partner charity, which issues the receipt.')}{' '}
        <button type="button" onClick={() => setMainTab('sponsor')} style={{ background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 6, padding: '0.25rem 0.8rem', cursor: 'pointer', fontWeight: 700, fontSize: '0.82rem' }}>{t('贊助經文雨', 'Sponsor VerseRain')} →</button>
      </div>

      <div style={card}>
        <h3 style={h3}>🏦 {t('台灣銀行匯款', 'Bank transfer (Taiwan)')}</h3>
        {row(t('銀行', 'Bank'), info.bankName)}
        {row(t('銀行代碼', 'Bank code'), info.bankCode)}
        {row(t('帳號', 'Account'), info.account)}
        {row(t('戶名', 'Account holder'), info.holder)}
        <div style={{ color: '#64748b', fontSize: '0.82rem', marginTop: '0.6rem' }}>
          {t('匯款後歡迎寄信告訴我，我會回信致謝。', 'After transferring, feel free to email me — I will write back to say thank you.')}{' '}
          <a href={`mailto:${info.contactEmail}?subject=${encodeURIComponent('經文雨 支持（VerseRain Support）')}`} style={{ color: '#3b82f6', fontWeight: 600 }}>{info.contactEmail}</a>
        </div>
      </div>

      <div style={card}>
        <h3 style={h3}>🌏 {t('海外朋友：PayPal', 'Overseas: PayPal')}</h3>
        {info.paypalMe ? (
          <a href={info.paypalMe} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block', background: '#0070ba', color: '#fff', borderRadius: 8, padding: '0.5rem 1.1rem', fontWeight: 700, textDecoration: 'none' }}>PayPal.me →</a>
        ) : (
          <span style={{ color: '#94a3b8' }}>{soon}</span>
        )}
        <div style={{ color: '#64748b', fontSize: '0.82rem', marginTop: '0.6rem' }}>{t('台灣的 PayPal 帳戶只能收境外付款，台灣朋友請用上方匯款。', 'A Taiwan PayPal account can only receive payments from abroad; friends in Taiwan please use the bank transfer above.')}</div>
      </div>

      <div style={{ ...card, opacity: 0.7 }}>
        <h3 style={h3}>💳 {t('線上刷卡／LINE Pay', 'Card / LINE Pay')}</h3>
        <span style={{ background: '#e2e8f0', color: '#64748b', borderRadius: 999, padding: '0.2rem 0.8rem', fontSize: '0.82rem', fontWeight: 600 }}>{t('即將開放', 'Coming later')}</span>
      </div>

      <div style={{ color: '#94a3b8', fontSize: '0.8rem', lineHeight: 1.6 }}>
        {t('支持者的資料不會提供給任何第三方；只有在你同意時，才會把你的名字列入感謝名單。', 'Supporter details are never shared with third parties; your name appears on the thank-you list only with your consent.')}
      </div>
    </div>
  );
}
