// The bell: encouragement, admin reviews, rewards and contest notices — moved out of App.jsx unchanged (UI/UX 第 4 階段).
import { CATALOG as VOUCHER_CATALOG } from '../../api/_lib/rewardCatalog.js';
import { XCircle } from 'lucide-react';
import { formatLocalDate } from '../lib/bible.js';

export default function InboxPanel({ t, adminPending, changeDailyVerseDate, claimFormFor, claimReward, combinedInbox, isRewardClaimed, isSuperAdmin, rewardLabel, sendReferralCheer, setClaimField, setContinuousRainSet, setDailySharedVoiceOwner, setMainTab, setShowEncouragePanel, userEmail }) {
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1360, padding: '1rem' }} onClick={(e) => { if (e.target === e.currentTarget) setShowEncouragePanel(false); }}>
      <div style={{ background: '#fff', borderRadius: '14px', width: '100%', maxWidth: '400px', maxHeight: '80vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 40px rgba(0,0,0,0.25)' }}>
        <div style={{ padding: '1.1rem 1.3rem 0.8rem', borderBottom: '1px solid #eef2f7', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontWeight: 700, color: '#1e293b', fontSize: '1.05rem' }}>🔔 {t('收到的鼓勵', 'Encouragement received')}</div>
          <button onClick={() => setShowEncouragePanel(false)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 0 }}><XCircle size={22} /></button>
        </div>
        <div style={{ flex: '1 1 auto', minHeight: 0, overflowY: 'auto', padding: '0.6rem 0' }}>
          {isSuperAdmin && adminPending && (adminPending.pools > 0 || adminPending.places > 0 || adminPending.contests > 0) && (
            <div data-testid="admin-pending-banner" style={{ margin: '0 0.9rem 0.5rem', background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: 10, padding: '0.6rem 0.8rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <span style={{ color: '#9f1239', fontWeight: 700, fontSize: '0.88rem' }}>{(adminPending.pools > 0 ? t('待審核：{a} 個愛心行動、{b} 個地圖標記、{c} 個讀經比賽', 'Awaiting review: {a} Love in Action projects, {b} map markers, {c} reading contests') : t('待審核：{b} 個地圖標記、{c} 個讀經比賽', 'Awaiting review: {b} map markers, {c} reading contests')).replace('{a}', String(adminPending.pools)).replace('{b}', String(adminPending.places)).replace('{c}', String(adminPending.contests || 0))}</span>
              <button onClick={() => { setShowEncouragePanel(false); setMainTab('rewards_admin'); }} style={{ background: '#be123c', color: '#fff', border: 'none', borderRadius: 8, padding: '0.3rem 0.8rem', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer' }}>{t('去審核', 'Review it')} →</button>
            </div>
          )}
          {combinedInbox.all.length === 0 && (
            <div style={{ color: '#94a3b8', fontSize: '0.9rem', textAlign: 'center', padding: '1.5rem 1rem' }}>{t('還沒有任何通知。邀請朋友、錄下你的聲音分享給大家吧！', 'No notifications yet — invite friends and share your voice!')}</div>
          )}
          {combinedInbox.all.map((it, i) => {
            // Referral milestone (I'm the inviter) — the invited friend hit a garden milestone.
            if (it.kind === 'milestone') {
              const name = it.refereeName || t('你邀請的朋友', 'the friend you invited');
              const icon = it.milestone >= 100 ? '🏞️' : (it.milestone >= 10 ? '🌳' : '🌱');
              const msg = it.milestone >= 100
                ? t('{n} 種滿了一整塊 10×10 田地（100 個經文）！', '{n} filled a whole 10×10 field (100 verses)!').replace('{n}', name)
                : it.milestone >= 10
                  ? t('{n} 已種下 10 棵樹（完成 10 個經文）！', '{n} planted 10 trees (10 verses)!').replace('{n}', name)
                  : t('{n} 種下了第一棵樹（完成第一個經文）！', '{n} planted their first tree (first verse)!').replace('{n}', name);
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '0.6rem 1.3rem' }}>
                  <span style={{ fontSize: '1.2rem', flexShrink: 0 }}>{icon}</span>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ color: '#334155', fontSize: '0.9rem', lineHeight: 1.45 }}>{msg}</div>
                    <div style={{ marginTop: 6 }}>
                      {it.cheered ? (
                        <span style={{ color: '#16a34a', fontSize: '0.82rem', fontWeight: 600 }}>{t('已鼓勵 👍', 'Cheered 👍')}</span>
                      ) : it.refereeCode ? (
                        <button onClick={() => sendReferralCheer(it)} style={{ background: '#10b981', color: '#fff', border: 'none', borderRadius: 8, padding: '0.35rem 0.9rem', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer' }}>{t('給他一個讚 👍', 'Send a cheer 👍')}</button>
                      ) : null}
                    </div>
                    <div style={{ color: '#cbd5e1', fontSize: '0.72rem', marginTop: 2 }}>{new Date(it.at).toLocaleString()}</div>
                  </div>
                </div>
              );
            }
            // Nudge received (I'm the invited friend) — my inviter asks me to start.
            if (it.kind === 'nudge') {
              return (
                <div key={i} data-testid="inbox-nudge" style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '0.6rem 1.3rem' }}>
                  <span style={{ fontSize: '1.2rem', flexShrink: 0 }}>🌧️</span>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ color: '#334155', fontSize: '0.9rem', lineHeight: 1.45 }}>
                      <b>{it.fromName || t('邀請你的人', 'the one who invited you')}</b>{' '}
                      {t('邀你來玩一節經文，種下第一棵樹！', 'invites you to play a verse and plant your first tree!')}
                    </div>
                    <button type="button" onClick={() => { setShowEncouragePanel(false); changeDailyVerseDate(formatLocalDate(new Date())); setDailySharedVoiceOwner(null); setContinuousRainSet(null); setMainTab('daily_verse'); }} style={{ marginTop: 6, background: '#10b981', color: '#fff', border: 'none', borderRadius: 8, padding: '0.35rem 0.9rem', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer' }}>
                      ▶ {t('開始', 'Start')}
                    </button>
                    <div style={{ color: '#cbd5e1', fontSize: '0.72rem', marginTop: 2 }}>{new Date(it.at).toLocaleString()}</div>
                  </div>
                </div>
              );
            }
            // Cheer received (I'm the invited friend) — my inviter cheered me.
            if (it.kind === 'cheer') {
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '0.6rem 1.3rem' }}>
                  <span style={{ fontSize: '1.2rem', flexShrink: 0 }}>👍</span>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ color: '#334155', fontSize: '0.9rem', lineHeight: 1.45 }}>
                      <b>{it.fromName || t('邀請你的人', 'the one who invited you')}</b>{' '}
                      {t('給你一個讚，鼓勵你繼續加油！', 'sent you a cheer — keep going!')}
                    </div>
                    <div style={{ color: '#cbd5e1', fontSize: '0.72rem', marginTop: 2 }}>{new Date(it.at).toLocaleString()}</div>
                  </div>
                </div>
              );
            }
            // Reward earned (me) — confirm an email so the admin can send it.
            if (it.kind === 'reward') {
              const claimed = isRewardClaimed(it.rewardId);
              const f = claimFormFor(it.rewardId);
              const chip = (on) => ({ padding: '0.25rem 0.7rem', borderRadius: 999, border: `1px solid ${on ? '#f59e0b' : '#cbd5e1'}`, background: on ? '#fef3c7' : '#fff', color: '#334155', fontSize: '0.8rem', fontWeight: on ? 700 : 500, cursor: 'pointer' });
              const field = { width: '100%', boxSizing: 'border-box', padding: '0.35rem 0.5rem', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: '0.85rem', background: '#fff' };
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '0.6rem 1.3rem', background: claimed ? 'transparent' : '#fffbeb' }}>
                  <span style={{ fontSize: '1.2rem', flexShrink: 0 }}>🎁</span>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ color: '#334155', fontSize: '0.9rem', lineHeight: 1.45 }}>
                      <b>{t('恭喜！你{what}，獲得一份獎勵！', 'Congrats! You {what} — you earned a reward!').replace('{what}', rewardLabel(it.rewardKind, it.milestone))}</b>
                    </div>
                    {claimed ? (
                      <div style={{ color: '#16a34a', fontSize: '0.82rem', fontWeight: 600, marginTop: 6 }}>{t('已登記，管理員會盡快把獎勵寄給你 ✓', 'Registered — the admin will send it soon ✓')}</div>
                    ) : !userEmail ? (
                      <div style={{ color: '#b45309', fontSize: '0.82rem', marginTop: 6 }}>{t('請先登入才能領取獎勵', 'Sign in to claim this reward')}</div>
                    ) : (
                      <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                          <span style={{ color: '#64748b', fontSize: '0.8rem' }}>{t('所在地區：', 'Region:')}</span>
                          {[['tw', t('台灣', 'Taiwan')], ['intl', t('海外', 'Overseas')]].map(([id, label]) => (
                            <button key={id} type="button" onClick={() => setClaimField(it.rewardId, 'region', id)} style={chip(f.region === id)}>{label}</button>
                          ))}
                        </div>
                        <div style={{ color: '#64748b', fontSize: '0.8rem' }}>{t('請確認要收獎勵的 Email：', 'Confirm the email to send it to:')}</div>
                        <input type="email" value={f.email} onChange={e => setClaimField(it.rewardId, 'email', e.target.value)} placeholder="you@example.com" style={field} />
                        <input type="text" value={f.lineId} onChange={e => setClaimField(it.rewardId, 'lineId', e.target.value)} placeholder={t('LINE ID（選填，方便傳禮券）', 'LINE ID (optional, for sending the voucher)')} maxLength={40} style={field} />
                        <input type="text" value={f.church} onChange={e => setClaimField(it.rewardId, 'church', e.target.value.toUpperCase())} placeholder={t('教會代碼（選填，會友可從教會專屬池領取）', 'Church code (optional, for your church’s own pool)')} maxLength={20} style={field} />
                        <select value={f.voucher} onChange={e => setClaimField(it.rewardId, 'voucher', e.target.value)} style={field}>
                          <option value="">{t('偏好的禮券（選填）', 'Preferred voucher (optional)')}</option>
                          {(VOUCHER_CATALOG[f.region] || []).map(v => <option key={v.id} value={v.id}>{v.label}</option>)}
                        </select>
                        <button onClick={() => claimReward(it)} style={{ alignSelf: 'flex-start', background: '#f59e0b', color: '#fff', border: 'none', borderRadius: 8, padding: '0.4rem 1rem', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer' }}>
                          {t('領取 🎁', 'Claim 🎁')}
                        </button>
                      </div>
                    )}
                    <div style={{ color: '#cbd5e1', fontSize: '0.72rem', marginTop: 2 }}>{new Date(it.at).toLocaleString()}</div>
                  </div>
                </div>
              );
            }
            // A shop I introduced had a redemption → my 2.5% arrived.
            if (it.kind === 'merchant_referral') {
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '0.6rem 1.3rem', background: '#fffbeb' }}>
                  <span style={{ fontSize: '1.2rem', flexShrink: 0 }}>🏪</span>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ color: '#334155', fontSize: '0.9rem', lineHeight: 1.45 }}>
                      {t('{place}：{who} 使用 {points} 點，因此你也獲得 {bonus} 點 🎉', '{place}: {who} used {points} pts, so you also earned {bonus} pts 🎉').replace('{place}', String(it.placeName || '')).replace('{who}', String(it.playerName || '')).replace('{points}', Number(it.points || 0).toLocaleString()).replace('{bonus}', Number(it.bonus || 0).toLocaleString())}
                    </div>
                    <div style={{ color: '#cbd5e1', fontSize: '0.72rem', marginTop: 2 }}>{new Date(it.at).toLocaleString()}</div>
                  </div>
                </div>
              );
            }
            // 愛心行動: contributions and pool vouchers (organisation), new pools (admin).
            if (['pool_contribution', 'pool_voucher_used', 'pool_approved', 'pool_rejected', 'pool_merchant_joined'].includes(it.kind)) {
              const text = it.kind === 'pool_contribution'
                ? t('{who} 投入 {points} 點到「{pool}」，折抵額度 +NT${n}', '{who} contributed {points} pts to “{pool}” — NT${n} added to the allowance').replace('{who}', String(it.who || '')).replace('{points}', Number(it.points || 0).toLocaleString()).replace('{pool}', String(it.poolName || '')).replace('{n}', String(it.ntd ?? ''))
                : it.kind === 'pool_voucher_used'
                  ? t('「{pool}」在 {place} 的折扣券已核銷，折抵 NT${n}', 'The “{pool}” coupon at {place} was used — NT${n} off').replace('{pool}', String(it.poolName || '')).replace('{place}', String(it.placeName || '')).replace('{n}', String(it.ntd ?? ''))
                  : it.kind === 'pool_approved'
                    ? t('你的愛心行動「{name}」已通過審核，現在可以接受投入了 ❤️', 'Your Love in Action project “{name}” was approved and can now receive contributions ❤️').replace('{name}', String(it.name || ''))
                    : it.kind === 'pool_rejected'
                      ? t('你的愛心行動「{name}」未通過審核，請聯絡管理員了解原因', 'Your Love in Action project “{name}” was not approved; please contact an admin').replace('{name}', String(it.name || ''))
                      : t('{place} 加入了「{pool}」：單筆最高 NT${a}、每月最高 NT${b}', '{place} joined “{pool}”: up to NT${a} per order, NT${b} a month').replace('{place}', String(it.placeName || '')).replace('{pool}', String(it.poolName || '')).replace('{a}', String(it.perOrderMaxNTD ?? '')).replace('{b}', String(it.monthlyMaxNTD ?? ''));
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '0.6rem 1.3rem', background: '#fff7f8' }}>
                  <span style={{ fontSize: '1.2rem', flexShrink: 0 }}>{it.kind === 'pool_voucher_used' ? '🎟️' : it.kind === 'pool_merchant_joined' ? '🏪' : it.kind === 'pool_rejected' ? '⚠️' : '❤️'}</span>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ color: '#334155', fontSize: '0.9rem', lineHeight: 1.45 }}>{text}</div>
                    <div style={{ color: '#cbd5e1', fontSize: '0.72rem', marginTop: 2 }}>{new Date(it.at).toLocaleString()}</div>
                  </div>
                </div>
              );
            }
            if (it.kind === 'pool_submitted') {
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '0.6rem 1.3rem', background: '#fff7f8' }}>
                  <span style={{ fontSize: '1.2rem', flexShrink: 0 }}>❤️</span>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ color: '#334155', fontSize: '0.9rem', lineHeight: 1.45 }}>
                      {(it.cash
                        ? t('{who} 為愛心行動「{name}」送出現金捐款資訊（{org}），請確認勸募許可與帳戶戶名', '{who} submitted cash donation details for “{name}” ({org}) — check the permit and account name')
                        : t('{who} 為「{org}」建立了愛心行動「{name}」，等你審核', '{who} opened the Love in Action project “{name}” for “{org}” — awaiting your review')).replace('{who}', String(it.by || '')).replace('{org}', String(it.orgPlaceName || '')).replace('{name}', String(it.name || ''))}
                    </div>
                    {isSuperAdmin && (
                      <button onClick={() => { setShowEncouragePanel(false); setMainTab('rewards_admin'); }} style={{ marginTop: 6, background: '#be123c', color: '#fff', border: 'none', borderRadius: 8, padding: '0.35rem 0.9rem', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer' }}>{t('去審核', 'Review it')} →</button>
                    )}
                    <div style={{ color: '#cbd5e1', fontSize: '0.72rem', marginTop: 2 }}>{new Date(it.at).toLocaleString()}</div>
                  </div>
                </div>
              );
            }
            // 讀經比賽: someone joined or completed (organisation), review outcome (organisation).
            if (['contest_joined', 'contest_completed', 'contest_approved', 'contest_rejected'].includes(it.kind)) {
              const text = it.kind === 'contest_joined'
                ? t('{who} 加入了「{name}」讀經比賽', '{who} joined the reading contest “{name}”').replace('{who}', String(it.who || '')).replace('{name}', String(it.name || ''))
                : it.kind === 'contest_completed'
                  ? t('🎉 {who} 完成了「{name}」讀經比賽，記得安排獎勵！', '🎉 {who} finished “{name}” — remember to arrange the reward!').replace('{who}', String(it.who || '')).replace('{name}', String(it.name || ''))
                  : it.kind === 'contest_approved'
                    ? t('你的讀經比賽「{name}」已通過審核，現在可以邀請大家參加了 📖', 'Your reading contest “{name}” was approved and can now take participants 📖').replace('{name}', String(it.name || ''))
                    : t('你的讀經比賽「{name}」未通過審核，請聯絡管理員了解原因', 'Your reading contest “{name}” was not approved; please contact an admin').replace('{name}', String(it.name || ''));
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '0.6rem 1.3rem', background: '#eff6ff' }}>
                  <span style={{ fontSize: '1.2rem', flexShrink: 0 }}>{it.kind === 'contest_completed' ? '🎉' : it.kind === 'contest_rejected' ? '⚠️' : '📖'}</span>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ color: '#334155', fontSize: '0.9rem', lineHeight: 1.45 }}>{text}</div>
                    <div style={{ color: '#cbd5e1', fontSize: '0.72rem', marginTop: 2 }}>{new Date(it.at).toLocaleString()}</div>
                  </div>
                </div>
              );
            }
            if (it.kind === 'contest_submitted') {
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '0.6rem 1.3rem', background: '#eff6ff' }}>
                  <span style={{ fontSize: '1.2rem', flexShrink: 0 }}>📖</span>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ color: '#334155', fontSize: '0.9rem', lineHeight: 1.45 }}>
                      {t('{who} 為「{org}」建立了讀經比賽「{name}」，等你審核', '{who} opened the reading contest “{name}” for “{org}” — awaiting your review').replace('{who}', String(it.by || '')).replace('{org}', String(it.orgPlaceName || '')).replace('{name}', String(it.name || ''))}
                    </div>
                    {isSuperAdmin && (
                      <button onClick={() => { setShowEncouragePanel(false); setMainTab('rewards_admin'); }} style={{ marginTop: 6, background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 8, padding: '0.35rem 0.9rem', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer' }}>{t('去審核', 'Review it')} →</button>
                    )}
                    <div style={{ color: '#cbd5e1', fontSize: '0.72rem', marginTop: 2 }}>{new Date(it.at).toLocaleString()}</div>
                  </div>
                </div>
              );
            }
            if (it.kind === 'voucher_used' || it.kind === 'place_approved') {
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '0.6rem 1.3rem' }}>
                  <span style={{ fontSize: '1.2rem', flexShrink: 0 }}>{it.kind === 'voucher_used' ? '🎟️' : '🏪'}</span>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ color: '#334155', fontSize: '0.9rem', lineHeight: 1.45 }}>
                      {it.kind === 'voucher_used'
                        ? t('你在 {place} 的折扣券已核銷，折抵 NT${n} 🎉', 'Your coupon at {place} was used — NT${n} off 🎉').replace('{place}', String(it.placeName || '')).replace('{n}', String(it.ntd ?? ''))
                        : t('你的地圖標記「{name}」已通過審核，現在出現在「誰在玩」地圖上了 🗺️', 'Your map marker “{name}” was approved and is now on the map 🗺️').replace('{name}', String(it.name || ''))}
                    </div>
                    <div style={{ color: '#cbd5e1', fontSize: '0.72rem', marginTop: 2 }}>{new Date(it.at).toLocaleString()}</div>
                  </div>
                </div>
              );
            }
            // New map place submitted (I'm an admin) — go review it.
            if (it.kind === 'place_submitted') {
              const kindText = it.placeKind === 'church' ? t('教會', 'Church') : it.placeKind === 'org' ? t('機構', 'Organisation') : t('商家', 'Shop');
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '0.6rem 1.3rem', background: '#f0fdfa' }}>
                  <span style={{ fontSize: '1.2rem', flexShrink: 0 }}>🏪</span>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ color: '#334155', fontSize: '0.9rem', lineHeight: 1.45 }}>
                      {t('{who} 登記了「{name}」（{kind}），等你審核', '{who} registered “{name}” ({kind}) — awaiting your review').replace('{who}', String(it.by || '')).replace('{name}', String(it.name || '')).replace('{kind}', kindText)}
                    </div>
                    {isSuperAdmin && (
                      <button onClick={() => { setShowEncouragePanel(false); setMainTab('rewards_admin'); }} style={{ marginTop: 6, background: '#0d9488', color: '#fff', border: 'none', borderRadius: 8, padding: '0.35rem 0.9rem', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer' }}>{t('去審核', 'Review')}</button>
                    )}
                    <div style={{ color: '#cbd5e1', fontSize: '0.72rem', marginTop: 2 }}>{new Date(it.at).toLocaleString()}</div>
                  </div>
                </div>
              );
            }
            // Reward sent (me) — the admin has sent it.
            if (it.kind === 'reward_sent') {
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '0.6rem 1.3rem' }}>
                  <span style={{ fontSize: '1.2rem', flexShrink: 0 }}>📬</span>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ color: '#334155', fontSize: '0.9rem', lineHeight: 1.45 }}>
                      {t('你{what}的獎勵已經寄出了！請查看 Email 或訊息 🎁', 'Your reward for having {what} is on its way — check your email or messages 🎁').replace('{what}', rewardLabel(it.rewardKind, it.milestone))}
                    </div>
                    <div style={{ color: '#cbd5e1', fontSize: '0.72rem', marginTop: 2 }}>{new Date(it.at).toLocaleString()}</div>
                  </div>
                </div>
              );
            }
            // Voice encouragement (existing): a like/comment on my recording.
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '0.6rem 1.3rem' }}>
                <span style={{ fontSize: '1.2rem', flexShrink: 0 }}>{it.kind === 'like' ? (it.emoji || '❤️') : '💬'}</span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ color: '#334155', fontSize: '0.9rem', lineHeight: 1.45 }}>
                    <b>{it.fromName || t('某人', 'Someone')}</b>{' '}
                    {it.kind === 'like'
                      ? t('喜歡你在〈{ref}〉的錄音', 'liked your recording of {ref}').replace('{ref}', it.reference || '')
                      : t('在〈{ref}〉留言鼓勵你', 'commented on your recording of {ref}').replace('{ref}', it.reference || '')}
                  </div>
                  {it.preview && it.kind === 'comment' && <div style={{ color: '#64748b', fontSize: '0.82rem', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis' }}>{it.preview}</div>}
                  <div style={{ color: '#cbd5e1', fontSize: '0.72rem', marginTop: 2 }}>{new Date(it.at).toLocaleString()}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
