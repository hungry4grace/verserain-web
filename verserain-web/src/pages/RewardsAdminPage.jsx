// The rewards admin tab — moved out of App.jsx unchanged (UI/UX 第 4 階段).
import { Gift } from 'lucide-react';
import React from 'react';
import { CATALOG as VOUCHER_CATALOG } from '../../api/_lib/rewardCatalog.js';
import { confirmDialog } from '../ui';
import { compactBtn } from '../lib/compactBtn.js';


// The pin-drop map stays out of the initial bundle.
const PlacePinMap = React.lazy(() => import('../PlacePinMap'));

export default function RewardsAdminPage({ t, adminToken, cashOrgTypeLabel, cashStatusBadge, contestAdminAction, contestsAdmin, contestsAdminFilter, fmtMoney, isSuperAdmin, markReward, placeAdminAction, placeEdit, placesAdmin, placesAdminFilter, poolAdminAction, poolsAdmin, poolsAdminFilter, poolsFor, poolStatusBadge, rewardCurrency, rewardLabel, rewardNoteDraft, rewardsAdmin, rewardsAdminFilter, saveAdminToken, saveSponsorRecord, sendDraftFor, setContestsAdminFilter, setMainTab, setPlaceEdit, setPlacesAdminFilter, setPoolsAdminFilter, setRewardNoteDraft, setRewardsAdminFilter, setRewardsAdminReload, setSendField, setSponsorDraft, sponsorDraft, voucherAdminAction, voucherLabel, vouchersAdmin }) {
  return (
    <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.6rem', marginBottom: '1rem' }}>
        <h2 style={{ color: '#1e293b', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Gift size={26} /> {t('獎勵管理', 'Reward Admin')}</h2>
        <button type="button" onClick={() => setMainTab('advanced')} style={{ background: 'transparent', border: '1px solid #cbd5e1', color: '#64748b', borderRadius: '6px', padding: '0.35rem 0.8rem', cursor: 'pointer', fontSize: '0.85rem' }}>← {t('返回', 'Back')}</button>
      </div>
      {!isSuperAdmin ? (
        <div style={{ color: '#94a3b8', textAlign: 'center', padding: '2rem' }}>{t('僅限管理員', 'Admins only')}</div>
      ) : (() => {
        const all = rewardsAdmin?.rewards || [];
        const sponsors = rewardsAdmin?.sponsors || [];
        const pool = rewardsAdmin?.pool || { byCurrency: {}, bySponsor: {} };
        const isOpen = (r) => r.status !== 'sent' && r.status !== 'rejected';
        const pendingCount = all.filter(isOpen).length;
        const shown = all.filter(r => rewardsAdminFilter === 'all' ? true : rewardsAdminFilter === 'sent' ? r.status === 'sent' : rewardsAdminFilter === 'rejected' ? r.status === 'rejected' : isOpen(r));
        const statusBadge = (st) => st === 'sent'
          ? { text: t('已寄出', 'Sent'), bg: '#dcfce7', fg: '#166534' }
          : st === 'rejected'
            ? { text: t('無效', 'Invalid'), bg: '#fee2e2', fg: '#991b1b' }
            : st === 'claimed'
              ? { text: t('已登記 Email', 'Email confirmed'), bg: '#dbeafe', fg: '#1e40af' }
              : { text: t('待處理', 'Pending'), bg: '#fef3c7', fg: '#92400e' };
        const flagLabel = (f) => ({
          unverified: t('舊資料，未經伺服器核算', 'Legacy — not server-verified'),
          low_active_days: t('活躍天數少', 'Few active days'),
          young_account: t('新帳號', 'New account'),
          privaterelay_email: t('隱藏信箱帳號', 'Hidden-email account'),
          referee_cluster: t('多位推薦人同日註冊', 'Several referees signed up the same day'),
        })[f] || f;
        const inputStyle = { padding: '0.4rem 0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', background: '#fff' };
        const smallBtn = compactBtn;
        const todayIso = new Date().toLocaleDateString('en-CA');
        return (
          <div>
            <p style={{ color: '#64748b', fontSize: '0.9rem', marginTop: 0, lineHeight: 1.6 }}>
              {t('玩家經伺服器核算通過 100 個經文、或邀請的 10 位朋友各通過 3 節時，會出現在這裡。核對下方的核算資料與標記後，寄出禮券並選擇扣款的贊助池。', 'Players appear here when the server verifies 100 passed verses, or 10 invited friends who each passed 3. Review the verification data and flags, send the voucher, and pick the sponsor pool to debit.')}
            </p>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap', marginBottom: '1rem', background: rewardsAdmin?.error === 'token' ? '#fef2f2' : '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '0.6rem 0.8rem' }}>
              <span style={{ fontSize: '0.85rem', color: '#475569' }}>🔑 {t('管理員密鑰', 'Admin token')}</span>
              <input type="password" value={adminToken} onChange={e => saveAdminToken(e.target.value)} placeholder="ADMIN_TOKEN" autoComplete="off" style={{ ...inputStyle, flex: '1 1 200px' }} />
              <button type="button" onClick={() => setRewardsAdminReload(n => n + 1)} style={smallBtn('#e2e8f0', '#334155')}>{t('重新載入', 'Reload')}</button>
              {rewardsAdmin?.error === 'token' && <span style={{ color: '#ef4444', fontSize: '0.8rem' }}>{t('密鑰錯誤或未填', 'Token missing or wrong')}</span>}
            </div>

            {/* 贊助池 */}
            <div style={{ border: '1px solid #fde68a', background: '#fffbeb', borderRadius: 10, padding: '0.9rem 1rem', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                <b style={{ color: '#92400e' }}>💰 {t('贊助池', 'Sponsor pool')}</b>
                <button type="button" onClick={() => setSponsorDraft({ displayName: '', amount: '', currency: 'TWD', region: 'tw', anonymous: false, showAmount: true, message: '', receivedAt: todayIso, note: '', scope: 'open', churchCode: '', churchName: '' })} style={smallBtn('#f59e0b')}>＋ {t('新增贊助紀錄', 'Add sponsor')}</button>
              </div>
              <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', marginTop: '0.6rem' }}>
                {Object.entries(pool.byCurrency || {}).length === 0 && <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>{t('尚無贊助紀錄', 'No sponsors recorded yet')}</span>}
                {Object.entries(pool.byCurrency || {}).map(([cur, st]) => (
                  <div key={cur} style={{ background: '#fff', border: '1px solid #fde68a', borderRadius: 8, padding: '0.5rem 0.8rem', fontSize: '0.85rem', color: '#334155' }}>
                    <b>{cur}</b> · {t('累計贊助', 'Raised')} {fmtMoney(st.raised, cur)} · {t('已發出 {n} 份', '{n} sent').replace('{n}', String(st.sentCount))} {fmtMoney(st.sentValue, cur)} · {t('待處理 {n} 份', '{n} pending').replace('{n}', String(st.pendingCount))} · <b style={{ color: st.remaining > 0 ? '#166534' : '#991b1b' }}>{t('剩餘', 'Remaining')} {fmtMoney(st.remaining, cur)}</b>
                  </div>
                ))}
              </div>
              {sponsorDraft && (
                <div style={{ marginTop: '0.8rem', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: '0.8rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.5rem' }}>
                  <input type="text" value={sponsorDraft.displayName} onChange={e => setSponsorDraft(d => ({ ...d, displayName: e.target.value }))} placeholder={t('贊助者名稱（教會／公司／個人）', 'Sponsor name (church / company / person)')} maxLength={60} style={inputStyle} />
                  <input type="number" min={1} value={sponsorDraft.amount} onChange={e => setSponsorDraft(d => ({ ...d, amount: e.target.value }))} placeholder={t('金額', 'Amount')} style={inputStyle} />
                  <select value={sponsorDraft.currency} onChange={e => setSponsorDraft(d => ({ ...d, currency: e.target.value, region: e.target.value === 'USD' ? 'intl' : 'tw' }))} style={inputStyle}>
                    <option value="TWD">TWD（{t('台灣', 'Taiwan')}）</option>
                    <option value="USD">USD（{t('海外', 'Overseas')}）</option>
                  </select>
                  <input type="date" value={sponsorDraft.receivedAt} onChange={e => setSponsorDraft(d => ({ ...d, receivedAt: e.target.value }))} style={inputStyle} />
                  <select value={sponsorDraft.scope || 'open'} onChange={e => setSponsorDraft(d => ({ ...d, scope: e.target.value }))} style={inputStyle}>
                    <option value="open">{t('開放池：所有達標者', 'Open pool: anyone who qualifies')}</option>
                    <option value="church">{t('教會限定：只給該教會會友', 'Church-only: that church’s members')}</option>
                  </select>
                  {(sponsorDraft.scope === 'church') && (
                    <>
                      <input type="text" value={sponsorDraft.churchCode || ''} onChange={e => setSponsorDraft(d => ({ ...d, churchCode: e.target.value.toUpperCase() }))} placeholder={t('教會代碼（給會友輸入，如 GRACE-TPE）', 'Church code (members enter it, e.g. GRACE-TPE)')} maxLength={20} style={inputStyle} />
                      <input type="text" value={sponsorDraft.churchName || ''} onChange={e => setSponsorDraft(d => ({ ...d, churchName: e.target.value }))} placeholder={t('教會名稱（公開顯示）', 'Church name (shown publicly)')} maxLength={60} style={inputStyle} />
                    </>
                  )}
                  <input type="text" value={sponsorDraft.message} onChange={e => setSponsorDraft(d => ({ ...d, message: e.target.value }))} placeholder={t('祝福語或經文（公開顯示）', 'Blessing or verse (shown publicly)')} maxLength={200} style={{ ...inputStyle, gridColumn: '1 / -1' }} />
                  <input type="text" value={sponsorDraft.note} onChange={e => setSponsorDraft(d => ({ ...d, note: e.target.value }))} placeholder={t('內部備註（收據編號等，不公開）', 'Internal note (receipt no. etc., private)')} maxLength={200} style={{ ...inputStyle, gridColumn: '1 / -1' }} />
                  <label style={{ fontSize: '0.85rem', color: '#334155', display: 'flex', gap: 6, alignItems: 'center' }}><input type="checkbox" checked={!!sponsorDraft.anonymous} onChange={e => setSponsorDraft(d => ({ ...d, anonymous: e.target.checked }))} /> {t('匿名（不公開名稱）', 'Anonymous (hide name)')}</label>
                  <label style={{ fontSize: '0.85rem', color: '#334155', display: 'flex', gap: 6, alignItems: 'center' }}><input type="checkbox" checked={!!sponsorDraft.showAmount} onChange={e => setSponsorDraft(d => ({ ...d, showAmount: e.target.checked }))} /> {t('公開金額', 'Show amount publicly')}</label>
                  <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '0.5rem' }}>
                    <button type="button" onClick={() => saveSponsorRecord(sponsorDraft)} style={smallBtn('#10b981')}>{t('儲存', 'Save')}</button>
                    <button type="button" onClick={() => setSponsorDraft(null)} style={smallBtn('transparent', '#64748b', '1px solid #cbd5e1')}>{t('取消', 'Cancel')}</button>
                  </div>
                </div>
              )}
              {sponsors.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.8rem' }}>
                  {sponsors.map(sp => (
                    <div key={sp.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: '0.5rem 0.8rem', fontSize: '0.85rem', opacity: sp.active === false ? 0.55 : 1 }}>
                      <div style={{ minWidth: 0 }}>
                        <b style={{ color: '#1e293b' }}>{sp.displayName}</b>{sp.anonymous ? <span style={{ color: '#94a3b8' }}> · {t('匿名', 'anonymous')}</span> : null}
                        {sp.scope === 'church' ? <span style={{ background: '#ede9fe', color: '#5b21b6', borderRadius: 999, padding: '0.05rem 0.5rem', fontSize: '0.75rem', marginLeft: 6 }}>⛪ {sp.churchName || sp.displayName} · {sp.churchCode}</span> : null}
                        <span style={{ color: '#475569' }}> · {fmtMoney(sp.amount, sp.currency)} · {sp.receivedAt}</span>
                        {pool.bySponsor && pool.bySponsor[sp.id] ? <span style={{ color: '#166534' }}> · {t('剩餘', 'Remaining')} {fmtMoney(pool.bySponsor[sp.id].remaining, sp.currency)}</span> : null}
                        {sp.message ? <div style={{ color: '#64748b', fontSize: '0.8rem' }}>「{sp.message}」</div> : null}
                        {sp.note ? <div style={{ color: '#94a3b8', fontSize: '0.78rem' }}>🔒 {sp.note}</div> : null}
                      </div>
                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        <button type="button" onClick={() => setSponsorDraft({ ...sp })} style={smallBtn('transparent', '#334155', '1px solid #cbd5e1')}>{t('編輯', 'Edit')}</button>
                        <button type="button" onClick={() => setPlaceEdit({ isNew: true, kind: sp.scope === 'church' ? 'church' : 'org', name: sp.churchName || sp.displayName, address: '', lat: 23.7, lng: 121, discountPct: 0, description: '', message: sp.message || '', phone: '', website: '', hours: '', dailyCapNTD: 2000, note: '', sponsorId: sp.id })} style={smallBtn('transparent', '#5b21b6', '1px solid #ddd6fe')}>＋ {t('地圖標記', 'Map marker')}</button>
                        <button type="button" onClick={() => saveSponsorRecord(sp, sp.active === false ? 'activate' : 'deactivate')} style={smallBtn('transparent', '#64748b', '1px solid #cbd5e1')}>{sp.active === false ? t('啟用', 'Activate') : t('停用', 'Deactivate')}</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 地圖標記審核（商家／教會／機構）+ 折扣券 */}
            {(() => {
              const all = placesAdmin || [];
              const shown = all.filter(pl => placesAdminFilter === 'all' ? true : pl.status === placesAdminFilter);
              const counts = { withdrawn: all.filter(p => p.status === 'withdrawn').length, pending: all.filter(p => p.status === 'pending').length, approved: all.filter(p => p.status === 'approved').length, hidden: all.filter(p => p.status === 'hidden').length, rejected: all.filter(p => p.status === 'rejected').length };
              const inputStyle = { padding: '0.4rem 0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', background: '#fff' };
              const smallBtn = compactBtn;
              const kindLabel = (k) => k === 'merchant' ? `🏪 ${t('商家', 'Shop')}` : k === 'church' ? `⛪ ${t('教會', 'Church')}` : `🏢 ${t('機構', 'Organisation')}`;
              const verifyMethodLabel = (mth) => mth === 'phone' ? t('已電話確認', 'Confirmed by phone') : mth === 'visit' ? t('已實地確認', 'Confirmed in person') : mth === 'known' ? t('熟識', 'Known to us') : '';
              const ed = placeEdit;
              return (
                <div style={{ border: '1px solid #ddd6fe', background: '#faf5ff', borderRadius: 10, padding: '0.9rem 1rem', marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <b style={{ color: '#5b21b6' }}>🗺️ {t('地圖標記（商家／教會／機構）', 'Map markers (shops / churches / orgs)')}</b>
                    <button type="button" onClick={() => setPlaceEdit({ isNew: true, kind: 'church', name: '', address: '', lat: 23.7, lng: 121, discountPct: 0, description: '', message: '', phone: '', website: '', hours: '', dailyCapNTD: 2000, note: '', sponsorId: '', referrerCode: '' })} style={smallBtn('#7c3aed')}>＋ {t('新增教會／機構標記', 'Add church / org marker')}</button>
                  </div>
                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', margin: '0.6rem 0' }}>
                    {[['pending', t('待審核', 'Pending')], ['approved', t('已上地圖', 'On the map')], ['hidden', t('已隱藏', 'Hidden')], ['rejected', t('已退回', 'Rejected')], ['withdrawn', t('已下架', 'Withdrawn')], ['all', t('全部', 'All')]].map(([id, lbl]) => (
                      <button key={id} type="button" onClick={() => setPlacesAdminFilter(id)} style={{ padding: '0.3rem 0.8rem', borderRadius: 20, border: 'none', background: placesAdminFilter === id ? '#7c3aed' : '#ede9fe', color: placesAdminFilter === id ? '#fff' : '#4c1d95', cursor: 'pointer', fontWeight: 600, fontSize: '0.82rem' }}>{lbl}{id !== 'all' ? ` (${counts[id]})` : ` (${all.length})`}</button>
                    ))}
                  </div>
                  {ed && (
                    <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: '0.8rem', marginBottom: '0.8rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.5rem' }}>
                      <select value={ed.kind} onChange={e => setPlaceEdit(d => ({ ...d, kind: e.target.value }))} style={inputStyle}><option value="merchant">{t('商家', 'Shop')}</option><option value="church">{t('教會', 'Church')}</option><option value="org">{t('機構', 'Organisation')}</option></select>
                      <input type="text" value={ed.name} onChange={e => setPlaceEdit(d => ({ ...d, name: e.target.value }))} placeholder={t('名稱', 'Name')} style={inputStyle} />
                      <input type="text" value={ed.address} onChange={e => setPlaceEdit(d => ({ ...d, address: e.target.value }))} placeholder={t('地址', 'Address')} style={{ ...inputStyle, gridColumn: '1 / -1' }} />
                      <input type="number" step="0.00001" value={ed.lat} onChange={e => setPlaceEdit(d => ({ ...d, lat: Number(e.target.value) }))} placeholder="lat" style={inputStyle} />
                      <input type="number" step="0.00001" value={ed.lng} onChange={e => setPlaceEdit(d => ({ ...d, lng: Number(e.target.value) }))} placeholder="lng" style={inputStyle} />
                      {ed.kind === 'merchant' && <input type="number" min={5} max={20} value={ed.discountPct} onChange={e => setPlaceEdit(d => ({ ...d, discountPct: Number(e.target.value) }))} placeholder={t('折扣 %', 'Discount %')} style={inputStyle} />}
                      <input type="number" min={1} value={ed.dailyCapNTD} onChange={e => setPlaceEdit(d => ({ ...d, dailyCapNTD: Number(e.target.value) }))} placeholder={t('每日折抵上限 NT$', 'Daily cap NT$')} style={inputStyle} />
                      {ed.kind === 'merchant' && <input type="number" min={0} max={20} value={ed.dailyPerPerson ?? 3} onChange={e => setPlaceEdit(d => ({ ...d, dailyPerPerson: Number(e.target.value) }))} placeholder={t('每人每天張數（0=不限）', 'Per person per day (0 = unlimited)')} title={t('同一位客人每天可使用張數（0 = 不限）', 'Coupons per customer per day (0 = unlimited)')} style={inputStyle} />}
                      <select value={ed.sponsorId || ''} onChange={e => setPlaceEdit(d => ({ ...d, sponsorId: e.target.value }))} style={inputStyle}><option value="">{t('（不連結贊助紀錄）', '(no sponsor record)')}</option>{(rewardsAdmin?.sponsors || []).map(sp => <option key={sp.id} value={sp.id}>{sp.displayName}</option>)}</select>
                      <input type="text" value={ed.referrerCode || ''} onChange={e => setPlaceEdit(d => ({ ...d, referrerCode: e.target.value.trim() }))} maxLength={10} placeholder={t('推薦者推薦碼（10 碼，留空 = 無）', 'Referrer code (10 chars, blank = none)')} title={ed.referrerName ? `🤝 ${ed.referrerName}` : ''} autoCapitalize="off" spellCheck={false} style={inputStyle} />
                      <textarea value={ed.kind === 'merchant' ? ed.description : ed.message} onChange={e => setPlaceEdit(d => ({ ...d, [ed.kind === 'merchant' ? 'description' : 'message']: e.target.value }))} placeholder={ed.kind === 'merchant' ? t('介紹', 'Description') : t('祝福語或簡介', 'Blessing or intro')} rows={2} style={{ ...inputStyle, gridColumn: '1 / -1' }} />
                      <input type="text" value={ed.hours || ''} onChange={e => setPlaceEdit(d => ({ ...d, hours: e.target.value }))} placeholder={t('營業時間', 'Hours')} style={inputStyle} />
                      <input type="text" value={ed.phone || ''} onChange={e => setPlaceEdit(d => ({ ...d, phone: e.target.value }))} placeholder={t('電話', 'Phone')} style={inputStyle} />
                      <input type="text" value={ed.taxId || ''} onChange={e => setPlaceEdit(d => ({ ...d, taxId: e.target.value }))} placeholder={t('統一編號／立案字號', '統一編號 / registration no.')} style={inputStyle} />
                      <input type="text" value={ed.website || ''} onChange={e => setPlaceEdit(d => ({ ...d, website: e.target.value }))} placeholder="https://" style={inputStyle} />
                      <input type="text" value={ed.note || ''} onChange={e => setPlaceEdit(d => ({ ...d, note: e.target.value }))} placeholder={t('內部備註', 'Internal note')} style={{ ...inputStyle, gridColumn: '1 / -1' }} />
                      <div style={{ gridColumn: '1 / -1' }}>
                        <React.Suspense fallback={null}>{Number.isFinite(ed.lat) && Number.isFinite(ed.lng) && <PlacePinMap lat={ed.lat} lng={ed.lng} zoom={ed.isNew ? 7 : 15} height={220} onChange={({ lat, lng }) => setPlaceEdit(d => ({ ...d, lat, lng }))} />}</React.Suspense>
                      </div>
                      <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '0.5rem' }}>
                        <button type="button" onClick={() => { const { isNew, id, status, ownerEmail, ownerCode, createdAt, updatedAt, approvedAt, approvedBy, stats, referrerName, ...fields } = ed; void status; void ownerEmail; void ownerCode; void createdAt; void updatedAt; void approvedAt; void approvedBy; void stats; void referrerName; if (isNew) placeAdminAction('create', { place: fields }); else placeAdminAction('update', { placeId: id, patch: fields }); }} style={smallBtn('#10b981')}>{t('儲存', 'Save')}</button>
                        <button type="button" onClick={() => setPlaceEdit(null)} style={smallBtn('transparent', '#64748b', '1px solid #cbd5e1')}>{t('取消', 'Cancel')}</button>
                      </div>
                    </div>
                  )}
                  {placesAdmin === null ? <div style={{ color: '#94a3b8', fontSize: '0.85rem' }}>{t('載入中…', 'Loading…')}</div> : shown.length === 0 ? <div style={{ color: '#94a3b8', fontSize: '0.85rem' }}>{t('目前沒有項目', 'Nothing here yet')}</div> : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {shown.map(pl => (
                        <div key={pl.id} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: '0.6rem 0.8rem', fontSize: '0.85rem', display: 'flex', justifyContent: 'space-between', gap: '0.6rem', flexWrap: 'wrap' }}>
                          <div style={{ minWidth: 0 }}>
                            <div><b style={{ color: '#1e293b' }}>{pl.name}</b> <span style={{ color: '#64748b' }}>· {kindLabel(pl.kind)}{pl.kind === 'merchant' ? ` · -${pl.discountPct}%` : ''}</span>{pl.verifiedAt && <span data-testid="admin-place-verified" style={{ marginLeft: 6, background: '#dcfce7', color: '#166534', border: '1px solid #86efac', borderRadius: 999, padding: '0 8px', fontSize: '0.75rem', fontWeight: 700 }}>✓ {t('已驗證', 'Verified')}（{verifyMethodLabel(pl.verifyMethod)}）</span>}</div>
                            <div style={{ color: '#475569', fontSize: '0.8rem' }}>
                              🧾 {pl.taxId ? <>{t('統一編號／立案字號', '統一編號 / registration no.')}：<b>{pl.taxId}</b>{/^\d{8}$/.test(pl.taxId) && <> · <a href="https://findbiz.nat.gov.tw/" target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb' }}>{t('到商工登記查詢', 'Look it up (findbiz)')}</a></>}</> : <span style={{ color: '#b45309' }}>{t('未提供統一編號', 'No business number given')}</span>}
                              {pl.phone && <> · ☎️ {pl.phone}</>}
                              {pl.declaredAt && <span style={{ color: '#94a3b8' }}> · {t('已聲明為負責人', 'Declared as the person in charge')} {new Date(pl.declaredAt).toLocaleDateString()}</span>}
                            </div>
                            <div style={{ color: '#64748b' }}>📍 {pl.address} <span style={{ color: '#94a3b8' }}>({pl.lat}, {pl.lng})</span></div>
                            <div style={{ color: '#94a3b8', fontSize: '0.78rem' }}>{pl.ownerEmail} · {new Date(pl.createdAt).toLocaleDateString()}{pl.stats ? ` · ${t('已發 {a} 張／已用 {b} 張／NT${c}', '{a} issued / {b} used / NT${c}').replace('{a}', String(pl.stats.issued || 0)).replace('{b}', String(pl.stats.used || 0)).replace('{c}', String(pl.stats.usedNTD || 0))}` : ''}{pl.note ? ` · 🔒 ${pl.note}` : ''}{pl.referrerCode ? ` · 🤝 ${pl.referrerName || pl.referrerCode}` : ''}</div>
                            {(pl.description || pl.message) && <div style={{ color: '#475569', fontSize: '0.8rem' }}>{pl.description || pl.message}</div>}
                          </div>
                          <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>
                            {!['approved', 'withdrawn'].includes(pl.status) && <button type="button" onClick={() => placeAdminAction('approve', { placeId: pl.id })} style={smallBtn('#10b981')}>✅ {t('核准', 'Approve')}</button>}
                            {pl.status === 'approved' && <button type="button" onClick={() => placeAdminAction('hide', { placeId: pl.id })} style={smallBtn('transparent', '#64748b', '1px solid #cbd5e1')}>{t('隱藏', 'Hide')}</button>}
                            {pl.status === 'hidden' && <button type="button" onClick={() => placeAdminAction('unhide', { placeId: pl.id })} style={smallBtn('transparent', '#64748b', '1px solid #cbd5e1')}>{t('恢復', 'Restore')}</button>}
                            {pl.status === 'pending' && <button type="button" onClick={() => placeAdminAction('reject', { placeId: pl.id })} style={smallBtn('transparent', '#991b1b', '1px solid #fecaca')}>{t('退回', 'Reject')}</button>}
                            {!pl.verifiedAt ? (
                              <select data-testid="admin-place-verify" value="" onChange={e => { if (e.target.value) placeAdminAction('verify', { placeId: pl.id, patch: { method: e.target.value } }); }} style={{ ...smallBtn('transparent', '#166534', '1px solid #86efac'), cursor: 'pointer' }}>
                                <option value="">✓ {t('標記已驗證…', 'Mark verified…')}</option>
                                <option value="phone">{verifyMethodLabel('phone')}</option>
                                <option value="visit">{verifyMethodLabel('visit')}</option>
                                <option value="known">{verifyMethodLabel('known')}</option>
                              </select>
                            ) : (
                              <button type="button" onClick={() => placeAdminAction('unverify', { placeId: pl.id })} style={smallBtn('transparent', '#64748b', '1px solid #cbd5e1')}>{t('取消驗證', 'Unverify')}</button>
                            )}
                            <button type="button" onClick={() => setPlaceEdit({ ...pl })} style={smallBtn('transparent', '#334155', '1px solid #cbd5e1')}>{t('編輯', 'Edit')}</button>
                            {['rejected', 'hidden', 'withdrawn'].includes(pl.status) && <button type="button" onClick={async () => { if (await confirmDialog({ message: t('確定刪除？', 'Delete?'), confirmLabel: t('刪除', 'Delete'), danger: true })) placeAdminAction('delete', { placeId: pl.id }); }} style={smallBtn('transparent', '#991b1b', '1px solid #fecaca')}>{t('刪除', 'Delete')}</button>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <div style={{ marginTop: '0.9rem', paddingTop: '0.7rem', borderTop: '1px dashed #ddd6fe' }}>
                    <b style={{ color: '#5b21b6' }}>🎟️ {t('最近折扣券', 'Recent coupons')}</b>
                    {!vouchersAdmin ? <div style={{ color: '#94a3b8', fontSize: '0.85rem' }}>{t('載入中…', 'Loading…')}</div> : vouchersAdmin.length === 0 ? <div style={{ color: '#94a3b8', fontSize: '0.85rem' }}>{t('目前沒有項目', 'Nothing here yet')}</div> : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', marginTop: '0.4rem', maxHeight: 320, overflowY: 'auto' }}>
                        {vouchersAdmin.slice(0, 100).map(v => { const st = v.computedStatus || v.status; return (
                          <div key={v.code} style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', flexWrap: 'wrap', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 6, padding: '0.35rem 0.6rem', fontSize: '0.8rem' }}>
                            <span>{v.kind === 'pool' ? '❤️ ' : ''}<code>{v.code}</code> · {v.placeName} · NT${v.ntd} · {v.kind === 'pool' ? v.poolName : v.playerName} · <b>{st}</b> · {new Date(v.issuedAt).toLocaleString()}</span>
                            <span style={{ display: 'flex', gap: '0.3rem' }}>
                              {(st === 'issued' || st === 'used') && <button type="button" onClick={async () => { if (await confirmDialog({ message: v.kind === 'pool' ? t('作廢並退回折抵額度？', 'Void and return the allowance?') : t('作廢並退還點數？', 'Void and refund points?'), confirmLabel: t('作廢', 'Void'), danger: true })) voucherAdminAction(v.code, 'void'); }} style={smallBtn('transparent', '#991b1b', '1px solid #fecaca')}>{t('作廢', 'Void')}</button>}
                              {st === 'void' && <button type="button" onClick={() => voucherAdminAction(v.code, 'restore')} style={smallBtn('transparent', '#64748b', '1px solid #cbd5e1')}>{t('恢復', 'Restore')}</button>}
                            </span>
                          </div>
                        ); })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* 愛心行動審核 */}
            {(() => {
              const all = poolsAdmin || [];
              const cashPending = (p) => p.cashAppeal?.status === 'pending';
              const shown = all.filter(p => poolsAdminFilter === 'all' ? true : poolsAdminFilter === 'pending' ? (p.status === 'pending' || cashPending(p)) : p.status === poolsAdminFilter);
              const counts = { pending: all.filter(p => p.status === 'pending' || cashPending(p)).length, approved: all.filter(p => p.status === 'approved').length, closed: all.filter(p => p.status === 'closed').length, rejected: all.filter(p => p.status === 'rejected').length };
              const smallBtn = compactBtn;
              return (
                <div data-testid="admin-pools" style={{ border: '1px solid #fecdd3', background: '#fff1f2', borderRadius: 10, padding: '0.9rem 1rem', marginBottom: '1rem' }}>
                  <b style={{ color: '#be123c' }}>❤️ {t('愛心行動', 'Love in Action')}</b>
                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', margin: '0.6rem 0' }}>
                    {[['pending', t('待審核', 'Pending')], ['approved', t('進行中', 'Open')], ['closed', t('已關閉', 'Closed')], ['rejected', t('已退回', 'Rejected')], ['all', t('全部', 'All')]].map(([id, lab]) => (
                      <button key={id} type="button" onClick={() => setPoolsAdminFilter(id)} style={{ padding: '0.3rem 0.8rem', borderRadius: 20, border: 'none', background: poolsAdminFilter === id ? '#be123c' : '#fecdd3', color: poolsAdminFilter === id ? '#fff' : '#9f1239', fontWeight: 700, cursor: 'pointer', fontSize: '0.8rem' }}>{lab}{id !== 'all' ? ` (${counts[id]})` : ''}</button>
                    ))}
                  </div>
                  {!poolsAdmin ? <div style={{ color: '#94a3b8', fontSize: '0.85rem' }}>{t('載入中…', 'Loading…')}</div> : shown.length === 0 ? <div style={{ color: '#94a3b8', fontSize: '0.85rem' }}>{t('目前沒有項目', 'Nothing here yet')}</div> : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                      {shown.map(p => { const c = p.counters || {}; const b = poolStatusBadge(p.status); return (
                        <div key={p.id} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: '0.5rem 0.7rem', fontSize: '0.85rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                            <span><b>❤️ {p.name}</b> · ⛪ {p.orgPlaceName} <span style={{ background: b.bg, color: b.fg, borderRadius: 999, padding: '0.05rem 0.5rem', fontSize: '0.74rem', fontWeight: 700 }}>{b.text}</span></span>
                            <span style={{ display: 'flex', gap: '0.3rem' }}>
                              {(p.status === 'pending' || p.status === 'closed') && <button type="button" onClick={() => poolAdminAction('approve', p.id)} style={smallBtn('#16a34a')}>✅ {t('核准', 'Approve')}</button>}
                              {p.status === 'pending' && <button type="button" onClick={() => poolAdminAction('reject', p.id)} style={smallBtn('transparent', '#991b1b', '1px solid #fecaca')}>{t('退回', 'Reject')}</button>}
                              {p.status === 'approved' && <button type="button" onClick={() => poolAdminAction('close', p.id)} style={smallBtn('transparent', '#64748b', '1px solid #cbd5e1')}>{t('關閉', 'Close')}</button>}
                            </span>
                          </div>
                          <div style={{ color: '#94a3b8', fontSize: '0.78rem' }}>{p.ownerEmail} · {new Date(p.createdAt).toLocaleDateString()} · {t('已投入 NT${a} · 可用折抵額度 NT${b} · {n} 位參與 · 已折抵 NT${c}', 'NT${a} contributed · NT${b} allowance left · {n} participants · NT${c} used').replace('{a}', String(c.contributedNTD || 0)).replace('{b}', String(c.allowanceNTD || 0)).replace('{n}', String(c.contributors || 0)).replace('{c}', '—')} · 🏪 {Object.keys(p.merchants || {}).length}</div>
                          {p.description ? <div style={{ color: '#475569', fontSize: '0.8rem', marginTop: 2 }}>{p.description}</div> : null}
                          {p.cashAppeal ? (() => { const ca = p.cashAppeal; const cb = cashStatusBadge(ca.status); return (
                            <div data-testid="admin-pool-cash" style={{ marginTop: '0.45rem', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '0.5rem 0.65rem', color: '#14532d', lineHeight: 1.6 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
                                <b>💵 {t('現金捐款資訊', 'Cash donation details')} <span style={{ background: cb.bg, color: cb.fg, borderRadius: 999, padding: '0.05rem 0.5rem', fontSize: '0.74rem', fontWeight: 700 }}>{cb.text}</span></b>
                                <span style={{ display: 'flex', gap: '0.3rem' }}>
                                  {ca.status !== 'verified' && <button type="button" onClick={() => poolAdminAction('cash_verify', p.id)} style={smallBtn('#16a34a')}>✅ {t('查證無誤，公開', 'Verified — publish')}</button>}
                                  {ca.status !== 'rejected' && <button type="button" onClick={() => { const note = window.prompt(t('退回原因（會讓發起人看到）', 'Reason (shown to the organiser)'), ''); if (note !== null) poolAdminAction('cash_reject', p.id, { note }); }} style={smallBtn('transparent', '#991b1b', '1px solid #fecaca')}>{t('退回', 'Reject')}</button>}
                                </span>
                              </div>
                              <div>{ca.orgLegalName} · {cashOrgTypeLabel(ca.orgType)} · {t('勸募許可字號', 'Fundraising permit')}：<b>{ca.permitNo}</b>{ca.permitUrl ? <> · <a href={ca.permitUrl} target="_blank" rel="noopener noreferrer">{t('查證連結', 'Verification link')}</a></> : null}</div>
                              <div>{ca.bankName} {ca.bankBranch} · {t('戶名', 'Account name')}：{ca.accountName} · {t('帳號', 'Account no.')}：<span style={{ fontFamily: 'monospace' }}>{ca.accountNo}</span></div>
                              <div>{t('經費目標 NT${n}', 'Funding goal NT${n}').replace('{n}', Number(ca.goalNTD || 0).toLocaleString())} · {t('截止日 {d}', 'Ends {d}').replace('{d}', String(ca.deadline || ''))}{ca.purpose ? ` · ${ca.purpose}` : ''}</div>
                              {ca.reviewNote ? <div style={{ color: '#991b1b' }}>{t('退回原因：{r}', 'Reason: {r}').replace('{r}', ca.reviewNote)}</div> : null}
                              <div style={{ color: '#166534', fontSize: '0.76rem', marginTop: 2 }}>{t('公開前請確認：① 許可字號在衛福部公益勸募系統查得到；② 許可的活動名稱與期間與此相符；③ 戶名與機構全名相同；④ 用途合理。', 'Before publishing check: ① the permit number exists in the MOHW charity fundraising system; ② the permitted campaign and period match; ③ the account name equals the organisation’s legal name; ④ the purpose is reasonable.')}</div>
                            </div>
                          ); })() : null}
                        </div>
                      ); })}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* 讀經比賽審核 */}
            {(() => {
              const all = contestsAdmin || [];
              const shown = all.filter(c => contestsAdminFilter === 'all' ? true : c.status === contestsAdminFilter);
              const counts = { pending: all.filter(c => c.status === 'pending').length, approved: all.filter(c => c.status === 'approved').length, closed: all.filter(c => c.status === 'closed').length, rejected: all.filter(c => c.status === 'rejected').length };
              const smallBtn = compactBtn;
              return (
                <div data-testid="admin-contests" style={{ border: '1px solid #bfdbfe', background: '#eff6ff', borderRadius: 10, padding: '0.9rem 1rem', marginBottom: '1rem' }}>
                  <b style={{ color: '#1e40af' }}>📖 {t('讀經比賽', 'Reading contest')}</b>
                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', margin: '0.6rem 0' }}>
                    {[['pending', t('待審核', 'Pending')], ['approved', t('進行中', 'Open')], ['closed', t('已關閉', 'Closed')], ['rejected', t('已退回', 'Rejected')], ['all', t('全部', 'All')]].map(([id, lab]) => (
                      <button key={id} type="button" onClick={() => setContestsAdminFilter(id)} style={{ padding: '0.3rem 0.8rem', borderRadius: 20, border: 'none', background: contestsAdminFilter === id ? '#1d4ed8' : '#bfdbfe', color: contestsAdminFilter === id ? '#fff' : '#1e40af', fontWeight: 700, cursor: 'pointer', fontSize: '0.8rem' }}>{lab}{id !== 'all' ? ` (${counts[id]})` : ''}</button>
                    ))}
                  </div>
                  {!contestsAdmin ? <div style={{ color: '#94a3b8', fontSize: '0.85rem' }}>{t('載入中…', 'Loading…')}</div> : shown.length === 0 ? <div style={{ color: '#94a3b8', fontSize: '0.85rem' }}>{t('目前沒有項目', 'Nothing here yet')}</div> : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                      {shown.map(c => { const cc = c.counters || {}; const b = poolStatusBadge(c.status); return (
                        <div key={c.id} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: '0.5rem 0.7rem', fontSize: '0.85rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                            <span><b>📖 {c.name}</b> · ⛪ {c.orgPlaceName} <span style={{ background: b.bg, color: b.fg, borderRadius: 999, padding: '0.05rem 0.5rem', fontSize: '0.74rem', fontWeight: 700 }}>{b.text}</span></span>
                            <span style={{ display: 'flex', gap: '0.3rem' }}>
                              {(c.status === 'pending' || c.status === 'closed') && <button type="button" onClick={() => contestAdminAction('approve', c.id)} style={smallBtn('#16a34a')}>✅ {t('核准', 'Approve')}</button>}
                              {c.status === 'pending' && <button type="button" onClick={() => contestAdminAction('reject', c.id)} style={smallBtn('transparent', '#991b1b', '1px solid #fecaca')}>{t('退回', 'Reject')}</button>}
                              {c.status === 'approved' && <button type="button" onClick={() => contestAdminAction('close', c.id)} style={smallBtn('transparent', '#64748b', '1px solid #cbd5e1')}>{t('關閉', 'Close')}</button>}
                            </span>
                          </div>
                          <div style={{ color: '#94a3b8', fontSize: '0.78rem' }}>{c.ownerEmail} · {c.setTitle} · {new Date(c.startsAt).toLocaleDateString()}–{new Date(c.endsAt).toLocaleDateString()} · {t('{n} 人參加 · {a} 人挑戰 · {m} 人完成', '{n} joined · {a} challengers · {m} completed').replace('{n}', String(cc.joined || 0)).replace('{a}', String(cc.accepted || 0)).replace('{m}', String(cc.completed || 0))}</div>
                          {c.description ? <div style={{ color: '#475569', fontSize: '0.8rem', marginTop: 2 }}>{c.description}</div> : null}
                        </div>
                      ); })}
                    </div>
                  )}
                </div>
              );
            })()}

            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
              {[['pending', t('待處理', 'Pending'), pendingCount], ['sent', t('已寄出', 'Sent'), all.filter(r => r.status === 'sent').length], ['rejected', t('無效', 'Invalid'), all.filter(r => r.status === 'rejected').length], ['all', t('全部', 'All'), all.length]].map(([id, label, n]) => (
                <button key={id} type="button" onClick={() => setRewardsAdminFilter(id)} style={{ padding: '0.4rem 0.9rem', borderRadius: '20px', border: 'none', background: rewardsAdminFilter === id ? '#f59e0b' : '#e2e8f0', color: rewardsAdminFilter === id ? '#fff' : '#334155', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}>{label} ({n})</button>
              ))}
            </div>
            {rewardsAdmin?.error && rewardsAdmin.error !== 'token' && <div style={{ color: '#ef4444', fontSize: '0.85rem', marginBottom: '0.8rem' }}>{rewardsAdmin.error}</div>}
            {rewardsAdmin?.loading && all.length === 0 && <div style={{ color: '#94a3b8', textAlign: 'center', padding: '1.5rem' }}>{t('載入中…', 'Loading…')}</div>}
            {!rewardsAdmin?.loading && shown.length === 0 && <div style={{ color: '#94a3b8', textAlign: 'center', padding: '1.5rem', border: '1px dashed #cbd5e1', borderRadius: '8px' }}>{t('目前沒有項目', 'Nothing here yet')}</div>}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
              {shown.map(r => {
                const badge = statusBadge(r.status);
                const contact = r.contactEmail || r.email || '';
                const region = r.region || 'tw';
                const cur = rewardCurrency(r);
                const v = r.verified;
                const flags = r.flags || [];
                const draft = sendDraftFor(r);
                const pools = poolsFor(r);
                return (
                  <div key={r.id} style={{ border: `1px solid ${flags.length && isOpen(r) ? '#fcd34d' : '#e2e8f0'}`, borderRadius: '10px', padding: '0.9rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', background: r.status === 'sent' ? '#f8fafc' : r.status === 'rejected' ? '#fff5f5' : '#fff' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.6rem', flexWrap: 'wrap' }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 700, color: '#1e293b', fontSize: '1rem' }}>{r.kind === 'invites' ? '🤝' : '🏞️'} {r.contactName || r.name || t('（未提供名字）', '(no name)')} · {rewardLabel(r.kind, r.milestone)}</div>
                        <div style={{ color: '#64748b', fontSize: '0.82rem', marginTop: 3, wordBreak: 'break-all' }}>
                          📧 {contact ? <b style={{ color: '#1e293b' }}>{contact}</b> : <span style={{ color: '#ef4444' }}>{t('尚未登記 Email', 'No email yet')}</span>}
                          {' · '}{region === 'intl' ? t('海外', 'Overseas') : t('台灣', 'Taiwan')}
                          {r.lineId ? <> · LINE <b style={{ color: '#1e293b' }}>{r.lineId}</b></> : null}
                          {r.churchCode ? <> · ⛪ <b style={{ color: '#1e293b' }}>{r.churchCode}</b></> : null}
                          {r.preferredVoucherId ? <> · {t('偏好', 'prefers')} {voucherLabel(region, r.preferredVoucherId)}</> : null}
                          {' · '}{t('代碼', 'code')} <code>{r.code}</code>
                        </div>
                        <div style={{ color: '#475569', fontSize: '0.8rem', marginTop: 3 }}>
                          {v ? (
                            <>🔎 {t('伺服器核算', 'Server-verified')}: {t('通過 {n} 節', '{n} passed').replace('{n}', String(v.passedVerses ?? '?'))} · {t('活躍 {n} 天', '{n} active days').replace('{n}', String(v.activeDays ?? '?'))} · {t('帳號 {n} 天', 'account {n} days').replace('{n}', String(v.accountAgeDays ?? '?'))}{r.kind === 'invites' ? <> · {t('合格推薦 {n} 位', '{n} qualified referrals').replace('{n}', String(v.qualified ?? '?'))}</> : null}</>
                          ) : null}
                        </div>
                        {flags.length > 0 && (
                          <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap', marginTop: 4 }}>
                            {flags.map(f => <span key={f} style={{ background: '#fef3c7', color: '#92400e', borderRadius: 999, padding: '0.1rem 0.55rem', fontSize: '0.75rem', fontWeight: 600 }}>⚠️ {flagLabel(f)}</span>)}
                          </div>
                        )}
                        <div style={{ color: '#94a3b8', fontSize: '0.75rem', marginTop: 2 }}>
                          {t('達成', 'Earned')} {new Date(r.at).toLocaleString()}
                          {r.sentAt ? <> · {t('寄出', 'Sent')} {new Date(r.sentAt).toLocaleString()}{r.sentBy ? ` (${r.sentBy})` : ''}{r.voucherId ? ` · ${voucherLabel(region, r.voucherId)} ${fmtMoney(r.voucherValue, r.voucherCurrency || cur)}` : ''}{r.poolId ? ` · ${(sponsors.find(sp => sp.id === r.poolId) || {}).displayName || r.poolId}` : ''}</> : null}
                          {r.rejectedAt ? <> · {t('標記無效', 'Marked invalid')} {new Date(r.rejectedAt).toLocaleString()}{r.rejectReason ? `：${r.rejectReason}` : ''}</> : null}
                        </div>
                      </div>
                      <span style={{ background: badge.bg, color: badge.fg, borderRadius: '999px', padding: '0.2rem 0.7rem', fontSize: '0.78rem', fontWeight: 700, whiteSpace: 'nowrap' }}>{badge.text}</span>
                    </div>
                    {isOpen(r) ? (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.5rem', alignItems: 'center' }}>
                        <select value={draft.poolId} onChange={e => setSendField(r.id, r, 'poolId', e.target.value)} style={inputStyle}>
                          <option value="">{t('不扣贊助池', 'No sponsor pool')}</option>
                          {pools.map(sp => <option key={sp.id} value={sp.id}>{sp.displayName} · {t('剩餘', 'Remaining')} {fmtMoney((pool.bySponsor && pool.bySponsor[sp.id] ? pool.bySponsor[sp.id].remaining : sp.amount), sp.currency)}</option>)}
                        </select>
                        <select value={draft.voucherId} onChange={e => setSendField(r.id, r, 'voucherId', e.target.value)} style={inputStyle}>
                          {(VOUCHER_CATALOG[region] || []).map(vc => <option key={vc.id} value={vc.id}>{vc.label}</option>)}
                        </select>
                        <input type="number" min={0} value={draft.voucherValue} onChange={e => setSendField(r.id, r, 'voucherValue', e.target.value)} placeholder={cur} style={inputStyle} />
                        <select value={draft.deliveredVia} onChange={e => setSendField(r.id, r, 'deliveredVia', e.target.value)} style={inputStyle}>
                          <option value="email">Email</option>
                          <option value="line">LINE</option>
                          <option value="other">{t('其他', 'Other')}</option>
                        </select>
                        <input
                          type="text"
                          value={rewardNoteDraft[r.id] ?? r.note ?? ''}
                          onChange={e => setRewardNoteDraft(prev => ({ ...prev, [r.id]: e.target.value }))}
                          placeholder={t('備註（不要填禮券序號）', 'Note (never the voucher code)')}
                          style={{ ...inputStyle, gridColumn: '1 / -1' }}
                        />
                        <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <button type="button" onClick={() => markReward(r, 'sent')} style={smallBtn('#10b981')}>✅ {t('標記已寄出', 'Mark as sent')}</button>
                          <button type="button" onClick={() => { const reason = window.prompt(t('標記無效的原因', 'Reason for marking invalid')) ; if (reason !== null) markReward(r, 'reject', { reason }); }} style={smallBtn('transparent', '#991b1b', '1px solid #fecaca')}>🚫 {t('標記無效', 'Mark invalid')}</button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                        {r.note ? <span style={{ color: '#64748b', fontSize: '0.82rem' }}>📝 {r.note}</span> : null}
                        <button type="button" onClick={() => markReward(r, 'unsent')} style={smallBtn('transparent', '#64748b', '1px solid #cbd5e1')}>↩︎ {t('改回待處理', 'Back to pending')}</button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
