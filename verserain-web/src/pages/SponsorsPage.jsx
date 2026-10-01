// The 'sponsors' page — moved out of App.jsx unchanged (UI/UX 第 4 階段).
import { Gift } from 'lucide-react';
import { SHOW_CHARITY } from '../../api/_lib/features.js';

export default function SponsorsPage({ t, fmtMoney, myVouchers, redeemErrorText, saveActiveVoucher, setMainTab, setShowLoginModal, sponsorsInfo, userEmail, voucherStatusBadge }) {
  const info = sponsorsInfo;
  const wall = (info && info.sponsors) || [];
  const card = { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '1rem 1.2rem', marginBottom: '1rem' };
  const h3 = { margin: '0 0 0.6rem', color: '#1e293b', fontSize: '1.05rem' };
  return (
    <div style={{ backgroundColor: '#fffdf7', borderRadius: '8px', border: '1px solid #fde68a', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.6rem', marginBottom: '0.8rem' }}>
        <h2 style={{ color: '#1e293b', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Gift size={26} /> {t('贊助者與我的折抵', 'Sponsors & my discounts')}</h2>
        <button type="button" onClick={() => setMainTab('advanced')} style={{ background: 'transparent', border: '1px solid #cbd5e1', color: '#64748b', borderRadius: '6px', padding: '0.35rem 0.8rem', cursor: 'pointer', fontSize: '0.85rem' }}>← {t('返回', 'Back')}</button>
      </div>
      <div data-testid="voucher-programme-ended" style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 10, padding: '0.8rem 1rem', marginBottom: '1rem', color: '#7c2d12', fontSize: '0.9rem', lineHeight: 1.7 }}>
        {SHOW_CHARITY
          ? t('原本「通過經文換禮券」的贊助獎勵計劃已經結束，不再產生新的獎勵；已經達標、還在等待寄送的禮券，仍會照常審核寄出。贊助改為把捐款交給合法的勸募團體、依原計畫使用；大家讀經達標時，再由合作企業另外加碼。', 'The old “pass verses for a voucher” programme has ended and no new rewards are created; vouchers already earned and awaiting delivery will still be reviewed and sent. Sponsorship now means giving to a licensed charity, used as that charity planned; when readers reach a shared goal, a partner business adds an extra gift.')
          : t('原本「通過經文換禮券」的贊助獎勵計劃已經結束，不再產生新的獎勵；已經達標、還在等待寄送的禮券，仍會照常審核寄出。現在的回饋方式是：用讀經點數在合作商家折抵。', 'The old “pass verses for a voucher” programme has ended and no new rewards are created; vouchers already earned and awaiting delivery will still be reviewed and sent. The reward now is a points discount at partner shops.')}{' '}
        <button type="button" onClick={() => setMainTab('sponsor')} style={{ background: '#c2410c', color: '#fff', border: 'none', borderRadius: 6, padding: '0.25rem 0.8rem', cursor: 'pointer', fontWeight: 700, fontSize: '0.82rem' }}>{t('了解贊助方案', 'Sponsorship options')} →</button>
      </div>
      <p data-testid="points-disclaimer" style={{ color: '#64748b', fontSize: '0.8rem', lineHeight: 1.6, marginTop: 0, marginBottom: '1rem' }}>
        {t('點數聲明：點數是遊戲內無償取得的促銷折抵權益，無現金價值、不可兌換現金、不可轉讓或轉售，亦非儲值或電子支付；折扣由商家自行提供，經文雨不經手任何款項。', 'About points: points are a free in-game promotional discount right with no cash value; they cannot be cashed out, transferred or resold, and are not stored value or e-payment. Discounts are offered by the shops themselves; VerseRain never handles money.')}
      </p>

      <div style={card}>
        <h3 style={h3}>🎟️ {t('我的折抵紀錄', 'My discounts')}</h3>
        {!userEmail ? (
          <div style={{ color: '#94a3b8', fontSize: '0.9rem' }}>{t('登入後可查看折抵紀錄', 'Sign in to see your discounts')}</div>
        ) : !myVouchers ? (
          <div style={{ color: '#94a3b8', fontSize: '0.9rem' }}>{t('載入中…', 'Loading…')}</div>
        ) : myVouchers.error ? (
          <div style={{ color: '#b45309', fontSize: '0.9rem' }}>{redeemErrorText(myVouchers.error)}{myVouchers.error === 'session_invalid' && <> <button type="button" onClick={() => setShowLoginModal('login')} style={{ background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 6, padding: '0.25rem 0.8rem', cursor: 'pointer', fontWeight: 700 }}>{t('重新登入', 'Sign in again')}</button></>}</div>
        ) : (
          <div>
            <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', marginBottom: '0.6rem', fontSize: '0.88rem', color: '#334155' }}>
              <span style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '0.35rem 0.7rem' }}>{t('已折抵', 'Saved')} <b style={{ color: '#166534' }}>NT${myVouchers.summary?.usedNTD || 0}</b> · {t('用了 {n} 點', '{n} pts spent').replace('{n}', Number(myVouchers.summary?.usedPoints || 0).toLocaleString())}</span>
              <span style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '0.35rem 0.7rem' }}>{t('已使用 {a} 張 · 過期 {b} 張', '{a} used · {b} expired').replace('{a}', String(myVouchers.summary?.used || 0)).replace('{b}', String(myVouchers.summary?.expired || 0))}</span>
            </div>
            {(myVouchers.vouchers || []).length === 0 ? (
              <div style={{ color: '#94a3b8', fontSize: '0.9rem' }}>{t('還沒有折抵過。到「誰在玩」地圖點商家標記就能產生折扣券。', 'No discounts yet. Tap a shop marker on the map to get a coupon.')}</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {(myVouchers.vouchers || []).map(v => { const st = v.computedStatus || v.status; const b = voucherStatusBadge(st); return (
                  <div key={v.code} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap', border: '1px solid #e2e8f0', borderRadius: 8, padding: '0.45rem 0.7rem', fontSize: '0.88rem', background: st === 'issued' ? '#fffbeb' : '#fff' }}>
                    <div style={{ minWidth: 0 }}>
                      <b style={{ color: '#1e293b' }}>{v.placeName}</b> <span style={{ color: '#166534', fontWeight: 700 }}>NT${v.ntd}</span> <span style={{ color: '#64748b' }}>· {t('消費 NT${b} · 折扣 {p}%', 'Bill NT${b} · {p}%').replace('{b}', String(v.billNTD)).replace('{p}', String(v.discountPct))} · {new Date(v.usedAt || v.issuedAt).toLocaleString()}</span>
                    </div>
                    <span style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                      <span style={{ background: b.bg, color: b.fg, borderRadius: 999, padding: '0.1rem 0.6rem', fontSize: '0.76rem', fontWeight: 700 }}>{b.text}</span>
                      {st === 'issued' && <button type="button" onClick={() => saveActiveVoucher({ ...v, status: 'issued' })} style={{ background: '#f59e0b', color: '#fff', border: 'none', borderRadius: 6, padding: '0.2rem 0.7rem', cursor: 'pointer', fontWeight: 700, fontSize: '0.78rem' }}>{t('顯示折扣券', 'Show coupon')}</button>}
                    </span>
                  </div>
                ); })}
              </div>
            )}
          </div>
        )}
      </div>

      {SHOW_CHARITY && <div style={{ ...card, border: '1px solid #fecdd3', background: '#fff7f8' }}>
        <h3 style={h3}>❤️ {t('愛心行動', 'Love in Action')}</h3>
        <div style={{ color: '#475569', fontSize: '0.9rem', lineHeight: 1.6 }}>{t('把點數投入教會或機構的愛心專案，成為他們在合作商家採購時的折抵額度。點數無現金價值，投入後不可撤回。', 'Put points into a church or organisation’s charity project as their discount allowance at participating shops. Points have no cash value and a contribution cannot be reversed.')}</div>
        <button type="button" onClick={() => setMainTab('charity')} style={{ marginTop: '0.6rem', background: '#e11d48', color: '#fff', border: 'none', borderRadius: 6, padding: '0.35rem 0.9rem', cursor: 'pointer', fontWeight: 700 }}>❤️ {t('看看有哪些愛心行動', 'See the Love in Action projects')}</button>
      </div>}

      <div style={card}>
        <h3 style={h3}>💛 {t('感謝贊助者', 'Thank you, sponsors')}</h3>
        {info === null ? (
          <div style={{ color: '#94a3b8', fontSize: '0.85rem' }}>{t('載入中…', 'Loading…')}</div>
        ) : wall.length === 0 ? (
          <div style={{ color: '#94a3b8', fontSize: '0.85rem' }}>{t('第一位贊助者的位置還空著。', 'The first sponsor’s spot is still open.')}</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {wall.map(sp => (
              <div key={sp.id} style={{ borderLeft: '3px solid #f59e0b', paddingLeft: '0.7rem', fontSize: '0.9rem', color: '#334155' }}>
                <b>{sp.anonymous || !sp.displayName ? t('匿名贊助者', 'Anonymous sponsor') : sp.displayName}</b>
                {sp.scope === 'church' && sp.churchName ? <span style={{ color: '#5b21b6' }}> · ⛪ {sp.churchName}</span> : null}
                {sp.amount ? <span style={{ color: '#64748b' }}> · {fmtMoney(sp.amount, sp.currency)}</span> : null}
                {sp.receivedAt ? <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}> · {sp.receivedAt}</span> : null}
                {sp.message ? <div style={{ color: '#475569', fontSize: '0.85rem' }}>「{sp.message}」</div> : null}
              </div>
            ))}
          </div>
        )}
        <div style={{ marginTop: '0.9rem', padding: '0.7rem 0.9rem', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, fontSize: '0.88rem', color: '#166534', lineHeight: 1.6 }}>
          {SHOW_CHARITY
            ? t('想成為贊助者？捐款直接交給合作的合法勸募團體，由它開立收據；經文雨只記錄點數和通知。報告只有統計數字，不會提供玩家個資。', 'Want to sponsor? Gifts go straight to a licensed partner charity, which issues the receipt; VerseRain only records points and sends notices. Reports contain statistics only — never player data.')
            : t('想成為合作商家？登記後就能在地圖上提供點數折扣，折扣由商家自行提供並吸收。', 'Want to be a partner shop? Register to offer a points discount on the map; the shop offers and absorbs the discount.')}{' '}
          <span style={{ display: 'inline-flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: 6 }}>
            <button type="button" onClick={() => setMainTab('sponsor')} style={{ background: '#166534', color: '#fff', border: 'none', borderRadius: 6, padding: '0.3rem 0.9rem', cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem' }}>{t('了解贊助方案', 'Sponsorship options')} →</button>
            <a href={`mailto:hungry4grace@gmail.com?subject=${encodeURIComponent(SHOW_CHARITY ? '經文雨 愛心方案贊助（VerseRain Charity Projects）' : '經文雨 商家合作（VerseRain Partner Shops）')}`} style={{ color: '#166534', fontWeight: 700, alignSelf: 'center' }}>{t('聯絡我們', 'Contact us')} →</a>
          </span>
        </div>
      </div>

      <div style={{ ...card, marginBottom: 0 }}>
        <h3 style={h3}>📜 {t('條款', 'Terms')}</h3>
        <ul style={{ margin: 0, paddingLeft: '1.2rem', color: '#475569', fontSize: '0.85rem', lineHeight: 1.8 }}>
          <li>{t('人工審核後 7 個工作天內寄出；使用 LINE／Apple 隱藏信箱的帳號請提供可收信的 Email。', 'Sent within 7 working days after manual review; accounts using a hidden LINE / Apple email must provide a reachable one.')}</li>
          <li>{t('額度以贊助池為限；主辦方保留審核、調整與終止本計劃的權利。', 'Limited by the sponsor pool; the organiser may review, adjust or end the programme.')}</li>
        </ul>
      </div>
    </div>
  );
}
