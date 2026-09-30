// The 園子 (garden) tab — moved out of App.jsx unchanged (UI/UX 第 4 階段).
import { ActivityHeatmap } from '../garden/ActivityHeatmap.jsx';
import { Apple, BookOpen, Copy, Crown, Heart, Info, Mail, ShoppingBasket, Sprout, Store, TreePine, Users } from 'lucide-react';
import { Button, alertDialog, toast } from '../ui';
import GardenView from '../GardenView.jsx';
import { QRCodeSVG } from 'qrcode.react';
import { InviterCard } from '../invite/InviterCard.jsx';
import { buildPublicShareUrl } from '../lib/routes.js';
import { verseRefKey } from '../lib/verseRef.js';

export default function GardenPage({ t, challengeGardenVerse, charityContribPage, charityMine, clearGardenFocus, compactMyGarden, contestMine, contestProgress, creatorOnlyPoints, gardenData, gardenFocus, gardenGaps, handleViewPlayerGarden, HISTORY_PAGE_SIZE, isFirstGardenVisit, isNarrowEditor, merchantRefBonus, merchantRefBonusPage, myInviterCode, myInviterName, myReferees, nudgeBusyName, nudgedUntil, nudgeReferee, pendingRefereesPage, personalCode, personalProgress, playerName, pointsBalance, refereeGardenStats, refereesPage, referralHistory, referralKeys, referralOnlyPoints, resolveGardenVerse, scrollMenuTo, sessionKey, setCharityContribPage, setMainTab, setMerchantRefBonusPage, setPendingRefereesPage, setQrShareModal, setRefereesPage, setShowBindInviterModal, setShowFruitInfo, setShowLevelInfo, setShowLoginModal, setShowOldInviters, setShowTodayInfo, showOldInviters, showTodayInfo, skoolLevel, totalFruits, userEmail, version }) {
  return (
    <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
        <h2 style={{ color: '#1e293b', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}><TreePine size={28} color="#10b981" /> {t("我的園子", "My Garden")}</h2>
        <Button variant="secondary" size="sm" icon={<Crown size={18} />} onClick={() => setMainTab('custom_verses')}>
          {t('我的經文組', 'My Custom Sets')} →
        </Button>
      </div>
      <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '1rem' }}>
        {t("每挑戰一節新經文，就會在空地上長出嫩芽。持續練習讓它長大！通過經文變成大樹，創新高則結出果子。", "Each new verse you challenge sprouts a seedling. Keep practicing to grow it! Clearing a verse makes it a full tree; new high scores bear fruit.")}
      </p>

      {/* Phase 1: Personal-progress hero cards (today + streak + accumulation) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem', marginBottom: '1.75rem' }}>
        {/* Today + Streak (combined) */}
        <div style={{ background: 'linear-gradient(135deg, #ecfdf5, #d1fae5)', border: '1px solid #6ee7b7', borderRadius: '14px', padding: '1.3rem 1.5rem', textAlign: 'center', boxShadow: '0 2px 6px rgba(16,185,129,0.08)' }}>
          <div style={{ color: '#065f46', fontSize: '0.8rem', fontWeight: 'bold', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '0.4rem' }}>{t('今日問候', "Today's Greeting")}</div>
          <div style={{ color: '#065f46', fontSize: '1.05rem', marginBottom: '1rem', fontWeight: 600 }}>
            {playerName
              ? (pointsBalance && !pointsBalance.error && Number.isFinite(Number(pointsBalance.todayPoints))
                ? t('{name}，今日得分 {n} 分', '{name}, {n} points scored today').replace('{name}', String(playerName)).replace('{n}', Number(pointsBalance.todayPoints).toLocaleString())
                : (isFirstGardenVisit
                  ? t('{name}，歡迎來到你的園子！挑戰第一節經文，就會種下第一棵樹。', '{name}, welcome to your garden! Clear your first verse to plant your first tree.').replace('{name}', String(playerName))
                  : t('{name}，歡迎回來', '{name}, welcome back').replace('{name}', String(playerName))))
              : (pointsBalance && !pointsBalance.error && Number.isFinite(Number(pointsBalance.todayPoints))
                ? t('今日得分 {n} 分', '{n} points scored today').replace('{n}', Number(pointsBalance.todayPoints).toLocaleString())
                : (isFirstGardenVisit
                  ? t('歡迎來到你的園子！挑戰第一節經文，就會種下第一棵樹。', 'Welcome to your garden! Clear your first verse to plant your first tree.')
                  : t('歡迎回來', 'Welcome back')))}
            {pointsBalance && !pointsBalance.error && Number.isFinite(Number(pointsBalance.todayPoints)) && (
              <button type="button" data-testid="today-points-help" onClick={() => setShowTodayInfo(v => !v)} aria-expanded={showTodayInfo} title={t('今天的分數怎麼算？', 'How were today’s points earned?')} aria-label={t('今天的分數怎麼算？', 'How were today’s points earned?')} style={{ marginLeft: 6, width: 20, height: 20, borderRadius: '50%', border: '1px solid #6ee7b7', background: showTodayInfo ? '#047857' : '#fff', color: showTodayInfo ? '#fff' : '#047857', fontSize: '0.78rem', fontWeight: 800, lineHeight: '18px', padding: 0, cursor: 'pointer', verticalAlign: 'middle' }}>?</button>
            )}
          </div>
          {userEmail && (!sessionKey || pointsBalance?.error === 'session_invalid') && (
            <Button variant="text" size="sm" data-testid="today-points-relogin" onClick={() => setShowLoginModal('login')} style={{ marginTop: '-0.6rem', marginBottom: '0.6rem' }}>
              {t('今日得分：重新登入後顯示', "Today's score: sign in again to show")}
            </Button>
          )}
          {showTodayInfo && pointsBalance && !pointsBalance.error && (() => {
            const td = pointsBalance.today;
            const b = (td && td.breakdown) || {};
            const ck = td && td.checkin;
            const ls = td && td.listen;
            const fmt = (n) => { const v = Number(n) || 0; return v > 0 ? `+${v.toLocaleString()}` : v.toLocaleString(); };
            const row = (key, label, detail, pts) => (
              <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem', padding: '0.4rem 0', borderBottom: '1px dashed #a7f3d0' }}>
                <div>
                  <div style={{ fontWeight: 700, color: '#064e3b' }}>{label}</div>
                  {detail ? <div style={{ fontSize: '0.78rem', color: '#047857', lineHeight: 1.5 }}>{detail}</div> : null}
                </div>
                <div style={{ fontWeight: 800, color: Number(pts) > 0 ? '#047857' : '#94a3b8', whiteSpace: 'nowrap' }}>{fmt(pts)}</div>
              </div>
            );
            const checkinDetail = !ck ? null : ck.done
              ? t('連續登入第 {n} 天', 'Day {n} in a row').replace('{n}', String(ck.streak))
              : (ck.graceUsed > 0
                ? t('今天聽完或挑戰完一節經文，可得 +{x}（會用掉 {k} 天恩典日，連續第 {n} 天）', 'Listen to or challenge one verse today for +{x} (uses {k} grace day(s), day {n} in a row)').replace('{k}', String(ck.graceUsed))
                : t('今天聽完或挑戰完一節經文，可得 +{x}（連續第 {n} 天）', 'Listen to or challenge one verse today for +{x} (day {n} in a row)')).replace('{x}', Number(ck.amount).toLocaleString()).replace('{n}', String(ck.streak));
            return (
              <div data-testid="today-points-breakdown" style={{ background: '#fff', border: '1px solid #a7f3d0', borderRadius: 10, padding: '0.75rem 0.9rem', margin: '-0.4rem 0 1rem', fontSize: '0.88rem', textAlign: 'left' }}>
                <div style={{ fontWeight: 800, color: '#065f46', marginBottom: '0.2rem' }}>{t('今天的分數怎麼來的', 'Where today’s points came from')}</div>
                {!td ? (
                  <div style={{ color: '#64748b' }}>{t('明細暫時無法取得，請稍後再試。', 'The breakdown is not available right now; please try again later.')}</div>
                ) : (
                  <>
                    {row('challenge', t('挑戰經文', 'Challenges'), t('新挑戰的經文，以及破紀錄多出來的部分', 'New verses, plus whatever beat your own record'), b.challenge)}
                    {row('checkin', t('每日登入', 'Daily check-in'), checkinDetail, b.checkin)}
                    {row('listen', t('聆聽經文', 'Listening'), ls ? t('今天 {c}/{m} 節，每節 +{p}', '{c}/{m} verses today, +{p} each').replace('{c}', String(ls.count)).replace('{m}', String(ls.max)).replace('{p}', String(ls.points)) : null, b.listen)}
                    {b.referral ? row('referral', t('邀請朋友', 'Invited friends'), t('朋友第一次通過經文，每位 +5000', '+5000 when a friend clears their first verse'), b.referral) : null}
                    {b.shopReferral ? row('shopReferral', t('商家推薦獎勵', 'Shop referral bonus'), t('有人在你推薦的商家折抵點數', 'Someone redeemed points at a shop you introduced'), b.shopReferral) : null}
                    {b.other ? row('other', t('其他', 'Other'), t('例如這份明細上線之前拿到的分數', 'For example, points earned before this breakdown existed'), b.other) : null}
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.45rem 0 0.2rem', fontWeight: 800, color: '#065f46' }}>
                      <span>{t('合計', 'Total')}</span>
                      <span>{fmt(pointsBalance.todayPoints)}</span>
                    </div>
                    {ck ? <div style={{ marginTop: '0.35rem', fontSize: '0.8rem', color: '#047857', lineHeight: 1.6 }}>🕊️ {t('恩典日：{g} 張（每連續 7 天送一張，最多 2 張；漏掉一天會自動補上）', 'Grace days: {g} (one for every 7 days in a row, up to 2; a missed day is covered automatically)').replace('{g}', String(ck.grace || 0))}</div> : null}
                    <div style={{ marginTop: '0.25rem', fontSize: '0.78rem', color: '#64748b', lineHeight: 1.6 }}>{t('下方 🔥 是園子的連續天數（依手機時間）；登入分數依連續登入天數（台灣時間）計算。', 'The 🔥 below is your garden streak (device time); check-in points follow the check-in streak (Taiwan time).')}</div>
                    <button type="button" onClick={() => { setMainTab('manual'); setTimeout(() => scrollMenuTo(document.getElementById('manual-score')), 350); }} style={{ marginTop: '0.4rem', background: 'transparent', border: 'none', padding: 0, color: '#2563eb', fontWeight: 700, cursor: 'pointer', fontSize: '0.82rem' }}>{t('完整規則', 'Full rules')} →</button>
                  </>
                )}
              </div>
            );
          })()}
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '2.6rem', filter: personalProgress.currentStreak > 0 ? 'none' : 'grayscale(1) opacity(0.4)' }}>🔥</span>
            <span style={{ fontSize: '3rem', fontWeight: 800, color: '#047857', lineHeight: 1 }}>{personalProgress.currentStreak}</span>
          </div>
          <div style={{ color: '#047857', fontSize: '0.95rem', fontWeight: 600, marginTop: '0.3rem' }}>
            {personalProgress.currentStreak > 0
              ? t('連續 {n} 天', '{n}-day streak').replace('{n}', String(personalProgress.currentStreak))
              : t('今天開始建立連續紀錄吧！', 'Start your streak today!')}
          </div>
          {personalProgress.longestStreak > personalProgress.currentStreak && (
            <div style={{ color: '#059669', fontSize: '0.78rem', marginTop: '0.35rem', opacity: 0.8 }}>
              {t('最長連續：{n} 天', 'Best: {n} days').replace('{n}', String(personalProgress.longestStreak))}
            </div>
          )}
        </div>

        {/* Personal cumulative stats */}
        <div style={{ background: 'linear-gradient(135deg, #eff6ff, #dbeafe)', border: '1px solid #93c5fd', borderRadius: '14px', padding: '1.3rem 1.5rem', boxShadow: '0 2px 6px rgba(59,130,246,0.08)' }}>
          <div style={{ color: '#1e3a8a', fontSize: '0.8rem', fontWeight: 'bold', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '0.7rem', textAlign: 'center' }}>{t('個人累積', 'Cumulative')}</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.7rem 1rem' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.7rem', fontWeight: 800, color: '#1d4ed8', lineHeight: 1 }}>{pointsBalance && !pointsBalance.error && Number.isFinite(Number(pointsBalance.earnedPoints)) ? Number(pointsBalance.earnedPoints).toLocaleString() : '—'}</div>
              <div style={{ fontSize: '0.78rem', color: '#1e3a8a', marginTop: '0.25rem' }} title={t('每節經文只算你的最佳成績', 'Only your best score on each verse counts')}>
                {t('累積點數', 'Total points')}
                <button type="button" onClick={(e) => { e.stopPropagation(); setMainTab('manual'); setTimeout(() => scrollMenuTo(document.getElementById('manual-score')), 350); }} title={t('九、累積點數怎麼算？', '9. How Is My Total Score Calculated?')} aria-label={t('九、累積點數怎麼算？', '9. How Is My Total Score Calculated?')} style={{ marginLeft: 4, width: 16, height: 16, borderRadius: '50%', border: '1px solid #93c5fd', background: '#eff6ff', color: '#1d4ed8', fontSize: '0.7rem', fontWeight: 800, lineHeight: '14px', padding: 0, cursor: 'pointer', verticalAlign: 'middle' }}>?</button>
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.7rem', fontWeight: 800, color: '#1d4ed8', lineHeight: 1 }}>{personalProgress.treesPlanted}</div>
              <div style={{ fontSize: '0.78rem', color: '#1e3a8a', marginTop: '0.25rem' }}>{t('已栽種', 'Trees')}</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.7rem', fontWeight: 800, color: '#1d4ed8', lineHeight: 1 }}>{personalProgress.champVerses}</div>
              <div style={{ fontSize: '0.78rem', color: '#1e3a8a', marginTop: '0.25rem' }}>{t('結果子', 'Fruited')}</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.7rem', fontWeight: 800, color: '#1d4ed8', lineHeight: 1 }}>{totalFruits}</div>
              <div style={{ fontSize: '0.78rem', color: '#1e3a8a', marginTop: '0.25rem' }}>{t('總果子', 'Fruits')}</div>
            </div>
          </div>
          {userEmail && (
            pointsBalance && !pointsBalance.error && Number.isFinite(Number(pointsBalance.balancePoints)) ? (
              <div style={{ marginTop: '0.7rem', textAlign: 'center', fontSize: '0.85rem', color: '#1e3a8a' }}>
                🎟️ {t('可用點數 {a}（已用 {b}）', 'Available points {a} (spent {b})').replace('{a}', Number(pointsBalance.balancePoints || 0).toLocaleString()).replace('{b}', Number(pointsBalance.spentPoints || 0).toLocaleString())}
                <span style={{ color: '#64748b' }}> · {t('最多可折抵 NT${n}', 'up to NT${n} off').replace('{n}', String(pointsBalance.balanceNTD || 0))}</span>
              </div>
            ) : (!sessionKey || (pointsBalance && pointsBalance.error === 'session_invalid')) ? (
              <div onClick={() => setShowLoginModal('login')} style={{ marginTop: '0.7rem', textAlign: 'center', fontSize: '0.8rem', color: '#64748b', cursor: 'pointer', textDecoration: 'underline' }}>
                🎟️ {t('可用點數：重新登入後顯示', 'Available points: sign in again to show')}
              </div>
            ) : null
          )}
          <div onClick={() => setMainTab('charity')} style={{ marginTop: '0.8rem', textAlign: 'center', fontSize: '0.82rem', color: '#9f1239', background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: 8, padding: '0.4rem 0.6rem', cursor: 'pointer' }}>
            ❤️ {t('看看有哪些愛心行動', 'See the Love in Action projects')}
          </div>
        </div>
      </div>

      {gardenGaps > 0 && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.5rem' }}>
          <Button variant="secondary" size="sm" onClick={compactMyGarden} title={t('把樹往前排，填掉被刪除的空格；順序不變', 'Move trees forward to close deleted cells; order is kept')}>
            🧹 {t('整理園子（{n} 個空格）', 'Tidy garden ({n} empty cells)').replace('{n}', String(gardenGaps))}
          </Button>
        </div>
      )}
      <GardenView
        idPrefix="garden"
        variant="own"
        gardenData={gardenData}
        t={t}
        version={version}
        refKey={verseRefKey}
        resolveVerse={resolveGardenVerse}
        onChallenge={challengeGardenVerse}
        isNarrow={isNarrowEditor}
        bleed={isNarrowEditor ? '1rem' : 0}
        focusRef={gardenFocus?.ref}
        focusNonce={gardenFocus?.nonce}
        onFocusConsumed={clearGardenFocus}
      />

      {/* The field comes first; harvest, level and invite details follow it. */}
      <div style={{ marginTop: '1.75rem' }} />
      {/* My Referrer card — shows who invited me, or a CTA to bind */}
      <InviterCard
        inviterCode={myInviterCode}
        inviterName={myInviterName}
        canEdit={!myInviterCode}
        onOpenBindModal={() => setShowBindInviterModal(true)}
        t={t}
      />

      {/* My Harvest Basket Header */}
      <div style={{ background: 'linear-gradient(135deg, #fffbeb, #fef3c7)', padding: '2rem', borderRadius: '16px', border: '1px solid #fde68a', marginBottom: '2rem', textAlign: 'center', boxShadow: '0 4px 10px rgba(0,0,0,0.05)' }}>
        <ShoppingBasket size={64} color="#d97706" style={{ marginBottom: '0.5rem', animation: 'bounce 2s infinite' }} />
        <h3 style={{ margin: 0, fontSize: '1.8rem', color: '#b45309', marginBottom: '0.5rem' }}>{t("我的收成", "My Harvest")}</h3>
        <p style={{ margin: 0, color: '#92400e', fontSize: '1.1rem', marginBottom: '1.5rem' }}>
          {t("過關斬將結出果子，提升你的互惠階級！", "Clear verses to bear fruit and level up!")}
        </p>

        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '1rem', background: '#fff', padding: '1rem 2rem', borderRadius: '50px', border: '2px solid #fbbf24', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)', flexWrap: 'wrap', justifyContent: 'center' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', borderRight: '2px solid #fcd34d', paddingRight: '1rem' }}>
            <span style={{ fontSize: '0.9rem', color: '#94a3b8', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>
              {t("總果子數量", "Total Fruits")}
              <button
                onClick={() => setShowFruitInfo(true)}
                title={t("查看果子來源說明", "How are fruits counted?")}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0', lineHeight: '1', fontSize: '1rem', animation: 'pulse 2s infinite', display: 'flex', alignItems: 'center', color: '#94a3b8' }}
              ><Info size={16} /></button>
            </span>
            <span style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#d97706', lineHeight: '1', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>{totalFruits} <Apple size={28} /></span>
          </div>
          <button
            onClick={() => setShowLevelInfo(true)}
            onMouseEnter={e => Object.assign(e.currentTarget.style, { transform: 'scale(1.05)', backgroundColor: '#f8fafc' })}
            onMouseLeave={e => Object.assign(e.currentTarget.style, { transform: 'scale(1)', backgroundColor: 'transparent' })}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0.5rem 1rem', background: 'transparent', border: 'none', cursor: 'pointer', transition: 'all 0.2s', borderRadius: '12px' }}
          >
            <span style={{ fontSize: '0.9rem', color: '#94a3b8', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>
              {t("目前階級", "Current Level")} <Info size={16} style={{ animation: 'pulse 2s infinite' }} />
            </span>
            <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: skoolLevel.level >= 3 ? '#8b5cf6' : '#2563eb' }}>
              Lv.{skoolLevel.level} {t(skoolLevel.title, skoolLevel.enTitle)}
            </span>
          </button>
        </div>

        {skoolLevel.next !== null && (
          <div style={{ marginTop: '1.5rem', maxWidth: '400px', margin: '1.5rem auto 0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#92400e', marginBottom: '0.3rem', fontWeight: 'bold' }}>
              <span>Lv.{skoolLevel.level}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>Lv.{skoolLevel.level + 1} ({skoolLevel.next}<Apple size={14} />)</span>
            </div>
            <div style={{ width: '100%', height: '14px', background: '#fef3c7', border: '1px solid #fde68a', borderRadius: '10px', overflow: 'hidden' }}>
              <div style={{ width: `${Math.min(100, (totalFruits / skoolLevel.next) * 100)}%`, height: '100%', background: 'linear-gradient(90deg, #fbbf24, #f59e0b)', transition: 'width 1s ease-in-out' }} />
            </div>
          </div>
        )}

        {/* Invite Block — available to everyone, including brand-new (Lv.1) players */}
        <div id="garden-invite" style={{ marginTop: '2rem', padding: '1.5rem', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', textAlign: 'left', position: 'relative', overflow: 'hidden' }}>
          <h4 style={{ margin: 0, color: '#10b981', fontSize: '1.3rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Mail size={24} /> {t("邀請朋友一起玩", "Invite Friends to Play")}
          </h4>

          {(
            <>
              <p style={{ margin: 0, color: '#475569', fontSize: '1rem', lineHeight: '1.5', marginBottom: '1.2rem' }}>
                {t("你的專屬推廣連結：當朋友們透過此連結直接進入加入 VerseRain，並完成他們的第一次背經遊戲，雙方都會自動獲得「推廣點數」獎勵，同時你也將累積推廣大使進度！", "Your personal invite link: When friends load VerseRain via this link and complete their first game, both of you earn bonus points!")}
              </p>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'stretch', flexWrap: 'wrap' }}>
                <input
                  readOnly
                  value={buildPublicShareUrl('/', { ref: personalCode })}
                  aria-label={t('你的專屬推廣連結', 'Your invite link')}
                  onFocus={(e) => e.target.select()}
                  style={{ flex: '1 1 100%', minWidth: 0, width: '100%', padding: '0.8rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', backgroundColor: '#fff', color: 'var(--color-text)', fontSize: 'var(--fs-body)' }}
                />
                <Button icon={<Copy size={18} />} onClick={() => {
                  const link = buildPublicShareUrl('/', { ref: personalCode });
                  Promise.resolve(navigator.clipboard?.writeText(link))
                    .then(() => toast.success(t("邀請連結已複製！快發給好朋友吧！", "Invite link copied! Share it with friends!")))
                    .catch(() => alertDialog({ title: t('分享連結', 'Share link'), message: link }));
                }}>
                  {t("複製", "Copy")}
                </Button>
                {typeof QRCodeSVG !== 'undefined' && (
                  <Button variant="secondary" onClick={() => setQrShareModal({ url: buildPublicShareUrl('/', { ref: personalCode }), reference: 'VerseRain 遊戲邀請' })}>
                    {t("QR 碼", "QR Code")}
                  </Button>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <ActivityHeatmap t={t} activityMap={gardenData?._activity || {}} />

      {/* Reciprocity History */}
      <div style={{ marginTop: '2rem', padding: '1.5rem', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px', borderBottom: '1px solid #cbd5e1', paddingBottom: '0.5rem', marginBottom: '1.5rem' }}>
          <h3 style={{ margin: 0, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Info size={18} /> {t('互惠點數紀錄', 'Reciprocity History')}
          </h3>
          <div style={{ marginLeft: 'auto', fontSize: '0.9rem', color: '#475569', fontWeight: 'bold' }}>
            {t('推薦果子', 'Referral Fruits')} <span style={{ color: '#ea580c' }}>{referralOnlyPoints}</span> <span style={{ margin: '0 8px', color: '#cbd5e1' }}>|</span> {t('經文組被玩', 'Custom Sets Played')} <span style={{ color: '#ea580c' }}>{creatorOnlyPoints}</span>
          </div>
        </div>

        <div>
          {/* 我的推薦人 — an account has exactly ONE inviter on the server
              (write-once invitedBy). The invited_by history, however, holds one
              record per old name / device code this account ever used, and
              before codes were unique per account an old device could even be
              recorded as inviting the new one. So: show the server's inviter
              (or the newest record) as the one referrer, hide records where the
              "inviter" is an old self, and fold the rest under 舊身分紀錄. */}
          {(() => {
            const selfKeys = new Set([playerName, personalCode, ...(referralKeys || [])].filter(Boolean).map(k => String(k).toLowerCase()));
            const byInviter = {};
            for (const h of referralHistory || []) {
              if (h.type !== 'invited_by' || !h.player) continue;
              if (selfKeys.has(String(h.player).toLowerCase())) continue; // my own old identity, not a referrer
              const cur = byInviter[h.player] || { player: h.player, amount: 0, timestamp: 0 };
              cur.amount += h.amount || 0;
              if ((h.timestamp || 0) > cur.timestamp) cur.timestamp = h.timestamp;
              byInviter[h.player] = cur;
            }
            const all = Object.values(byInviter).sort((a, b) => b.timestamp - a.timestamp);
            if (!all.length) return null;
            const primaryName = typeof myInviterName === 'string' && myInviterName ? myInviterName : all[0].player;
            const primary = all.find(x => x.player === primaryName) || all[0];
            const older = all.filter(x => x !== primary);
            const inviters = showOldInviters ? [primary, ...older] : [primary];
            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '1.25rem' }}>
                {older.length > 0 && (
                  <Button variant="text" size="sm" style={{ alignSelf: 'flex-start' }} aria-expanded={showOldInviters} onClick={() => setShowOldInviters(v => !v)}>
                    {showOldInviters ? '▾' : '▸'} {t('舊身分的推薦紀錄 {n} 筆', '{n} records from earlier names / devices').replace('{n}', String(older.length))}
                  </Button>
                )}
                {inviters.map(inv => (
                  <div key={inv.player} style={{ background: '#fff', padding: '10px 15px', borderRadius: '8px', borderLeft: '4px solid #3b82f6', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', fontSize: '0.9rem', color: '#475569', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    <span style={{ flex: 1 }}>
                      {t('我的推薦人', 'Invited by')}：<button type="button" onClick={() => handleViewPlayerGarden(inv.player)} title={t('查看園子', 'View garden')} style={{ background: 'none', border: 'none', padding: 0, color: '#1d4ed8', fontWeight: 'bold', fontSize: '1rem', cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: '3px' }}>{inv.player}</button>
                      {' '}<span style={{ color: '#3b82f6', fontWeight: 'bold' }}>(+{inv.amount} {t('點', 'pts')})</span>
                    </span>
                    {inv.timestamp > 0 && <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{new Date(inv.timestamp).toLocaleDateString()}</span>}
                  </div>
                ))}
              </div>
            );
          })()}

          {/* People I referred: name → their garden, how many they referred, reading progress */}
          <div>
            <h4 style={{ color: '#0f766e', marginTop: 0, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Sprout size={18} /> {t('我推薦的朋友', 'Friends I referred')}
              {Array.isArray(myReferees) && myReferees.length > 0 && (
                <span style={{ background: '#ccfbf1', color: '#0f766e', borderRadius: '10px', padding: '1px 8px', fontSize: '0.75rem' }}>{myReferees.length}</span>
              )}
            </h4>
            {myReferees === null ? (
              <div style={{ padding: '1rem', color: '#94a3b8', fontSize: '0.9rem', textAlign: 'center' }}>{t('載入中…', 'Loading…')}</div>
            ) : myReferees.length === 0 ? (
              <div style={{ padding: '1.5rem', background: '#fff', border: '1px dashed #cbd5e1', borderRadius: '8px', color: '#94a3b8', textAlign: 'center', fontSize: '0.9rem' }}>
                {t('還沒有朋友透過你的邀請加入。', 'No one has joined through your invite yet.')}
              </div>
            ) : (() => {
              // Two tiers: friends who already cleared a verse (referral
              // recorded, points paid) and friends who only registered so far.
              const activeReferees = myReferees.filter(r => !r.pending);
              const pendingReferees = myReferees.filter(r => r.pending);
              const totalPages = Math.ceil(activeReferees.length / HISTORY_PAGE_SIZE);
              const page = Math.max(1, Math.min(refereesPage, totalPages));
              const sliced = activeReferees.slice((page - 1) * HISTORY_PAGE_SIZE, page * HISTORY_PAGE_SIZE);
              const statsLoading = refereeGardenStats === null;
              const pendingPages = Math.ceil(pendingReferees.length / HISTORY_PAGE_SIZE);
              const pendingPage = Math.max(1, Math.min(pendingRefereesPage, pendingPages));
              const pendingSliced = pendingReferees.slice((pendingPage - 1) * HISTORY_PAGE_SIZE, pendingPage * HISTORY_PAGE_SIZE);
              return (
                <>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {sliced.map((r) => {
                      const st = statsLoading ? null : refereeGardenStats[r.name];
                      const pts = (referralHistory || []).filter(h => h.type === 'referred' && h.player === r.name).reduce((sum, h) => sum + (h.amount || 0), 0);
                      return (
                        <div key={r.name} style={{ background: '#fff', padding: '10px 15px', borderRadius: '8px', borderLeft: '4px solid #10b981', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', fontSize: '0.9rem', color: '#475569', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                          <div style={{ flex: 1, minWidth: '160px' }}>
                            <button type="button" onClick={() => handleViewPlayerGarden(r.name)} title={t('查看園子', 'View garden')} style={{ background: 'none', border: 'none', padding: 0, color: '#0f766e', fontWeight: 'bold', fontSize: '1rem', cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: '3px' }}>{r.name}</button>
                            {(r.joinedAt > 0 || pts > 0) && (
                              <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '2px' }}>
                                {r.joinedAt > 0 && <>{t('加入於', 'Joined')} {new Date(r.joinedAt).toLocaleDateString()}</>}
                                {pts > 0 && <span style={{ color: '#10b981', fontWeight: 'bold', marginLeft: r.joinedAt > 0 ? '8px' : 0 }}>+{pts} {t('點', 'pts')}</span>}
                              </div>
                            )}
                            <div style={{ marginTop: '6px', display: 'flex', gap: '14px', flexWrap: 'wrap', alignItems: 'center' }}>
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><Users size={14} /> {t('推薦了', 'Referred')} <strong style={{ color: '#0369a1' }}>{r.referredCount}</strong> {t('人', 'people')}</span>
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><TreePine size={14} /> {statsLoading ? '…' : st ? <><strong style={{ color: '#15803d' }}>{st.plants}</strong> {t('棵樹', 'trees')}</> : t('尚未種樹', 'No trees yet')}</span>
                              {st && <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><Apple size={14} /> <strong style={{ color: '#ea580c' }}>{st.fruits}</strong> {t('果子', 'fruits')}</span>}
                            </div>
                          </div>
                          <button type="button" onClick={() => handleViewPlayerGarden(r.name)} style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', color: '#047857', borderRadius: '8px', padding: '6px 12px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>{t('查看園子', 'View garden')} →</button>
                        </div>
                      );
                    })}
                  </div>
                  {totalPages > 1 && (
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginTop: '10px' }}>
                      <button onClick={() => setRefereesPage(p => Math.max(1, p - 1))} disabled={page <= 1} style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', background: page <= 1 ? '#f1f5f9' : '#fff', color: page <= 1 ? '#94a3b8' : '#334155', cursor: page <= 1 ? 'default' : 'pointer', fontWeight: 'bold' }}>‹</button>
                      {Array.from({ length: totalPages }, (_, idx) => (
                        <button key={idx} onClick={() => setRefereesPage(idx + 1)} style={{ padding: '4px 10px', borderRadius: '6px', border: 'none', background: page === idx + 1 ? '#0f766e' : '#f1f5f9', color: page === idx + 1 ? '#fff' : '#334155', cursor: 'pointer', fontWeight: 'bold' }}>{idx + 1}</button>
                      ))}
                      <button onClick={() => setRefereesPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', background: page >= totalPages ? '#f1f5f9' : '#fff', color: page >= totalPages ? '#94a3b8' : '#334155', cursor: page >= totalPages ? 'default' : 'pointer', fontWeight: 'bold' }}>›</button>
                    </div>
                  )}
                  {pendingReferees.length > 0 && (
                    <div style={{ marginTop: '14px' }}>
                      <div style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 700, marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        ⏳ {t('已加入，還沒開始', 'Joined, not started yet')}
                        <span style={{ background: '#f1f5f9', color: '#64748b', borderRadius: '10px', padding: '1px 8px', fontSize: '0.75rem' }}>{pendingReferees.length}</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {pendingSliced.map((r) => (
                          <div key={r.name} style={{ background: '#f8fafc', padding: '8px 15px', borderRadius: '8px', borderLeft: '4px solid #cbd5e1', fontSize: '0.88rem', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
                            <div style={{ flex: 1, minWidth: '160px' }}>
                              <button type="button" onClick={() => handleViewPlayerGarden(r.name)} title={t('查看園子', 'View garden')} style={{ background: 'none', border: 'none', padding: 0, color: '#475569', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.95rem' }}>{r.name}</button>
                              <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '2px' }}>
                                {r.joinedAt > 0 && <>{t('加入於', 'Joined')} {new Date(r.joinedAt).toLocaleDateString()} · </>}
                                {r.passedVerses > 0
                                  ? t('已通過 {n} 節', '{n} verses passed').replace('{n}', String(r.passedVerses))
                                  : t('還沒通過經文，提醒他來玩吧！', 'No verse cleared yet, give them a nudge!')}
                              </div>
                            </div>
                            {(() => {
                              const nudged = (nudgedUntil[r.name] || 0) > Date.now();
                              const busy = nudgeBusyName === r.name;
                              const btn = { borderRadius: '8px', padding: '5px 10px', fontSize: '0.8rem', fontWeight: 'bold', cursor: 'pointer', whiteSpace: 'nowrap' };
                              return (
                                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                  {!(r.passedVerses > 0) && (
                                    <button type="button" data-testid="referee-nudge" disabled={nudged || busy} onClick={() => nudgeReferee(r.name)} style={{ ...btn, background: nudged ? '#f1f5f9' : '#ecfdf5', border: `1px solid ${nudged ? '#e2e8f0' : '#a7f3d0'}`, color: nudged ? '#94a3b8' : '#047857', cursor: nudged || busy ? 'default' : 'pointer' }}>
                                      {nudged ? t('已提醒 ✓', 'Reminded ✓') : busy ? t('送出中…', 'Sending…') : `🔔 ${t('提醒他', 'Nudge')}`}
                                    </button>
                                  )}
                                </div>
                              );
                            })()}
                          </div>
                        ))}
                      </div>
                    {pendingPages > 1 && (
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginTop: '10px' }}>
                        <button onClick={() => setPendingRefereesPage(p => Math.max(1, p - 1))} disabled={pendingPage <= 1} style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', background: pendingPage <= 1 ? '#f1f5f9' : '#fff', color: pendingPage <= 1 ? '#94a3b8' : '#334155', cursor: pendingPage <= 1 ? 'default' : 'pointer', fontWeight: 'bold' }}>‹</button>
                        {Array.from({ length: pendingPages }, (_, idx) => (
                          <button key={idx} onClick={() => setPendingRefereesPage(idx + 1)} style={{ padding: '4px 10px', borderRadius: '6px', border: 'none', background: pendingPage === idx + 1 ? '#0f766e' : '#f1f5f9', color: pendingPage === idx + 1 ? '#fff' : '#334155', cursor: 'pointer', fontWeight: 'bold' }}>{idx + 1}</button>
                        ))}
                        <button onClick={() => setPendingRefereesPage(p => Math.min(pendingPages, p + 1))} disabled={pendingPage >= pendingPages} style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', background: pendingPage >= pendingPages ? '#f1f5f9' : '#fff', color: pendingPage >= pendingPages ? '#94a3b8' : '#334155', cursor: pendingPage >= pendingPages ? 'default' : 'pointer', fontWeight: 'bold' }}>›</button>
                      </div>
                    )}
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '6px' }}>{t('朋友第一次通過一節經文後，就會升到上面的名單，你也會拿到推薦獎勵。', 'Once a friend clears their first verse they move up to the list above and you receive the referral reward.')}</div>
                    </div>
                  )}
                </>
              );
            })()}
          </div>

          {/* 商家推薦獎勵 — 2.5% of every redemption at a shop this account introduced */}
          {userEmail && merchantRefBonus && !merchantRefBonus.error && (() => {
            const items = merchantRefBonus.items || [];
            const totalPages = Math.max(1, Math.ceil(items.length / HISTORY_PAGE_SIZE));
            const page = Math.min(merchantRefBonusPage, totalPages);
            const sliced = items.slice((page - 1) * HISTORY_PAGE_SIZE, page * HISTORY_PAGE_SIZE);
            const fmtDate = (at) => { const d = new Date(at); return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' }); };
            const num = (v) => Number(v || 0).toLocaleString();
            return (
              <div style={{ marginTop: '1.5rem' }} data-testid="merchant-ref-bonus">
                <h4 style={{ margin: '0 0 0.6rem', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <Store size={18} /> {t('商家推薦獎勵', 'Merchant referral rewards')}
                  <span style={{ marginLeft: 'auto', background: '#fef3c7', color: '#92400e', borderRadius: '10px', padding: '2px 10px', fontSize: '0.8rem', fontWeight: 'bold' }}>{t('累計獲得 {n} 點', '{n} pts earned in total').replace('{n}', num(merchantRefBonus.totalBonus))}</span>
                </h4>
                {items.length === 0 ? (
                  <div style={{ color: '#94a3b8', fontSize: '0.85rem', lineHeight: 1.5 }}>{t('推薦商家登記到地圖上，之後每筆核銷你都會獲得顧客所用點數的 2.5%。', 'Refer a shop to the map and earn 2.5% of the points every customer spends there.')}</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {sliced.map((it, idx) => (
                      <div key={`${it.code}-${it.kind}-${idx}`} style={{ background: it.kind === 'reversed' ? '#f8fafc' : '#fff', padding: '10px 15px', borderRadius: '8px', borderLeft: `4px solid ${it.kind === 'reversed' ? '#cbd5e1' : '#d97706'}`, boxShadow: '0 1px 2px rgba(0,0,0,0.05)', fontSize: '0.9rem', color: it.kind === 'reversed' ? '#94a3b8' : '#475569', lineHeight: 1.5 }}>
                        {it.kind === 'reversed'
                          ? t('{place}，{date}，折扣券已作廢，收回 {bonus} 點', '{place}, {date}: coupon voided, {bonus} pts reversed').replace('{place}', String(it.placeName || '')).replace('{date}', fmtDate(it.at)).replace('{bonus}', num(it.bonus))
                          : t('{place}，{date}，{who} 使用 {points} 點，因此你也獲得 {bonus} 點', '{place}, {date}: {who} used {points} pts, so you also earned {bonus} pts').replace('{place}', String(it.placeName || '')).replace('{date}', fmtDate(it.at)).replace('{who}', String(it.playerName || '')).replace('{points}', num(it.points)).replace('{bonus}', num(it.bonus))}
                      </div>
                    ))}
                  </div>
                )}
                {totalPages > 1 && (
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginTop: '10px' }}>
                    <button type="button" onClick={() => setMerchantRefBonusPage(p => Math.max(1, p - 1))} disabled={page <= 1} style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', background: page <= 1 ? '#f1f5f9' : '#fff', color: page <= 1 ? '#94a3b8' : '#334155', cursor: page <= 1 ? 'default' : 'pointer', fontWeight: 'bold' }}>‹</button>
                    <span style={{ padding: '4px 6px', color: '#475569', fontSize: '0.85rem' }}>{page} / {totalPages}</span>
                    <button type="button" onClick={() => setMerchantRefBonusPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', background: page >= totalPages ? '#f1f5f9' : '#fff', color: page >= totalPages ? '#94a3b8' : '#334155', cursor: page >= totalPages ? 'default' : 'pointer', fontWeight: 'bold' }}>›</button>
                  </div>
                )}
              </div>
            );
          })()}

          {/* 愛心行動投入紀錄 — points this account put into Love in Action projects (burned, never refunded) */}
          {userEmail && charityMine && !charityMine.error && (() => {
            const items = charityMine.contributed || [];
            const totalPts = items.reduce((a, c) => a + (Number(c.points) || 0), 0);
            const totalNTD = items.reduce((a, c) => a + (Number(c.ntd) || 0), 0);
            const totalPages = Math.max(1, Math.ceil(items.length / HISTORY_PAGE_SIZE));
            const page = Math.min(charityContribPage, totalPages);
            const sliced = items.slice((page - 1) * HISTORY_PAGE_SIZE, page * HISTORY_PAGE_SIZE);
            const fmtDate = (at) => { const d = new Date(at); return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' }); };
            return (
              <div style={{ marginTop: '1.5rem' }} data-testid="garden-charity-contribs">
                <h4 style={{ margin: '0 0 0.6rem', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <Heart size={18} color="#e11d48" /> {t('愛心行動投入紀錄', 'Love in Action contributions')}
                  <span style={{ marginLeft: 'auto', background: '#fff1f2', color: '#9f1239', borderRadius: '10px', padding: '2px 10px', fontSize: '0.8rem', fontWeight: 'bold' }}>{t('累計投入 {p} 點 → 折抵額度 NT${n}', '{p} pts contributed in total → NT${n} of allowance').replace('{p}', totalPts.toLocaleString()).replace('{n}', String(totalNTD))}</span>
                </h4>
                {items.length === 0 ? (
                  <div style={{ color: '#94a3b8', fontSize: '0.85rem', lineHeight: 1.5 }}>{t('還沒有投入過。到「愛心行動」看看有哪些專案。', 'No contributions yet. See which Love in Action projects you can support.')}</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {sliced.map((c, idx) => (
                      <div key={`${c.id || idx}`} style={{ background: '#fff', padding: '10px 15px', borderRadius: '8px', borderLeft: '4px solid #e11d48', display: 'flex', justifyContent: 'space-between', gap: '0.5rem', flexWrap: 'wrap', fontSize: '0.88rem', color: '#334155' }}>
                        <span>{fmtDate(c.at)} · ❤️ {c.poolName}</span>
                        <span style={{ color: '#9f1239', fontWeight: 700 }}>{t('{p} 點 → 額度 NT${n}', '{p} pts → NT${n} allowance').replace('{p}', Number(c.points || 0).toLocaleString()).replace('{n}', String(c.ntd || 0))}</span>
                      </div>
                    ))}
                  </div>
                )}
                {totalPages > 1 && (
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginTop: '10px' }}>
                    <button type="button" onClick={() => setCharityContribPage(p => Math.max(1, p - 1))} disabled={page <= 1} style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', cursor: page <= 1 ? 'default' : 'pointer' }}>‹</button>
                    <span style={{ padding: '4px 6px', color: '#475569', fontSize: '0.85rem' }}>{page} / {totalPages}</span>
                    <button type="button" onClick={() => setCharityContribPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', cursor: page >= totalPages ? 'default' : 'pointer' }}>›</button>
                  </div>
                )}
                <button type="button" onClick={() => setMainTab('charity')} style={{ marginTop: '0.6rem', background: 'transparent', border: '1px solid #fecdd3', color: '#be123c', borderRadius: 6, padding: '0.3rem 0.8rem', cursor: 'pointer', fontWeight: 700, fontSize: '0.82rem' }}>❤️ {t('看看有哪些愛心行動', 'See the Love in Action projects')}</button>
              </div>
            );
          })()}

          {/* 讀經比賽：我參加的活動進度與排行榜名次 */}
          {userEmail && contestMine && !contestMine.error && (contestMine.joined || []).length > 0 && (
            <div style={{ marginTop: '1.5rem' }} data-testid="garden-contests">
              <h4 style={{ margin: '0 0 0.6rem', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <BookOpen size={18} color="#2563eb" /> {t('讀經比賽', 'Reading contests')}
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {contestMine.joined.map(c => {
                  const p = contestProgress(c);
                  return (
                    <div key={c.id} style={{ background: '#fff', padding: '10px 15px', borderRadius: '8px', borderLeft: '4px solid #2563eb', fontSize: '0.88rem', color: '#334155' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <span>📖 {c.name}</span>
                        <span style={{ color: '#1e40af', fontWeight: 700 }}>{p.passed} / {p.total} {t('節', 'verses')}{c.completedByMe ? ' ✅' : ''}</span>
                      </div>
                      {c.accepted && <div style={{ color: '#64748b', fontSize: '0.8rem', marginTop: 2 }}>⚔️ {t('分數 {s}（第 {r} 名）', 'Score {s} (rank #{r})').replace('{s}', String(c.myScore || 0)).replace('{r}', c.myRank ? String(c.myRank) : '—')}</div>}
                    </div>
                  );
                })}
              </div>
              <button type="button" onClick={() => setMainTab('contests')} style={{ marginTop: '0.6rem', background: 'transparent', border: '1px solid #bfdbfe', color: '#1d4ed8', borderRadius: 6, padding: '0.3rem 0.8rem', cursor: 'pointer', fontWeight: 700, fontSize: '0.82rem' }}>📖 {t('看看有哪些讀經比賽', 'See the reading contests')}</button>
            </div>
          )}

        </div>
      </div>

    </div>
  );
}
