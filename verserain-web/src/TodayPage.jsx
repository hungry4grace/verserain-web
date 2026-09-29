// TodayPage — the 今日 tab (UI/UX 第 2 階段). Opening the app lands here and
// shows one thing to do today instead of four equal tiles:
//   1. today's verse on the day's illustration, with 聆聽 / 挑戰這節
//   2. 繼續上次 — the verse set last listened to, if any
//   3. a next step that fits the player (log in → first tree → the garden)
//   4. 話語甘霖 — the daily player with its picker (每日經文 / 我的最愛 / 主題)
import { Headphones, Zap, CloudRain, Play, TreePine, LogIn } from 'lucide-react';
import { Button } from './ui';
import { DAILY_RAIN_DROPS } from './player/rainConstants.js';

const card = {
  background: 'var(--color-surface)', border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-md)', padding: 'var(--space-4) var(--space-5)',
};
const label = { margin: 0, fontSize: 'var(--fs-small)', fontWeight: 700, color: 'var(--color-text-2)' };
// The nearer, bigger drops from the rain player, fewer and fainter (the CSS
// stops them in 長輩／省電 mode and for reduced motion).
const HERO_DROPS = DAILY_RAIN_DROPS.filter((d) => d.depth > 1).slice(0, 22);

export default function TodayPage({
  t, dateLocale, streak = 0,
  verse, verseLoading, bgUrls = [], onListen, onChallenge, onOpenRain,
  lastListen, onContinue,
  loggedIn, treesPlanted = 0, onLogin, onGarden,
}) {
  const dateText = new Date().toLocaleDateString(dateLocale || undefined, { month: 'long', day: 'numeric', weekday: 'long' });
  return (
    <div data-testid="today-page" style={{ maxWidth: 560, margin: '0 auto', padding: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', color: 'var(--color-text)' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 'var(--fs-display)', lineHeight: 1.2 }}>{t('今日', 'Today')}</h1>
          <div style={{ color: 'var(--color-text-2)', fontSize: 'var(--fs-small)', marginTop: 2 }}>{dateText}</div>
        </div>
        {streak > 0 && (
          <span data-testid="today-streak" style={{ background: 'var(--color-warning-soft)', color: 'var(--color-warning)', borderRadius: 'var(--radius-pill)', padding: 'var(--space-1) var(--space-3)', fontWeight: 800, fontSize: 'var(--fs-small)' }}>
            🔥 {t('連續 {n} 天', '{n}-day streak').replace('{n}', String(streak))}
          </span>
        )}
      </div>

      {/* 今天的經文: the day's illustration (the same one the daily player shows)
          behind a dark veil, so white text keeps ≥ 4.5:1 on any picture. The
          second URL is the generated gradient, underneath in case the first
          fails to load. */}
      <section
        data-testid="today-verse"
        className="today-hero"
        style={{ backgroundImage: bgUrls.map((u) => `url("${u}")`).join(', ') || undefined }}
      >
        <div className="today-hero__rain" aria-hidden="true">
          {HERO_DROPS.map((d, i) => (
            <span key={i} style={{ left: d.left, top: d.top, height: d.length, width: d.width, opacity: d.opacity, animationDuration: d.duration, animationDelay: d.delay, '--drift': d.drift }} />
          ))}
        </div>
        <div className="today-hero__body">
          <p className="today-hero__label">{t('今天的經文', "Today's verse")}</p>
          {verse ? (
            <>
              <blockquote className="today-hero__verse">{verse.text}</blockquote>
              <div className="today-hero__ref">{verse.reference}</div>
              <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap', marginTop: 'var(--space-2)' }}>
                <Button icon={<Headphones size={20} />} onClick={onListen}>{t('聆聽', 'Listen')}</Button>
                <Button variant="secondary" icon={<Zap size={20} />} onClick={onChallenge}>{t('挑戰這節', 'Challenge this verse')}</Button>
              </div>
            </>
          ) : (
            <p style={{ margin: 0 }}>{verseLoading ? t('載入中…', 'Loading…') : t('今天的經文還沒準備好', "Today's verse isn't ready yet")}</p>
          )}
        </div>
      </section>

      {lastListen && (
        <section data-testid="today-continue" style={{ ...card, display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 12rem', minWidth: 0 }}>
            <p style={label}>{t('繼續上次', 'Continue')}</p>
            <div style={{ fontWeight: 700, marginTop: 2, overflowWrap: 'anywhere' }}>{lastListen.title}</div>
            {lastListen.ref && <div style={{ color: 'var(--color-text-2)', fontSize: 'var(--fs-small)' }}>{t('上次聽到 {ref}', 'Last: {ref}').replace('{ref}', lastListen.ref)}</div>}
          </div>
          <Button variant="secondary" icon={<Play size={18} />} onClick={onContinue}>{t('繼續', 'Continue')}</Button>
        </section>
      )}

      <section data-testid="today-next" style={{ ...card, background: 'var(--color-success-soft)', borderColor: 'transparent', display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 12rem', minWidth: 0 }}>
          <p style={{ ...label, color: 'var(--color-success-strong)' }}>{t('下一步', 'Next step')}</p>
          <div style={{ marginTop: 2, lineHeight: 1.5 }}>
            {!loggedIn
              ? t('登入後，成績和園子才會存進你的帳號。', 'Log in so your scores and garden are saved to your account.')
              : treesPlanted === 0
                ? t('挑戰今天這節經文，就會在園子種下第一棵樹 🌱', "Challenge today's verse to plant your first tree 🌱")
                : t('你的園子有 {n} 棵樹，去看看它們長得怎樣。', 'Your garden has {n} trees — go see how they are growing.').replace('{n}', String(treesPlanted))}
          </div>
        </div>
        {!loggedIn
          ? <Button variant="secondary" icon={<LogIn size={18} />} onClick={onLogin}>{t('登入', 'Log In')}</Button>
          : treesPlanted > 0 && <Button variant="secondary" icon={<TreePine size={18} />} onClick={onGarden}>{t('看園子', 'See garden')}</Button>}
      </section>

      <button type="button" className="ui-choice ui-choice--card" data-testid="today-rain" onClick={onOpenRain}>
        <CloudRain size={32} color="var(--color-primary)" aria-hidden="true" style={{ flexShrink: 0 }} />
        <span style={{ flex: 1, minWidth: 0 }}>
          <h2 style={{ margin: 0, fontSize: 'var(--fs-heading)' }}>{t('話語甘霖', 'Verse Rain')}</h2>
          <span style={{ display: 'block', color: 'var(--color-text-2)', fontSize: 'var(--fs-small)', fontWeight: 500, marginTop: 2 }}>
            {t('每日經文、我的最愛、主題經文，連續播放', 'Daily verses, favourites and topics, played back to back')}
          </span>
        </span>
      </button>
    </div>
  );
}
