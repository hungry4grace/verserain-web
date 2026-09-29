// TodayPage — the 今日 tab (UI/UX 第 2 階段). Opening the app lands here and
// shows one thing to do today instead of four equal tiles:
//   1. today's verse, with 聆聽 / 挑戰這節
//   2. 繼續上次 — the verse set last listened to, if any
//   3. a next step that fits the player (log in → first tree → the garden)
//   4. 話語甘霖 — the daily player with its picker (每日經文 / 我的最愛 / 主題)
import { Headphones, Zap, CloudRain, Play, TreePine, LogIn } from 'lucide-react';
import { Button } from './ui';

const card = {
  background: 'var(--color-surface)', border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-md)', padding: 'var(--space-4) var(--space-5)',
};
const label = { margin: 0, fontSize: 'var(--fs-small)', fontWeight: 700, color: 'var(--color-text-2)' };

export default function TodayPage({
  t, dateLocale, streak = 0,
  verse, verseLoading, onListen, onChallenge, onOpenRain,
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

      <section data-testid="today-verse" style={{ ...card, borderColor: 'var(--color-primary-soft)', boxShadow: '0 4px 16px rgba(37, 99, 235, 0.08)' }}>
        <p style={label}>{t('今天的經文', "Today's verse")}</p>
        {verse ? (
          <>
            <blockquote style={{ margin: 'var(--space-3) 0 var(--space-2)', fontSize: 'var(--fs-title)', lineHeight: 1.55, fontWeight: 600 }}>
              {verse.text}
            </blockquote>
            <div style={{ color: 'var(--color-primary-strong)', fontWeight: 700 }}>{verse.reference}</div>
            <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap', marginTop: 'var(--space-4)' }}>
              <Button icon={<Headphones size={20} />} onClick={onListen}>{t('聆聽', 'Listen')}</Button>
              <Button variant="secondary" icon={<Zap size={20} />} onClick={onChallenge}>{t('挑戰這節', 'Challenge this verse')}</Button>
            </div>
          </>
        ) : (
          <p style={{ margin: 'var(--space-3) 0 0', color: 'var(--color-text-2)' }}>{verseLoading ? t('載入中…', 'Loading…') : t('今天的經文還沒準備好', "Today's verse isn't ready yet")}</p>
        )}
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

      <button type="button" className="ui-choice" data-testid="today-rain" onClick={onOpenRain} style={{ ...card, display: 'flex', alignItems: 'center', gap: 'var(--space-3)', textAlign: 'left', width: '100%' }}>
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
