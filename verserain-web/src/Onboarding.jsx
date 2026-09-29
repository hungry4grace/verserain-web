// Onboarding — the first-run three steps (UI/UX 第 3 階段):
//   1. 語言：confirm the language / Bible version (defaults to the phone's),
//      with a 大字（長輩）模式 switch right there
//   2. 聽一節：hear today's verse read aloud
//   3. 挑戰一次：play it with the easiest settings — no mode / difficulty
//      questions — and grow the first tree
// Registration waits until after that first game. Every step can be skipped.
import { useState } from 'react';
import { Headphones, Zap } from 'lucide-react';
import { Button } from './ui';

export default function Onboarding({ t, versions, version, onVersion, elderMode, onElderMode, verse, onListen, onChallenge, onFinish }) {
  const [step, setStep] = useState(0);
  const [heard, setHeard] = useState(false);
  const titles = [t('歡迎來到經文雨', 'Welcome to VerseRain'), t('聽一節經文', 'Listen to a verse'), t('挑戰一次', 'Try a challenge')];

  return (
    <div className="ui-modal-scrim" style={{ zIndex: 'calc(var(--z-modal) - 1)', alignItems: 'stretch' }} data-testid="onboarding">
      <div className="ui-modal" role="dialog" aria-modal="true" aria-labelledby="onb-title" style={{ maxWidth: 460, margin: 'auto 0', maxHeight: '100%' }}>
        <div className="ui-modal__body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', color: 'var(--color-text)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div aria-label={t('第 {n} 步，共 3 步', 'Step {n} of 3').replace('{n}', String(step + 1))} style={{ display: 'flex', gap: 6 }}>
              {[0, 1, 2].map(i => (
                <span key={i} style={{ width: 28, height: 6, borderRadius: 999, background: i <= step ? 'var(--color-primary)' : 'var(--color-border)' }} />
              ))}
            </div>
            <Button variant="text" size="sm" onClick={onFinish} data-testid="onboarding-skip">{t('略過', 'Skip')}</Button>
          </div>
          <h2 id="onb-title" style={{ margin: 0, fontSize: 'var(--fs-title)' }}>🌧️ {titles[step]}</h2>

          {step === 0 && (
            <>
              <p style={{ margin: 0 }}>{t('先確認你要用的語言和聖經譯本。', 'First, check your language and Bible version.')}</p>
              <select
                aria-label={t('聖經譯本', 'Bible version')}
                data-testid="onboarding-version"
                value={version}
                onChange={(e) => onVersion(e.target.value)}
                style={{ minHeight: 'var(--tap-min)', padding: '0 var(--space-3)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', fontSize: 'var(--fs-body)', background: 'var(--color-surface)', color: 'var(--color-text)' }}
              >
                {versions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <button type="button" className="ui-choice" aria-pressed={elderMode} data-testid="onboarding-elder" onClick={() => onElderMode(!elderMode)}>
                <span aria-hidden="true">{elderMode ? '☑' : '☐'}</span>
                <span style={{ flex: 1 }}>
                  <span style={{ display: 'block' }}>{t('大字模式（長輩模式）', 'Large-text mode')}</span>
                  <span style={{ display: 'block', fontWeight: 500, fontSize: 'var(--fs-small)', color: 'var(--color-text-2)' }}>{t('字和按鈕都放大，朗讀慢一點', 'Bigger text and buttons, slower reading')}</span>
                </span>
              </button>
              <Button size="lg" block onClick={() => setStep(1)} data-testid="onboarding-next">{t('下一步', 'Next')}</Button>
            </>
          )}

          {step === 1 && (
            <>
              {verse ? (
                <blockquote style={{ margin: 0, padding: 'var(--space-4)', background: 'var(--color-primary-soft)', borderRadius: 'var(--radius-md)', fontSize: 'var(--fs-heading)', lineHeight: 1.6, fontWeight: 600 }}>
                  {verse.text}
                  <footer style={{ marginTop: 'var(--space-2)', fontSize: 'var(--fs-body)', color: 'var(--color-primary-strong)' }}>{verse.reference}</footer>
                </blockquote>
              ) : (
                <p style={{ margin: 0, color: 'var(--color-text-2)' }}>{t('載入中…', 'Loading…')}</p>
              )}
              <Button size="lg" block variant={heard ? 'secondary' : 'primary'} icon={<Headphones size={22} />} disabled={!verse} onClick={() => { onListen(verse); setHeard(true); }} data-testid="onboarding-listen">
                {heard ? t('再聽一次', 'Listen again') : t('聆聽', 'Listen')}
              </Button>
              <Button size="lg" block variant={heard ? 'primary' : 'secondary'} onClick={() => setStep(2)} data-testid="onboarding-next">{t('下一步', 'Next')}</Button>
            </>
          )}

          {step === 2 && (
            <>
              <p style={{ margin: 0, lineHeight: 1.6 }}>{t('照順序點出這節經文的句子。完成後，你的園子會長出第一棵樹 🌱', 'Tap the phrases of this verse in order. When you finish, your garden grows its first tree 🌱')}</p>
              <Button size="lg" block icon={<Zap size={22} />} disabled={!verse} onClick={() => onChallenge(verse)} data-testid="onboarding-start">{t('開始挑戰', 'Start Challenge')}</Button>
              <Button variant="text" block onClick={onFinish}>{t('先逛逛', 'Look around first')}</Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
