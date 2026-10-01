// The 登記商家 (merchant) tab — moved out of App.jsx unchanged (UI/UX 第 4 階段).
import { Camera, Lock, Store } from 'lucide-react';
import { REFERRAL_CODE_RE, extractReferralCode } from '../lib/referralCode.js';
import React from 'react';
import VoucherScanner from '../VoucherScanner.jsx';
import { confirmDialog } from '../ui';
import { iosAppSupportsCamera, isInIosNativeApp } from '../lib/platform.js';
import { compactBtn } from '../lib/compactBtn.js';
import { isValidPlaceTaxId } from '../../api/_lib/places.js';


// The pin-drop map stays out of the initial bundle.
const PlacePinMap = React.lazy(() => import('../PlacePinMap'));

export default function MerchantPage({ t, cancelEditPlace, geocodeMerchant, handleMerchantPhoto, merchantBusy, merchantDraft, merchantFormRef, merchantGeoBusy, merchantPhotoBusy, merchantPhotoInputRef, merchantPhotoPreview, merchantReferrerLookup, merchantScanOpen, merchantSubmitStatus, myPlaceBusyId, myPlaces, ownerPlaceAction, placeLedger, placeLedgerOpen, redeemErrorText, renderMerchantPoolSection, sessionKey, setMainTab, setMerchantDraft, setMerchantScanOpen, setShowLoginModal, startEditPlace, submitMerchant, togglePlaceLedger, useMyLocationForMerchant, userEmail, voucherStatusBadge }) {
  const m = merchantDraft;
  const field = { width: '100%', boxSizing: 'border-box', padding: '0.5rem 0.7rem', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: '0.95rem', background: '#fff' };
  const label = { display: 'block', color: '#475569', fontSize: '0.82rem', fontWeight: 700, margin: '0.8rem 0 0.25rem' };
  const card = { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '1rem 1.2rem', marginBottom: '1rem' };
  const statusBadge = (st) => st === 'withdrawn' ? { text: t('已下架', 'Withdrawn'), bg: '#f1f5f9', fg: '#475569' } : st === 'approved' ? { text: t('已上地圖', 'On the map'), bg: '#dcfce7', fg: '#166534' } : st === 'rejected' ? { text: t('已退回', 'Rejected'), bg: '#fee2e2', fg: '#991b1b' } : st === 'hidden' ? { text: t('已隱藏', 'Hidden'), bg: '#e2e8f0', fg: '#334155' } : { text: t('審核中', 'Pending review'), bg: '#fef3c7', fg: '#92400e' };
  return (
    <div style={{ backgroundColor: '#fffdf7', borderRadius: '8px', border: '1px solid #fde68a', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.6rem', marginBottom: '0.8rem' }}>
        <h2 style={{ color: '#1e293b', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Store size={26} /> {t('登記商家／教會', 'Register a shop / church')}</h2>
        <button type="button" onClick={() => setMainTab('advanced')} style={{ background: 'transparent', border: '1px solid #cbd5e1', color: '#64748b', borderRadius: '6px', padding: '0.35rem 0.8rem', cursor: 'pointer', fontSize: '0.85rem' }}>← {t('返回', 'Back')}</button>
      </div>
      <p style={{ color: '#475569', lineHeight: 1.7, marginTop: 0 }}>
        {t('商家提供 5–20% 折扣，玩家用背經點數折抵（每 1,000 點折抵 NT$1；點數無現金價值、不可兌換現金），折扣由商家自行吸收，經文雨不經手款項。教會與機構可登記為贊助者標記。經管理員審核後就會出現在「誰在玩」地圖上。', 'Shops offer a 5–20% discount that players take with verse points (every 1,000 points takes NT$1 off; points have no cash value and cannot be cashed out); the shop absorbs the discount and VerseRain never handles money. Churches and organisations can register as sponsor markers. Markers appear on the map after admin review.')}
      </p>
      <p data-testid="merchant-points-notice" style={{ color: '#64748b', fontSize: '0.8rem', lineHeight: 1.6, marginTop: '-0.4rem' }}>{t('點數聲明：點數是遊戲內無償取得的促銷折抵權益，無現金價值、不可兌換現金、不可轉讓或轉售，亦非儲值或電子支付；折扣由商家自行提供，經文雨不經手任何款項。', 'About points: points are a free in-game promotional discount right with no cash value; they cannot be cashed out, transferred or resold, and are not stored value or e-payment. Discounts are offered by the shops themselves; VerseRain never handles money.')}</p>
      {!userEmail ? (
        <div style={{ textAlign: 'center', padding: '2rem 1rem', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
          <div style={{ marginBottom: '0.8rem', color: '#64748b' }}><Lock size={48} /></div>
          <div style={{ color: '#334155', marginBottom: '1rem' }}>{t('登入後即可登記', 'Sign in to register')}</div>
          <button type="button" onClick={() => setShowLoginModal('login')} style={{ background: '#3b82f6', color: '#fff', border: 'none', padding: '0.6rem 1.6rem', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }}>{t('登入', 'Sign in')}</button>
        </div>
      ) : (
        <>
          {!sessionKey && (
            <div style={{ background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 10, padding: '0.7rem 0.9rem', marginBottom: '1rem', color: '#78350f', fontSize: '0.9rem', display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <span>🔐 {t('你的登入早於這項功能上線，送出前請重新登入一次（表單內容會保留）。', 'You signed in before this feature launched — please sign in again before submitting (your form is kept).')}</span>
              <button type="button" onClick={() => setShowLoginModal('login')} style={{ background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 6, padding: '0.35rem 0.9rem', cursor: 'pointer', fontWeight: 700 }}>{t('重新登入', 'Sign in again')}</button>
            </div>
          )}
          <div style={card} ref={merchantFormRef}>
            {m.editing && (
              <div data-testid="place-edit-banner" style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, padding: '0.7rem 0.9rem', marginBottom: '0.9rem', color: '#1e3a8a', fontSize: '0.88rem', lineHeight: 1.5 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                  <b>✏️ {t('正在編輯「{name}」', 'Editing “{name}”').replace('{name}', String(m.editing.name || ''))}</b>
                  <button type="button" onClick={cancelEditPlace} style={{ background: 'transparent', border: '1px solid #93c5fd', color: '#1e3a8a', borderRadius: 6, padding: '0.25rem 0.8rem', cursor: 'pointer', fontWeight: 700, fontSize: '0.82rem' }}>{t('取消', 'Cancel')}</button>
                </div>
                <div style={{ marginTop: 4 }}>{t('電話、營業時間、網站、介紹、照片會立即更新；名稱、地址、位置、折扣、張數、類型改了會重新審核。', 'Phone, hours, website, description and photo update right away; changing name, address, location, discount, voucher count or type sends it back for review.')}</div>
              </div>
            )}
            {!m.editing && (
              <div data-testid="place-taiwan-only" style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 10, padding: '0.6rem 0.9rem', marginBottom: '0.6rem', color: '#075985', fontSize: '0.88rem', lineHeight: 1.5 }}>
                🇹🇼 {t('目前只開放台灣的商家、教會與機構登記；送出後，管理員會打電話或實地確認，通過後地圖上會顯示「✓ 已驗證」。', 'Registration is open to places in Taiwan only. After you submit, an admin confirms by phone or in person; verified places show “✓ Verified” on the map.')}
              </div>
            )}
            <label style={label}>{t('類型', 'Type')}</label>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {[['merchant', `🏪 ${t('商家', 'Shop')}`], ['church', `⛪ ${t('教會', 'Church')}`], ['org', `🏢 ${t('機構', 'Organisation')}`]].map(([k, lbl]) => (
                <button key={k} type="button" onClick={() => setMerchantDraft(d => ({ ...d, kind: k }))} style={{ padding: '0.4rem 0.9rem', borderRadius: 999, border: `2px solid ${m.kind === k ? '#d97706' : '#cbd5e1'}`, background: m.kind === k ? '#fef3c7' : '#fff', color: '#334155', cursor: 'pointer', fontWeight: 700 }}>{lbl}</button>
              ))}
            </div>
            <label style={label}>{t('名稱', 'Name')}</label>
            <input type="text" value={m.name} onChange={e => setMerchantDraft(d => ({ ...d, name: e.target.value }))} maxLength={60} style={field} />
            <label style={label}>{m.kind === 'merchant' ? t('統一編號（不公開，用來核對身分）', 'Business number 統一編號 (private, used to check who you are)') : t('統一編號或立案字號（不公開，用來核對身分）', '統一編號 or registration number (private, used to check who you are)')}</label>
            <input type="text" data-testid="place-tax-id" value={m.taxId || ''} onChange={e => setMerchantDraft(d => ({ ...d, taxId: e.target.value }))} maxLength={40} inputMode={m.kind === 'merchant' ? 'numeric' : 'text'} placeholder={m.kind === 'merchant' ? '12345678' : ''} style={field} />
            {String(m.taxId || '').trim() && !isValidPlaceTaxId(m.kind, m.taxId) && (
              <div role="alert" data-testid="place-tax-id-error" style={{ color: '#b91c1c', fontSize: '0.8rem', marginTop: -4, marginBottom: 6 }}>{redeemErrorText('tax_id_invalid')}</div>
            )}
            <label style={label}>{t('地址', 'Address')}</label>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <input type="text" value={m.address} onChange={e => setMerchantDraft(d => ({ ...d, address: e.target.value }))} maxLength={160} style={{ ...field, flex: '1 1 240px' }} />
              <button type="button" disabled={merchantGeoBusy || !m.address.trim()} onClick={geocodeMerchant} style={{ background: '#0d9488', color: '#fff', border: 'none', borderRadius: 8, padding: '0.5rem 0.9rem', cursor: 'pointer', fontWeight: 700 }}>{merchantGeoBusy ? '…' : `📍 ${t('定位', 'Locate')}`}</button>
              <button type="button" onClick={useMyLocationForMerchant} style={{ background: '#fff', color: '#334155', border: '1px solid #cbd5e1', borderRadius: 8, padding: '0.5rem 0.9rem', cursor: 'pointer' }}>{t('使用目前位置', 'Use my location')}</button>
            </div>
            {Number.isFinite(m.lat) && Number.isFinite(m.lng) && (
              <div style={{ marginTop: '0.6rem' }}>
                <div style={{ color: '#64748b', fontSize: '0.8rem', marginBottom: 4 }}>{t('拖曳大頭針或點地圖微調位置', 'Drag the pin or click the map to fine-tune')} · {m.lat}, {m.lng}</div>
                <React.Suspense fallback={<div style={{ height: 260, background: '#e2e8f0', borderRadius: 10 }} />}>
                  <PlacePinMap lat={m.lat} lng={m.lng} onChange={({ lat, lng }) => setMerchantDraft(d => ({ ...d, lat, lng }))} />
                </React.Suspense>
              </div>
            )}
            {m.kind === 'merchant' && (
              <>
                <label style={label}>{t('折扣（商家自行吸收）', 'Discount (absorbed by the shop)')}: <b style={{ color: '#92400e' }}>{m.discountPct}%</b></label>
                <input type="range" min={5} max={20} step={1} value={m.discountPct} onChange={e => setMerchantDraft(d => ({ ...d, discountPct: Number(e.target.value) }))} style={{ width: '100%' }} />
                <label style={label}>{t('同一位客人每天可使用張數（0 = 不限）', 'Coupons per customer per day (0 = unlimited)')}</label>
                <input type="number" min={0} max={20} step={1} value={m.dailyPerPerson ?? 3} onChange={e => setMerchantDraft(d => ({ ...d, dailyPerPerson: Math.max(0, Math.min(20, Math.floor(Number(e.target.value) || 0))) }))} style={{ ...field, width: 120 }} />
                <div style={{ color: '#64748b', fontSize: '0.8rem', marginTop: -4, marginBottom: 8 }}>{t('每張券最多折 NT$200，每位玩家每月最多 NT$500；預設 3 張可避免拆單。', 'Each voucher is capped at NT$200 and each player at NT$500 a month; the default of 3 discourages bill splitting.')}</div>
                <label style={label}>{t('介紹（≤300 字）', 'Description (≤300 chars)')}</label>
                <textarea value={m.description} onChange={e => setMerchantDraft(d => ({ ...d, description: e.target.value }))} maxLength={300} rows={3} style={field} />
              </>
            )}
            {m.kind !== 'merchant' && (
              <>
                <label style={label}>{t('祝福語或簡介（公開顯示，≤200 字）', 'Blessing or short intro (public, ≤200 chars)')}</label>
                <textarea value={m.message} onChange={e => setMerchantDraft(d => ({ ...d, message: e.target.value }))} maxLength={200} rows={3} style={field} />
              </>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.5rem' }}>
              <div><label style={label}>{t('營業時間', 'Hours')}</label><input type="text" value={m.hours} onChange={e => setMerchantDraft(d => ({ ...d, hours: e.target.value }))} maxLength={80} style={field} /></div>
              <div><label style={label}>{t('電話', 'Phone')}</label><input type="text" value={m.phone} onChange={e => setMerchantDraft(d => ({ ...d, phone: e.target.value }))} maxLength={30} style={field} /></div>
              <div><label style={label}>{t('網站（含 https://）', 'Website (with https://)')}</label><input type="url" value={m.website} onChange={e => setMerchantDraft(d => ({ ...d, website: e.target.value }))} maxLength={120} style={field} /></div>
            </div>
            <label style={label}>{t('照片（選填，≤300KB，會自動壓縮）', 'Photo (optional, ≤300KB, auto-compressed)')}</label>
            <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <button type="button" disabled={merchantPhotoBusy} onClick={() => merchantPhotoInputRef.current?.click()} style={{ background: '#fff', border: '1px solid #cbd5e1', borderRadius: 8, padding: '0.45rem 0.9rem', cursor: 'pointer', color: '#334155' }}>{merchantPhotoBusy ? t('上傳中…', 'Uploading…') : (m.photoAssetId ? t('更換照片', 'Replace photo') : t('選擇照片', 'Choose photo'))}</button>
              <input ref={merchantPhotoInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { handleMerchantPhoto(e.target.files?.[0]); e.target.value = ''; }} />
              {merchantPhotoPreview && <img src={merchantPhotoPreview} alt="" style={{ height: 70, borderRadius: 8, objectFit: 'cover' }} />}
              {!merchantPhotoPreview && m.photoAssetId && <span style={{ fontSize: '0.8rem', color: '#166534', background: '#dcfce7', borderRadius: 999, padding: '0.2rem 0.7rem' }}>📷 {t('已有照片', 'Photo on file')}</span>}
            </div>
            {!m.editing ? (() => {
              const refCode = String(m.referrerCode || '').trim();
              const refValid = REFERRAL_CODE_RE.test(refCode);
              const refName = refValid ? (merchantReferrerLookup.code === refCode ? merchantReferrerLookup.name : 'loading') : undefined;
              return (
                <div data-testid="place-referrer">
                  <label style={label}>🤝 {t('推薦者（選填）', 'Referrer (optional)')}</label>
                  <div style={{ color: '#64748b', fontSize: '0.8rem', lineHeight: 1.5, marginBottom: '0.35rem' }}>{t('掃描推薦者的 QR 分享碼，或輸入 10 碼推薦碼；之後每筆核銷，推薦者都會獲得顧客所用點數的 2.5% 作為獎勵。', 'Scan the referrer’s QR share code or type their 10-character code; on every redemption the referrer earns 2.5% of the points the customer used.')}</div>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <input type="text" value={m.referrerCode || ''} onChange={e => setMerchantDraft(d => ({ ...d, referrerCode: e.target.value.trim() }))} maxLength={10} placeholder="XXXXXXXXXX" autoCapitalize="off" autoCorrect="off" spellCheck={false} data-testid="place-referrer-input" style={{ ...field, width: 'auto', flex: '1 1 160px', fontFamily: 'monospace', letterSpacing: '1px' }} />
                    {!(isInIosNativeApp() && !iosAppSupportsCamera()) && (
                      <button type="button" onClick={() => setMerchantScanOpen(true)} style={{ background: '#0d9488', color: '#fff', border: 'none', borderRadius: 8, padding: '0.5rem 0.8rem', cursor: 'pointer', fontWeight: 700, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '0.35rem' }}><Camera size={16} /> {t('掃描推薦者 QR', 'Scan referrer QR')}</button>
                    )}
                  </div>
                  {refCode && !refValid ? <div style={{ color: '#b45309', fontSize: '0.8rem', marginTop: '0.3rem' }}>{t('推薦碼格式不正確，應為 10 個字母/數字。', 'Invalid format. Expected 10 letters/numbers.')}</div> : null}
                  {refName === 'loading' && <div style={{ color: '#94a3b8', fontSize: '0.8rem', marginTop: '0.3rem' }}>{t('載入中…', 'Loading…')}</div>}
                  {typeof refName === 'string' && refName !== 'loading' && <div data-testid="place-referrer-name" style={{ color: '#166534', fontSize: '0.85rem', marginTop: '0.3rem', fontWeight: 700 }}>✓ {t('推薦者：{name}', 'Referrer: {name}').replace('{name}', refName)}</div>}
                  {refName === null && <div style={{ color: '#b45309', fontSize: '0.8rem', marginTop: '0.3rem' }}>{t('找不到這個推薦碼', 'Referral code not found')}</div>}
                  {merchantScanOpen && (
                    <VoucherScanner t={t} extract={extractReferralCode} title={t('掃描推薦者 QR', 'Scan referrer QR')} hint={t('對準推薦者「分享」頁的 QR，掃到會自動帶入。', 'Point the camera at the QR on the referrer’s Share page; the code is filled in automatically.')} notMatchText={t('這不是推薦碼的 QR', 'That is not a referral QR')} onCode={(code) => { setMerchantDraft(d => ({ ...d, referrerCode: code })); setMerchantScanOpen(false); }} onClose={() => setMerchantScanOpen(false)} />
                  )}
                </div>
              );
            })() : (
              <div data-testid="place-referrer-locked" style={{ marginTop: '0.8rem', color: '#475569', fontSize: '0.85rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '0.5rem 0.8rem', lineHeight: 1.5 }}>
                🤝 {m.editing.referrerCode ? t('推薦者：{name}', 'Referrer: {name}').replace('{name}', m.editing.referrerName || m.editing.referrerCode) : t('（未填推薦者）', '(no referrer)')} <span style={{ color: '#94a3b8' }}>· {t('送出後只有管理員能修改推薦者', 'After submission only an admin can change the referrer')}</span>
              </div>
            )}
            <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginTop: '1rem', color: '#334155', fontSize: '0.88rem', lineHeight: 1.5 }}>
              <input type="checkbox" checked={!!m.agree} onChange={e => setMerchantDraft(d => ({ ...d, agree: e.target.checked }))} style={{ marginTop: 3 }} />
              <span>{t('我是這個商家／機構的負責人，或經負責人授權的代表；以上資料屬實並同意公開顯示。折扣由商家自行提供並吸收，經文雨不經手任何款項、不保證兌現，並保留審核與下架的權利。', 'I run this shop / organisation, or am authorised by the person who does; the details are accurate and may be shown publicly. Discounts are offered and absorbed by the shop; VerseRain never handles money, does not guarantee redemption, and may review or remove listings.')}</span>
            </label>
            <button type="button" disabled={merchantBusy} onClick={submitMerchant} style={{ marginTop: '0.9rem', background: '#d97706', color: '#fff', border: 'none', borderRadius: 10, padding: '0.65rem 1.4rem', cursor: 'pointer', fontWeight: 800, fontSize: '1rem' }}>{merchantBusy ? '…' : (m.editing ? t('儲存修改', 'Save changes') : t('送出審核', 'Submit for review'))}</button>
            {merchantSubmitStatus && (
              <div role="status" data-status={merchantSubmitStatus.type} style={{ marginTop: '0.7rem', padding: '0.65rem 0.9rem', borderRadius: 10, fontSize: '0.9rem', lineHeight: 1.5,
                background: merchantSubmitStatus.type === 'ok' ? '#dcfce7' : merchantSubmitStatus.type === 'login' ? '#fef3c7' : '#fee2e2',
                color: merchantSubmitStatus.type === 'ok' ? '#166534' : merchantSubmitStatus.type === 'login' ? '#78350f' : '#991b1b',
                border: `1px solid ${merchantSubmitStatus.type === 'ok' ? '#86efac' : merchantSubmitStatus.type === 'login' ? '#fde68a' : '#fecaca'}` }}>
                {merchantSubmitStatus.type === 'ok' ? '✅ ' : merchantSubmitStatus.type === 'login' ? '🔐 ' : '⚠️ '}{merchantSubmitStatus.text}
              </div>
            )}
          </div>
          <div style={card}>
            <h3 style={{ margin: '0 0 0.6rem', color: '#1e293b', fontSize: '1.05rem' }}>📋 {t('我的登記', 'My submissions')}</h3>
            {!myPlaces ? <div style={{ color: '#94a3b8' }}>{t('載入中…', 'Loading…')}</div> : myPlaces.length === 0 ? <div style={{ color: '#94a3b8', fontSize: '0.9rem' }}>{t('尚未登記', 'Nothing submitted yet')}</div> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {myPlaces.map(pl => { const b = statusBadge(pl.status); const led = placeLedger[pl.id]; const open = !!placeLedgerOpen[pl.id]; const canLedger = ['approved', 'withdrawn', 'hidden'].includes(pl.status) && pl.kind === 'merchant'; const busy = myPlaceBusyId === pl.id || merchantBusy; const ownerBtn = (bg, fg, border) => compactBtn(bg, fg, border, busy); return (
                  <div key={pl.id} style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: '0.5rem 0.8rem', fontSize: '0.9rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                      <div style={{ color: '#1e293b' }}><b>{pl.name}</b> <span style={{ color: '#64748b' }}>· {pl.kind === 'merchant' ? `-${pl.discountPct}%` : (pl.kind === 'church' ? t('教會', 'Church') : t('機構', 'Organisation'))} · {pl.address}</span></div>
                      <span style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', flexWrap: 'wrap' }}>
                        <button type="button" disabled={busy} onClick={() => startEditPlace(pl)} style={ownerBtn('transparent', '#334155', '1px solid #cbd5e1')}>
                          ✏️ {t('編輯', 'Edit')}
                        </button>
                        {pl.status === 'withdrawn' ? (
                          <button type="button" disabled={busy} onClick={() => ownerPlaceAction('relist', pl)} style={ownerBtn('#0d9488', '#fff', 'none')}>🔁 {t('重新上架', 'Re-list')}</button>
                        ) : ['pending', 'approved', 'hidden'].includes(pl.status) && (
                          <button type="button" disabled={busy} onClick={async () => { if (await confirmDialog({ title: t('下架「{name}」？', 'Withdraw “{name}”?').replace('{name}', pl.name || ''), message: t('會從地圖上移除；已發出的折扣券仍可核銷，之後可以重新上架。', 'It leaves the map; coupons already issued can still be used, and you can re-list it later.'), confirmLabel: t('下架', 'Withdraw') })) ownerPlaceAction('withdraw', pl); }} style={ownerBtn('transparent', '#475569', '1px solid #cbd5e1')}>
                            ⏸ {t('下架', 'Withdraw')}
                          </button>
                        )}
                        {!(pl.stats && Number(pl.stats.issued) > 0) && (
                          <button type="button" disabled={busy} onClick={async () => { if (await confirmDialog({ title: t('刪除「{name}」的登記？', 'Delete the listing “{name}”?').replace('{name}', pl.name || ''), message: t('這筆登記會被刪除，無法復原。', 'This listing will be deleted. This can’t be undone.'), confirmLabel: t('刪除', 'Delete'), danger: true })) ownerPlaceAction('owner_delete', pl); }} style={ownerBtn('transparent', '#b91c1c', '1px solid #fecaca')}>
                            🗑 {t('刪除', 'Delete')}
                          </button>
                        )}
                        {canLedger && <button type="button" onClick={() => togglePlaceLedger(pl.id)} style={{ background: open ? '#d97706' : '#fef3c7', color: open ? '#fff' : '#92400e', border: 'none', borderRadius: 6, padding: '0.2rem 0.7rem', cursor: 'pointer', fontWeight: 700, fontSize: '0.78rem' }}>📒 {t('收到的點數', 'Points received')}{pl.stats ? ` (${pl.stats.used || 0})` : ''}</button>}
                        <span style={{ background: b.bg, color: b.fg, borderRadius: 999, padding: '0.15rem 0.6rem', fontSize: '0.78rem', fontWeight: 700, whiteSpace: 'nowrap' }}>{b.text}</span>
                      </span>
                    </div>
                    {pl.referrerCode ? <div style={{ color: '#64748b', fontSize: '0.8rem', marginTop: '0.25rem' }}>🤝 {t('推薦者', 'Referrer')}：{pl.referrerName || pl.referrerCode}</div> : null}
                    {pl.kind === 'merchant' && pl.status === 'approved' ? renderMerchantPoolSection(pl) : null}
                    {canLedger && open && (
                      <div style={{ marginTop: '0.6rem', paddingTop: '0.6rem', borderTop: '1px dashed #e2e8f0' }}>
                        {!led || led.loading ? <div style={{ color: '#94a3b8' }}>{t('載入中…', 'Loading…')}</div> : led.error ? (
                          <div style={{ color: '#b45309', fontSize: '0.88rem' }}>{redeemErrorText(led.error)}{led.error === 'session_invalid' && <> <button type="button" onClick={() => setShowLoginModal('login')} style={{ background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 6, padding: '0.2rem 0.7rem', cursor: 'pointer', fontWeight: 700 }}>{t('重新登入', 'Sign in again')}</button></>}</div>
                        ) : (
                          <div>
                            <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', marginBottom: '0.5rem', fontSize: '0.86rem', color: '#334155' }}>
                              <span style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '0.3rem 0.7rem' }}>{t('已核銷 {n} 張', '{n} redeemed').replace('{n}', String(led.summary?.used || 0))} · {t('折抵合計', 'Total discount')} <b style={{ color: '#166534' }}>NT${led.summary?.usedNTD || 0}</b> · {Number(led.summary?.usedPoints || 0).toLocaleString()} {t('點', 'pts')}</span>
                              {(led.summary?.open || 0) > 0 && <span style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '0.3rem 0.7rem' }}>{t('尚未核銷 {n} 張', '{n} not yet used').replace('{n}', String(led.summary.open))}</span>}
                            </div>
                            <div style={{ color: '#64748b', fontSize: '0.78rem', marginBottom: '0.5rem' }}>{t('折抵金額由商家吸收，即為你的贊助；需要對帳可截圖此區。', 'The discount is absorbed by the shop — that is your sponsorship. Screenshot this section for your records.')}</div>
                            {(led.vouchers || []).filter(v => ['used', 'issued'].includes(v.computedStatus || v.status)).length === 0 ? (
                              <div style={{ color: '#94a3b8', fontSize: '0.86rem' }}>{t('還沒有顧客折抵', 'No customer discounts yet')}</div>
                            ) : (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', maxHeight: 280, overflowY: 'auto' }}>
                                {(led.vouchers || []).filter(v => ['used', 'issued'].includes(v.computedStatus || v.status)).map(v => { const st = v.computedStatus || v.status; const vb = voucherStatusBadge(st); return (
                                  <div key={v.code} style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', flexWrap: 'wrap', fontSize: '0.84rem', background: '#f8fafc', borderRadius: 6, padding: '0.3rem 0.6rem' }}>
                                    <span style={{ color: '#334155' }}>{new Date(v.usedAt || v.issuedAt).toLocaleString()} · <code>{v.formatted || v.code}</code> · {v.kind === 'pool' ? `❤️ ${v.poolName || v.holder}` : v.holder} · {t('消費 NT${b}', 'Bill NT${b}').replace('{b}', String(v.billNTD))} · <b style={{ color: '#166534' }}>NT${v.ntd}</b></span>
                                    <span style={{ background: vb.bg, color: vb.fg, borderRadius: 999, padding: '0.05rem 0.55rem', fontSize: '0.74rem', fontWeight: 700 }}>{vb.text}</span>
                                  </div>
                                ); })}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ); })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
