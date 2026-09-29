// The 愛心行動 (charity) tab — moved out of App.jsx unchanged (UI/UX 第 4 階段).
import { Heart } from 'lucide-react';
import { confirmDialog, toast } from '../ui';

export default function CharityPage({ t, cashBusy, cashDraft, cashOrgTypeLabel, cashStatusBadge, charityFocus, charityMine, charityNoticeText, charityPools, createPool, myPlaces, openContribute, poolCreateBusy, poolCreateDraft, poolStatusBadge, redeemErrorText, saveActiveVoucher, saveCashAppeal, setCashDraft, setMainTab, setPoolCreateDraft, setPoolRedeemModal, setShowLoginModal, startCashEdit, userEmail, voucherStatusBadge }) {
  const card = { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '1rem 1.2rem', marginBottom: '1rem' };
  const h3 = { margin: '0 0 0.6rem', color: '#1e293b', fontSize: '1.05rem' };
  const field = { width: '100%', boxSizing: 'border-box', padding: '0.5rem 0.7rem', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: '0.95rem', background: '#fff' };
  const label = { display: 'block', color: '#475569', fontSize: '0.82rem', fontWeight: 700, margin: '0.8rem 0 0.25rem' };
  const pools = charityPools?.pools || [];
  const mine = charityMine && !charityMine.error ? charityMine : null;
  const owned = mine?.owned || [];
  // A marker may run several pools (one per project), so every approved church / org is offered.
  const eligibleOrgPlaces = (myPlaces || []).filter(pl => ['church', 'org'].includes(pl.kind) && pl.status === 'approved');
  const focusOrg = (pools.find(p => p.id === charityFocus) || {}).orgPlaceId || '';
  const bar = (value, max) => (
    <div style={{ background: '#fee2e2', borderRadius: 999, height: 8, overflow: 'hidden' }}><div style={{ width: `${max > 0 ? Math.min(100, Math.round(value / max * 100)) : 0}%`, background: '#e11d48', height: '100%' }} /></div>
  );
  const statsLine = (p) => t('已投入 NT${a} · 可用折抵額度 NT${b} · {n} 位參與 · 已折抵 NT${c}', 'NT${a} contributed · NT${b} allowance left · {n} participants · NT${c} used').replace('{a}', String(p.contributedNTD || 0)).replace('{b}', String(p.allowanceNTD || 0)).replace('{n}', String(p.contributors || 0)).replace('{c}', String(p.usedNTD || 0));
  const notice = (
    <div data-testid="charity-notice" style={{ background: '#fffbeb', border: '1px solid #fde68a', color: '#78350f', borderRadius: 10, padding: '0.7rem 0.9rem', fontSize: '0.82rem', lineHeight: 1.6, marginBottom: '1rem' }}>
      ⚠️ {charityNoticeText()}
    </div>
  );
  return (
    <div style={{ backgroundColor: '#fff7f8', borderRadius: '8px', border: '1px solid #fecdd3', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', maxWidth: 720, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.6rem', marginBottom: '0.8rem' }}>
        <h2 style={{ color: '#1e293b', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Heart size={26} color="#e11d48" /> {t('愛心行動', 'Love in Action')}</h2>
        <button type="button" onClick={() => setMainTab('advanced')} style={{ background: 'transparent', border: '1px solid #cbd5e1', color: '#64748b', borderRadius: '6px', padding: '0.35rem 0.8rem', cursor: 'pointer', fontSize: '0.85rem' }}>← {t('返回', 'Back')}</button>
      </div>
      <p style={{ color: '#475569', lineHeight: 1.7, marginTop: 0 }}>
        {t('把你的背經點數投入教會或機構的愛心行動。投入的點數會從你的帳號扣除，成為該機構在合作商家消費時的折抵額度（每 1,000 點可折抵 NT$1）。', 'Put your verse points into a church or organisation’s Love in Action project. The points are deducted from your account and become that organisation’s discount allowance at participating shops (every 1,000 points gives NT$1 of allowance).')}
      </p>
      {notice}

      <div style={card}>
        <h3 style={h3}>❤️ {t('進行中的愛心行動', 'Open Love in Action projects')}</h3>
        {!charityPools ? <div style={{ color: '#94a3b8' }}>{t('載入中…', 'Loading…')}</div> : charityPools.error ? (
          <div style={{ color: '#b45309', fontSize: '0.9rem' }}>{String(charityPools.error)}</div>
        ) : pools.length === 0 ? (
          <div style={{ color: '#94a3b8', fontSize: '0.9rem' }}>{t('目前還沒有開放中的愛心行動。已上地圖的教會或機構可以在下方建立。', 'No Love in Action project is open yet. A church or organisation already on the map can create one below.')}</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
            {pools.map(p => { const focus = p.id === charityFocus || (!!focusOrg && p.orgPlaceId === focusOrg); return (
              <div key={p.id} id={`pool-${p.id}`} data-testid="pool-card" style={{ border: focus ? '2px solid #e11d48' : '1px solid #fecdd3', background: '#fff', borderRadius: 10, padding: '0.8rem 1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'baseline' }}>
                  <b style={{ color: '#1e293b', fontSize: '1.02rem' }}>❤️ {p.name}</b>
                  <span style={{ color: '#64748b', fontSize: '0.85rem' }}>⛪ {p.orgPlaceName}</span>
                </div>
                {p.description ? <div style={{ color: '#475569', fontSize: '0.9rem', lineHeight: 1.6, margin: '0.4rem 0', whiteSpace: 'pre-wrap' }}>{p.description}</div> : null}
                <div style={{ margin: '0.5rem 0 0.3rem' }}>{bar(p.allowanceNTD || 0, Math.max(1, p.contributedNTD || 0))}</div>
                <div style={{ color: '#334155', fontSize: '0.84rem' }}>{statsLine(p)}</div>
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                  {(p.merchants || []).length === 0 ? <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>{t('尚無合作商家參與', 'No participating shop yet')}</span> : (p.merchants || []).map(m => (
                    <span key={m.placeId} style={{ background: '#fff1f2', border: '1px solid #fecdd3', color: '#9f1239', borderRadius: 999, padding: '0.1rem 0.6rem', fontSize: '0.78rem' }}>🏪 {m.placeName} · {t('單筆最高 NT${n}', 'up to NT${n} per order').replace('{n}', String(m.perOrderMaxNTD))}</span>
                  ))}
                </div>
                {p.cashAppeal ? (() => { const ca = p.cashAppeal; return (
                  <div data-testid="pool-cash" style={{ marginTop: '0.7rem', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '0.6rem 0.8rem', fontSize: '0.86rem', color: '#14532d', lineHeight: 1.65 }}>
                    <b>💵 {t('也可以直接捐款給機構', 'You can also give money directly to the organisation')}</b>
                    {ca.ended ? <div style={{ color: '#b45309', fontWeight: 700 }}>{t('這次募款已經截止', 'This appeal has ended')}</div> : null}
                    <div>{t('經費目標 NT${n}', 'Funding goal NT${n}').replace('{n}', Number(ca.goalNTD || 0).toLocaleString())}{ca.purpose ? ` · ${ca.purpose}` : ''}</div>
                    <div>{t('截止日 {d}', 'Ends {d}').replace('{d}', String(ca.deadline || ''))}</div>
                    <div>{t('收款機構', 'Recipient')}：{ca.orgLegalName}（{cashOrgTypeLabel(ca.orgType)}）</div>
                    <div>{t('勸募許可字號', 'Fundraising permit')}：{ca.permitNo}{ca.permitUrl ? <> · <a href={ca.permitUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#15803d' }}>{t('查證', 'Verify')}</a></> : null}</div>
                    {!ca.ended && (
                      <>
                        <div>{t('銀行', 'Bank')}：{ca.bankName}{ca.bankBranch ? ` ${ca.bankBranch}` : ''}</div>
                        <div>{t('戶名', 'Account name')}：{ca.accountName}</div>
                        <div>{t('帳號', 'Account no.')}：<b style={{ fontFamily: 'monospace', fontSize: '0.95rem' }}>{ca.accountNo}</b>{' '}
                          <button type="button" data-testid="pool-cash-copy" onClick={() => { try { navigator.clipboard.writeText(ca.accountNo).then(() => { toast.success(t('已複製帳號', 'Account number copied')); }).catch(() => {}); } catch { /* ignore */ } }} style={{ background: '#fff', border: '1px solid #86efac', color: '#166534', borderRadius: 6, padding: '0.05rem 0.5rem', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 700 }}>{t('複製帳號', 'Copy')}</button>
                        </div>
                        {ca.transferNote ? <div>{t('匯款時請註明：{note}', 'Please add this note to your transfer: {note}').replace('{note}', ca.transferNote)}</div> : null}
                      </>
                    )}
                    <div style={{ color: '#166534', fontSize: '0.76rem', marginTop: '0.2rem' }}>{t('款項直接匯給機構，由機構開立收據，並依勸募許可的使用計畫使用；經文雨不經手任何款項，也無法查核到帳情形。讀經點數是另一個參與目標，和捐款金額沒有換算關係。', 'Money goes straight to the organisation, which issues the receipt and uses it under its fundraising permit; VerseRain never handles the money and cannot confirm receipt. Reading points are a separate way to take part and are not converted into money.')}</div>
                  </div>
                ); })() : null}
                <button type="button" onClick={() => openContribute(p)} style={{ marginTop: '0.7rem', background: '#e11d48', color: '#fff', border: 'none', borderRadius: 8, padding: '0.45rem 1rem', cursor: 'pointer', fontWeight: 800 }}>❤️ {t('投入點數', 'Contribute points')}</button>
              </div>
            ); })}
          </div>
        )}
      </div>

      {userEmail && (
        <div style={card}>
          <h3 style={h3}>📒 {t('我的投入紀錄', 'My contributions')}</h3>
          {!charityMine ? <div style={{ color: '#94a3b8', fontSize: '0.9rem' }}>{t('載入中…', 'Loading…')}</div> : charityMine.error ? (
            <div style={{ color: '#b45309', fontSize: '0.9rem' }}>{redeemErrorText(charityMine.error)}{charityMine.error === 'session_invalid' && <> <button type="button" onClick={() => setShowLoginModal('login')} style={{ background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 6, padding: '0.2rem 0.7rem', cursor: 'pointer', fontWeight: 700 }}>{t('重新登入', 'Sign in again')}</button></>}</div>
          ) : (mine?.contributed || []).length === 0 ? (
            <div style={{ color: '#94a3b8', fontSize: '0.9rem' }}>{t('還沒有投入過。', 'No contributions yet.')}</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', maxHeight: 260, overflowY: 'auto' }}>
              {(mine?.contributed || []).map(c => (
                <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', flexWrap: 'wrap', fontSize: '0.86rem', background: '#f8fafc', borderRadius: 6, padding: '0.3rem 0.6rem' }}>
                  <span style={{ color: '#334155' }}>{new Date(c.at).toLocaleString()} · ❤️ {c.poolName}</span>
                  <span style={{ color: '#9f1239', fontWeight: 700 }}>{t('{p} 點 → 額度 NT${n}', '{p} pts → NT${n} allowance').replace('{p}', Number(c.points || 0).toLocaleString()).replace('{n}', String(c.ntd || 0))}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {owned.length > 0 && owned.map(op => { const b = poolStatusBadge(op.status); return (
        <div key={op.id} data-testid="owned-pool" style={{ ...card, border: '1px solid #fecdd3' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <h3 style={{ ...h3, margin: 0 }}>⛪ {t('我的愛心行動', 'My Love in Action project')}：{op.name}</h3>
            <span style={{ background: b.bg, color: b.fg, borderRadius: 999, padding: '0.15rem 0.6rem', fontSize: '0.78rem', fontWeight: 700 }}>{b.text}</span>
          </div>
          <div style={{ textAlign: 'center', margin: '0.8rem 0' }}>
            <div style={{ color: '#64748b', fontSize: '0.8rem' }}>{t('可用折抵額度', 'Discount allowance available')}</div>
            <div style={{ fontSize: '2rem', fontWeight: 900, color: '#be123c' }}>NT${op.allowanceNTD || 0}</div>
            <div style={{ color: '#334155', fontSize: '0.84rem' }}>{statsLine(op)}</div>
          </div>
          {op.status === 'pending' && <div style={{ color: '#92400e', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '0.5rem 0.7rem', fontSize: '0.85rem' }}>{t('已送出，等待審核', 'Submitted, awaiting review')}</div>}
          {['pending', 'approved'].includes(op.status) && (() => { const ca = op.cashAppeal; const d = cashDraft[op.id]; const cb = ca ? cashStatusBadge(ca.status) : null; const setD = (k, v) => setCashDraft(o => ({ ...o, [op.id]: { ...o[op.id], [k]: v } })); const inp = (k, lab, props = {}) => (
              <div key={k}><label style={label}>{lab}</label><input value={d[k] || ''} onChange={e => setD(k, e.target.value)} style={field} {...props} /></div>
            ); return (
            <div data-testid="owned-pool-cash" style={{ marginTop: '0.8rem', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '0.6rem 0.8rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
                <b style={{ color: '#14532d', fontSize: '0.9rem' }}>💵 {t('接受現金捐款（選填）', 'Accept money donations (optional)')}</b>
                {cb ? <span style={{ background: cb.bg, color: cb.fg, borderRadius: 999, padding: '0.1rem 0.55rem', fontSize: '0.76rem', fontWeight: 700 }}>{cb.text}</span> : null}
              </div>
              <div style={{ color: '#166534', fontSize: '0.82rem', lineHeight: 1.6, marginTop: '0.25rem' }}>{t('只有取得「勸募許可」的財團法人、公益社團法人、公立學校或行政法人可以填寫；經文雨確認許可字號與帳戶戶名後才會公開。未立案的教會請以所屬財團法人的名義申請，或只收點數。修改許可或帳戶資料後需要重新審核。', 'Only a foundation, public-interest association, public school or administrative agency holding a fundraising permit may fill this in; VerseRain publishes it after checking the permit number and the account name. An unregistered church should apply under the name of the foundation it belongs to, or accept points only. Changing the permit or account details sends it back for review.')}</div>
              {ca && ca.status === 'rejected' && ca.reviewNote ? <div style={{ color: '#991b1b', fontSize: '0.82rem', marginTop: '0.25rem' }}>{t('退回原因：{r}', 'Reason: {r}').replace('{r}', ca.reviewNote)}</div> : null}
              {ca && !d ? (
                <div style={{ fontSize: '0.84rem', color: '#14532d', marginTop: '0.35rem', lineHeight: 1.6 }}>
                  {ca.orgLegalName} · {t('勸募許可字號', 'Fundraising permit')}：{ca.permitNo}<br />
                  {ca.bankName} {ca.bankBranch} · {ca.accountName} · <span style={{ fontFamily: 'monospace' }}>{ca.accountNo}</span><br />
                  {t('經費目標 NT${n}', 'Funding goal NT${n}').replace('{n}', Number(ca.goalNTD || 0).toLocaleString())} · {t('截止日 {d}', 'Ends {d}').replace('{d}', String(ca.deadline || ''))}
                </div>
              ) : null}
              {!d ? (
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginTop: '0.45rem' }}>
                  <button type="button" onClick={() => startCashEdit(op)} style={{ background: '#16a34a', color: '#fff', border: 'none', borderRadius: 6, padding: '0.35rem 0.8rem', cursor: 'pointer', fontWeight: 700, fontSize: '0.84rem' }}>{ca ? t('修改捐款資訊', 'Edit donation details') : t('填寫捐款資訊', 'Add donation details')}</button>
                  {ca ? <button type="button" disabled={cashBusy === op.id} onClick={async () => { if (await confirmDialog({ message: t('確定要停止公開現金捐款資訊嗎？', 'Stop showing the cash donation details?'), confirmLabel: t('停止公開', 'Remove'), danger: true })) saveCashAppeal(op.id, true); }} style={{ background: 'transparent', color: '#991b1b', border: '1px solid #fecaca', borderRadius: 6, padding: '0.35rem 0.8rem', cursor: 'pointer', fontSize: '0.84rem' }}>{t('停止公開', 'Remove')}</button> : null}
                </div>
              ) : (
                <div style={{ marginTop: '0.4rem' }}>
                  {inp('orgLegalName', t('收款機構全名（需與勸募許可相同）', 'Organisation’s full legal name (as on the permit)'), { maxLength: 80 })}
                  <label style={label}>{t('機構類型', 'Organisation type')}</label>
                  <select value={d.orgType || 'foundation'} onChange={e => setD('orgType', e.target.value)} style={field}>
                    {['foundation', 'association', 'school', 'agency'].map(k => <option key={k} value={k}>{cashOrgTypeLabel(k)}</option>)}
                  </select>
                  {inp('permitNo', t('勸募許可字號', 'Fundraising permit number'), { maxLength: 80 })}
                  {inp('permitUrl', t('許可查證連結（選填，https://）', 'Permit verification link (optional, https://)'), { maxLength: 300, inputMode: 'url' })}
                  {inp('bankName', t('銀行', 'Bank'), { maxLength: 40 })}
                  {inp('bankBranch', t('分行（選填）', 'Branch (optional)'), { maxLength: 40 })}
                  {inp('accountName', t('戶名（需與機構全名相同）', 'Account name (must match the legal name)'), { maxLength: 80 })}
                  {inp('accountNo', t('帳號', 'Account number'), { maxLength: 24, inputMode: 'numeric' })}
                  {inp('goalNTD', t('經費目標（新台幣）', 'Funding goal (NT$)'), { type: 'number', min: 1, inputMode: 'numeric' })}
                  <label style={label}>{t('用途', 'Purpose')}</label>
                  <textarea value={d.purpose || ''} onChange={e => setD('purpose', e.target.value)} maxLength={300} rows={2} style={{ ...field, resize: 'vertical' }} />
                  {inp('deadline', t('截止日', 'End date'), { type: 'date' })}
                  {inp('transferNote', t('請捐款人在匯款時註明', 'Note donors should add to their transfer'), { maxLength: 60 })}
                  <label style={{ display: 'flex', gap: '0.45rem', alignItems: 'flex-start', marginTop: '0.6rem', fontSize: '0.82rem', color: '#14532d', lineHeight: 1.55 }}>
                    <input type="checkbox" checked={!!d.agree} onChange={e => setD('agree', e.target.checked)} style={{ marginTop: 3 }} />
                    <span>{t('我確認本機構已取得這次活動的勸募許可，帳戶為本機構所有；捐款由本機構收取、開立收據，並依許可的使用計畫使用及公開徵信。經文雨不經手款項。', 'I confirm the organisation holds a fundraising permit for this appeal and owns this account; donations are received, receipted, used and reported by the organisation under the permit. VerseRain never handles the money.')}</span>
                  </label>
                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginTop: '0.6rem' }}>
                    <button type="button" disabled={cashBusy === op.id || !d.agree} onClick={() => saveCashAppeal(op.id)} style={{ background: d.agree ? '#16a34a' : '#94a3b8', color: '#fff', border: 'none', borderRadius: 6, padding: '0.4rem 0.9rem', cursor: d.agree ? 'pointer' : 'not-allowed', fontWeight: 700, fontSize: '0.85rem' }}>{cashBusy === op.id ? t('送出中…', 'Sending…') : t('送出審核', 'Submit for review')}</button>
                    <button type="button" onClick={() => setCashDraft(o => { const n = { ...o }; delete n[op.id]; return n; })} style={{ background: 'transparent', color: '#64748b', border: '1px solid #cbd5e1', borderRadius: 6, padding: '0.4rem 0.9rem', cursor: 'pointer', fontSize: '0.85rem' }}>{t('取消', 'Cancel')}</button>
                  </div>
                </div>
              )}
            </div>
          ); })()}
          <div style={{ marginTop: '0.6rem' }}>
            <b style={{ color: '#334155', fontSize: '0.9rem' }}>🏪 {t('參與的商家', 'Participating shops')}</b>
            {(op.merchants || []).length === 0 ? <div style={{ color: '#94a3b8', fontSize: '0.84rem' }}>{t('還沒有商家參與。請邀請商家到「登記商家」頁的「我的登記」勾選參與。', 'No shop has joined yet. Invite shops to tick “Join a Love in Action project” under their listing on the Register page.')}</div> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', marginTop: '0.3rem' }}>
                {(op.merchants || []).map(m => (
                  <div key={m.placeId} style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', flexWrap: 'wrap', fontSize: '0.85rem', background: '#f8fafc', borderRadius: 6, padding: '0.3rem 0.6rem' }}>
                    <span style={{ color: '#334155' }}>🏪 {m.placeName}</span>
                    <span style={{ color: '#64748b' }}>{t('單筆最高 NT${n}', 'up to NT${n} per order').replace('{n}', String(m.perOrderMaxNTD))} · {t('每月最高 NT${n}', 'up to NT${n} a month').replace('{n}', String(m.monthlyMaxNTD))} · {t('本月已折抵 NT${n}', 'NT${n} used this month').replace('{n}', String(m.monthUsedNTD || 0))}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          {op.status === 'approved' && (op.merchants || []).length > 0 && (
            <button type="button" onClick={() => setPoolRedeemModal({ pool: op, placeId: op.merchants[0].placeId, bill: '' })} style={{ marginTop: '0.7rem', background: '#f59e0b', color: '#fff', border: 'none', borderRadius: 8, padding: '0.45rem 1rem', cursor: 'pointer', fontWeight: 800 }}>🎟️ {t('產生折扣券', 'Get a discount voucher')}</button>
          )}
          {(op.contributions || []).length > 0 && (
            <div style={{ marginTop: '0.8rem' }}>
              <b style={{ color: '#334155', fontSize: '0.9rem' }}>❤️ {t('最近投入', 'Recent contributions')}</b>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginTop: '0.3rem', maxHeight: 200, overflowY: 'auto' }}>
                {op.contributions.slice(0, 20).map(c => (
                  <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: '#334155', background: '#f8fafc', borderRadius: 6, padding: '0.25rem 0.6rem' }}>
                    <span>{new Date(c.at).toLocaleDateString()} · {c.who}</span><span style={{ color: '#9f1239', fontWeight: 700 }}>+NT${c.ntd}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {(op.vouchers || []).length > 0 && (
            <div style={{ marginTop: '0.8rem' }}>
              <b style={{ color: '#334155', fontSize: '0.9rem' }}>🎟️ {t('最近折扣券', 'Recent coupons')}</b>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginTop: '0.3rem', maxHeight: 200, overflowY: 'auto' }}>
                {op.vouchers.slice(0, 20).map(v => { const vb = voucherStatusBadge(v.status); return (
                  <div key={v.code} style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', flexWrap: 'wrap', fontSize: '0.82rem', color: '#334155', background: '#f8fafc', borderRadius: 6, padding: '0.25rem 0.6rem' }}>
                    <span>{new Date(v.usedAt || v.issuedAt).toLocaleString()} · {v.placeName} · <b style={{ color: '#166534' }}>NT${v.ntd}</b>{v.status === 'issued' && <> · <button type="button" onClick={() => saveActiveVoucher({ ...v, status: 'issued' })} style={{ background: '#f59e0b', color: '#fff', border: 'none', borderRadius: 6, padding: '0.1rem 0.5rem', cursor: 'pointer', fontWeight: 700, fontSize: '0.76rem' }}>{t('顯示折扣券', 'Show coupon')}</button></>}</span>
                    <span style={{ background: vb.bg, color: vb.fg, borderRadius: 999, padding: '0.05rem 0.55rem', fontSize: '0.74rem', fontWeight: 700 }}>{vb.text}</span>
                  </div>
                ); })}
              </div>
            </div>
          )}
        </div>
      ); })}

      {userEmail && eligibleOrgPlaces.length > 0 && (
        <div style={card} data-testid="pool-create">
          <h3 style={h3}>⛪ {t('建立愛心行動', 'Create a Love in Action project')}</h3>
          <div style={{ color: '#166534', fontSize: '0.82rem', lineHeight: 1.6, marginBottom: '0.3rem' }}>💵 {t('建立後，已取得勸募許可的機構可以在「我的愛心行動」加上現金捐款資訊（經文雨審核後公開）。', 'Once created, an organisation holding a fundraising permit can add cash donation details under “My Love in Action project” (published after VerseRain reviews them).')}</div>
          <div style={{ color: '#475569', fontSize: '0.88rem', lineHeight: 1.6 }}>{t('你的教會／機構已在地圖上，可以發起一個愛心專案，接受玩家投入點數，並在合作商家採購時折抵。', 'Your church / organisation is on the map, so it can open a charity project that receives players’ points and uses them as a discount when buying from participating shops.')}</div>
          <label style={label}>{t('教會／機構標記', 'Church / organisation marker')}</label>
          <select value={poolCreateDraft.orgPlaceId} onChange={e => setPoolCreateDraft(d => ({ ...d, orgPlaceId: e.target.value }))} style={field}>
            <option value="">{t('請選擇', 'Choose')}</option>
            {eligibleOrgPlaces.map(pl => <option key={pl.id} value={pl.id}>{pl.name}</option>)}
          </select>
          <div style={{ color: '#94a3b8', fontSize: '0.78rem', marginTop: 4 }}>{t('同一個教會／機構可以建立多個活動（最多 5 個進行中），各自有自己的額度與商家。', 'One church / organisation can run several projects (up to 5 open at once), each with its own allowance and shops.')}</div>
          <label style={label}>{t('專案名稱', 'Project name')}</label>
          <input type="text" maxLength={60} value={poolCreateDraft.name} onChange={e => setPoolCreateDraft(d => ({ ...d, name: e.target.value }))} placeholder={t('例如：偏鄉長輩愛筵池', 'e.g. Rural elders’ love-feast pool')} style={field} />
          <label style={label}>{t('用途說明', 'What it is for')}</label>
          <textarea maxLength={300} rows={3} value={poolCreateDraft.description} onChange={e => setPoolCreateDraft(d => ({ ...d, description: e.target.value }))} placeholder={t('例如：每月為 40 位偏鄉長輩辦一次愛筵，採購便當與麵包。', 'e.g. A monthly love feast for 40 rural elders: lunch boxes and bread.')} style={{ ...field, resize: 'vertical' }} />
          <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start', marginTop: '0.8rem', fontSize: '0.82rem', color: '#475569', lineHeight: 1.5 }}>
            <input type="checkbox" checked={poolCreateDraft.agree} onChange={e => setPoolCreateDraft(d => ({ ...d, agree: e.target.checked }))} style={{ marginTop: 3 }} />
            <span>{t('我確認本機構了解：折抵額度不可轉讓、不可兌現、不開立捐贈收據，僅供在合作商家折抵消費。', 'I confirm the organisation understands the allowance cannot be transferred or cashed out, no donation receipt is issued, and it is only usable as a discount at participating shops.')}</span>
          </label>
          <button type="button" disabled={poolCreateBusy || !poolCreateDraft.agree || !poolCreateDraft.orgPlaceId} onClick={createPool} style={{ marginTop: '0.8rem', background: (poolCreateDraft.agree && poolCreateDraft.orgPlaceId) ? '#e11d48' : '#e2e8f0', color: (poolCreateDraft.agree && poolCreateDraft.orgPlaceId) ? '#fff' : '#94a3b8', border: 'none', borderRadius: 8, padding: '0.5rem 1.1rem', cursor: poolCreateBusy ? 'wait' : 'pointer', fontWeight: 800 }}>{poolCreateBusy ? '…' : `❤️ ${t('送出審核', 'Submit for review')}`}</button>
        </div>
      )}
    </div>
  );
}
