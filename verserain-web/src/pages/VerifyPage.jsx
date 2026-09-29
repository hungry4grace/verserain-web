// The 'verify' page — moved out of App.jsx unchanged (UI/UX 第 4 階段).
import { Camera, Ticket } from 'lucide-react';
import VoucherScanner from '../VoucherScanner.jsx';
import { iosAppSupportsCamera, isInIosNativeApp } from '../lib/platform.js';

export default function VerifyPage({ t, lookupVoucher, setMainTab, setVerifyCodeInput, setVerifyResult, setVerifyScanOpen, useVoucher, verifyBusy, verifyCodeInput, verifyResult, verifyScanOpen }) {
  const r = verifyResult;
  const badge = (st) => st === 'issued' ? { text: t('有效', 'Valid'), bg: '#dcfce7', fg: '#166534' } : st === 'used' ? { text: t('已使用', 'Used'), bg: '#e2e8f0', fg: '#334155' } : st === 'expired' ? { text: t('已過期', 'Expired'), bg: '#fee2e2', fg: '#991b1b' } : st === 'void' ? { text: t('已作廢', 'Voided'), bg: '#fee2e2', fg: '#991b1b' } : { text: t('找不到這張券', 'Not found'), bg: '#fee2e2', fg: '#991b1b' };
  return (
    <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', maxWidth: 560, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.6rem', marginBottom: '0.8rem' }}>
        <h2 style={{ color: '#1e293b', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Ticket size={26} /> {t('折扣券核銷', 'Verify a coupon')}</h2>
        <button type="button" onClick={() => setMainTab('advanced')} style={{ background: 'transparent', border: '1px solid #cbd5e1', color: '#64748b', borderRadius: '6px', padding: '0.35rem 0.8rem', cursor: 'pointer', fontSize: '0.85rem' }}>← {t('返回', 'Back')}</button>
      </div>
      <p style={{ color: '#475569', lineHeight: 1.6, marginTop: 0, fontSize: '0.9rem' }}>{t('店家專用：輸入顧客折扣券上的 8 碼代碼（或掃描 QR 自動帶入），確認金額後於結帳時按「確認已使用」。', 'For shops: enter the 8-character code from the customer’s coupon (or scan the QR), check the amount, and press “Confirm used” at checkout.')}</p>
      {isInIosNativeApp() && !iosAppSupportsCamera() ? (
        <div style={{ background: '#fffbeb', border: '1px solid #fde68a', color: '#92400e', padding: '0.7rem 0.9rem', borderRadius: '10px', fontSize: '0.88rem', lineHeight: 1.45, marginBottom: '0.8rem' }}>
          📱 {t('目前 App 版本不支援掃描，請在 Safari 開 verserain.com 掃描，或在下方手動貼上推薦碼。下次 App 更新後會自動可用。', 'This App version does not support scanning yet. Open verserain.com in Safari to scan, or paste the code below. It will work automatically after the next App update.')}
        </div>
      ) : (
        <button type="button" onClick={() => { setVerifyResult(null); setVerifyScanOpen(true); }} style={{ width: '100%', padding: '0.9rem 1rem', borderRadius: 10, background: '#0d9488', color: '#fff', border: 'none', fontSize: '1.05rem', fontWeight: 800, cursor: 'pointer', marginBottom: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
          <Camera size={20} /> {t('掃描 QR 折扣券', 'Scan the coupon QR')}
        </button>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: '#94a3b8', fontSize: '0.78rem', margin: '0 0 0.5rem' }}>
        <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
        <span>{t('或手動輸入', 'or paste')}</span>
        <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
      </div>
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <input type="text" value={verifyCodeInput} onChange={e => { setVerifyCodeInput(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8)); setVerifyResult(null); }} onKeyDown={e => { if (e.key === 'Enter') lookupVoucher(); }} placeholder="ABCDEFGH" maxLength={9} style={{ flex: 1, padding: '0.6rem 0.8rem', borderRadius: 8, border: '1px solid #cbd5e1', fontFamily: 'monospace', fontSize: '1.3rem', letterSpacing: 3, textTransform: 'uppercase' }} />
        <button type="button" disabled={verifyBusy || verifyCodeInput.length !== 8} onClick={() => lookupVoucher()} style={{ background: verifyCodeInput.length === 8 ? '#0d9488' : '#e2e8f0', color: verifyCodeInput.length === 8 ? '#fff' : '#94a3b8', border: 'none', borderRadius: 8, padding: '0.6rem 1rem', cursor: 'pointer', fontWeight: 800 }}>{verifyBusy ? '…' : t('查詢', 'Look up')}</button>
      </div>
      {r && (() => { const b = badge(r.status); return (
        <div style={{ marginTop: '1rem', border: `1px solid ${r.status === 'issued' ? '#86efac' : '#e2e8f0'}`, borderRadius: 12, padding: '1rem', background: r.status === 'issued' ? '#f0fdf4' : '#f8fafc' }}>
          <span style={{ background: b.bg, color: b.fg, borderRadius: 999, padding: '0.2rem 0.8rem', fontWeight: 800 }}>{b.text}</span>
          {r.placeName && (
            <div style={{ marginTop: '0.6rem', color: '#1e293b' }}>
              <div style={{ fontWeight: 800, fontSize: '1.05rem' }}>{r.placeName}</div>
              <div style={{ fontSize: '2rem', fontWeight: 900, color: r.status === 'issued' ? '#166534' : '#64748b' }}>NT${r.ntd} {t('折抵', 'off')}</div>
              <div style={{ color: '#64748b', fontSize: '0.85rem' }}>{r.kind === 'pool'
                ? <>❤️ {t('愛心行動：{pool}', 'Love in Action: {pool}').replace('{pool}', String(r.poolName || ''))} · {t('消費 NT${b}', 'Bill NT${b}').replace('{b}', String(r.billNTD))} · {t('機構', 'Organisation')} {r.holder || ''}</>
                : <>{t('消費 NT${b} · 折扣 {p}%', 'Bill NT${b} · {p}%').replace('{b}', String(r.billNTD)).replace('{p}', String(r.discountPct))} · {t('持有人', 'Holder')} {r.holder || ''}</>}</div>
              {r.status === 'issued' && typeof r.secondsLeft === 'number' && <div style={{ color: '#b45309', fontSize: '0.85rem', marginTop: 2 }}>⏳ {t('剩餘 {t}', '{t} left').replace('{t}', `${Math.floor(r.secondsLeft / 60)}:${String(r.secondsLeft % 60).padStart(2, '0')}`)}</div>}
              {r.usedAt && <div style={{ color: '#64748b', fontSize: '0.8rem', marginTop: 2 }}>{t('使用時間', 'Used at')} {new Date(r.usedAt).toLocaleString()}</div>}
            </div>
          )}
          {r.status === 'issued' && (
            <button type="button" disabled={verifyBusy} onClick={useVoucher} style={{ marginTop: '0.9rem', width: '100%', background: '#166534', color: '#fff', border: 'none', borderRadius: 10, padding: '0.7rem 1rem', cursor: 'pointer', fontWeight: 800, fontSize: '1rem' }}>✅ {t('確認已使用（結帳時按）', 'Confirm used (press at checkout)')}</button>
          )}
        </div>
      ); })()}
      {verifyScanOpen && (
        <VoucherScanner
          t={t}
          onClose={() => setVerifyScanOpen(false)}
          onCode={(code) => { setVerifyScanOpen(false); setVerifyCodeInput(code); setVerifyResult(null); lookupVoucher(code); }}
        />
      )}
      <div style={{ color: '#94a3b8', fontSize: '0.8rem', marginTop: '1rem', lineHeight: 1.6 }}>{t('店家請把這一頁加入書籤：verserain.com/#verify。核銷後顧客的 App 會自動顯示「已使用」。', 'Shops: bookmark verserain.com/#verify. After confirming, the customer’s app shows the voucher as used.')}</div>
    </div>
  );
}
