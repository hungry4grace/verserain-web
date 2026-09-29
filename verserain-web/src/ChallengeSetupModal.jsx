// Pick game mode + difficulty at the moment you start a challenge.
//
// This used to live inline in VerseSetContinuousRainPlayer while every other
// surface carried its own pair of <select>s in a toolbar. Two problems with
// that: the toolbar settings were invisible at the moment they mattered (you
// set them once, then forgot what they were three verses later), and each
// surface drifted — different option labels, different difficulty wording.
// One component, opened by every challenge button, fixes both.
//
// Built on the shared Modal / Button (src/ui) — Esc, the scrim and ✕ cancel.
//
// Props:
//   t        — i18n helper (zh, en) => string
//   subtitle — what is being challenged (a formatted verse reference, a set
//              title…). Shown under the header; optional.
//   value    — { mode, difficulty, debug, noReadback }
//   onChange — (next) => void
//   onStart  — (value) => void. Persistence already happened.
//   onCancel — () => void

import { Zap } from 'lucide-react';
import { Button, Modal } from './ui';

const MODE_KEY = 'verserain_reader_challenge_mode';
const DIFF_KEY = 'verserain_reader_challenge_diff';
const DEBUG_KEY = 'verseRain_debugMode';
const READBACK_KEY = 'verseRain_noReadback';

export const CHALLENGE_MODES = ['square_solo', 'rain_solo', 'voice_solo'];

// Last-used settings, so opening the modal never starts from a blank slate.
export function loadChallengeSetup() {
  const out = { mode: 'square_solo', difficulty: 0, debug: false, noReadback: false };
  try {
    const m = localStorage.getItem(MODE_KEY);
    if (CHALLENGE_MODES.includes(m)) out.mode = m;
    const d = parseInt(localStorage.getItem(DIFF_KEY) || '0', 10);
    if (d >= 0 && d <= 3) out.difficulty = d;
    out.debug = localStorage.getItem(DEBUG_KEY) === 'true';
    out.noReadback = localStorage.getItem(READBACK_KEY) === 'true';
  } catch { /* defaults stand */ }
  return out;
}

export function saveChallengeSetup({ mode, difficulty, debug, noReadback }) {
  try {
    localStorage.setItem(MODE_KEY, mode);
    localStorage.setItem(DIFF_KEY, String(difficulty));
    localStorage.setItem(DEBUG_KEY, debug ? 'true' : 'false');
    localStorage.setItem(READBACK_KEY, noReadback ? 'true' : 'false');
  } catch { /* remember-me is best-effort */ }
}

export default function ChallengeSetupModal({ t, subtitle, value, onChange, onStart, onCancel }) {
  if (!value) return null;
  const set = (patch) => onChange({ ...value, ...patch });
  const isVoice = value.mode === 'voice_solo';

  // Difficulty 0–3 = how many decoy blocks appear (distractionLevel in App.jsx):
  // square grid 2×2 → 3×3 with 0–3 decoys, rain mode decoys more often. Voice
  // mode has no decoys, so there it only changes the score bonus (×1.0–×1.3).
  const difficultyName = (d) => [t('入門', 'Easy'), t('一般', 'Normal'), t('進階', 'Hard'), t('高手', 'Expert')][d] || String(d);
  const difficultyDesc = (mode, d) => {
    if (mode === 'voice_solo') return t('語音模式沒有干擾字，難度只影響分數加成。', 'Voice mode has no decoys; difficulty only changes the score bonus.');
    if (mode === 'rain_solo') {
      return [
        t('只掉下正確的句子。', 'Only the right phrases fall.'),
        t('偶爾會掉下一個干擾句。', 'A decoy phrase falls now and then.'),
        t('干擾句比較常出現。', 'Decoy phrases fall more often.'),
        t('干擾句最多，一次可能兩個。', 'The most decoys, sometimes two at once.'),
      ][d];
    }
    return [
      t('4 格，沒有干擾字。', '4 tiles, no decoys.'),
      t('4 格，其中 1 格是干擾字。', '4 tiles, one of them a decoy.'),
      t('9 格，其中 2 格是干擾字。', '9 tiles, two of them decoys.'),
      t('9 格，其中 3 格是干擾字。', '9 tiles, three of them decoys.'),
    ][d];
  };
  const sectionLabel = { fontSize: 'var(--fs-small)', fontWeight: 700, color: 'var(--color-text-2)', margin: '0 0 var(--space-2)' };

  return (
    <Modal
      open
      title={`⚡ ${t('挑戰', 'Challenge')}`}
      closeLabel={t('關閉', 'Close')}
      onClose={onCancel}
      testId="challenge-setup"
      footer={
        <>
          <Button variant="text" onClick={onCancel}>{t('取消', 'Cancel')}</Button>
          <Button size="lg" icon={<Zap size={20} />} onClick={() => { saveChallengeSetup(value); onStart(value); }}>
            {t('開始挑戰', 'Start Challenge')}
          </Button>
        </>
      }
    >
      {subtitle && <p style={{ margin: '0 0 var(--space-4)', color: 'var(--color-text-2)', fontSize: 'var(--fs-small)' }}>{subtitle}</p>}

      <h3 style={sectionLabel}>{t('遊戲模式', 'Game Mode')}</h3>
      <div role="group" aria-label={t('遊戲模式', 'Game Mode')} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
        {[
          { value: 'square_solo', icon: '🔢', label: t('九宮格', 'Square') },
          { value: 'rain_solo', icon: '🌧️', label: t('經文雨', 'Verse Rain') },
          { value: 'voice_solo', icon: '🎤', label: t('語音模式', 'Voice Mode') },
        ].map((opt) => (
          <button key={opt.value} type="button" className="ui-choice" aria-pressed={value.mode === opt.value} onClick={() => set({ mode: opt.value })}>
            <span aria-hidden="true">{opt.icon}</span><span style={{ flex: 1 }}>{opt.label}</span>
          </button>
        ))}
      </div>

      <h3 style={sectionLabel}>{t('難度', 'Difficulty')}</h3>
      <div role="group" aria-label={t('難度', 'Difficulty')} style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
        {[0, 1, 2, 3].map((d) => (
          <button key={d} type="button" className="ui-choice ui-choice--center" aria-pressed={value.difficulty === d} data-testid={`challenge-difficulty-${d}`} onClick={() => set({ difficulty: d })}>
            {difficultyName(d)}
          </button>
        ))}
      </div>
      <p data-testid="challenge-difficulty-desc" style={{ margin: isVoice ? '0 0 var(--space-4)' : 0, color: 'var(--color-text-2)', fontSize: 'var(--fs-small)', lineHeight: 1.5 }}>
        {difficultyDesc(value.mode, value.difficulty)}
        {value.difficulty > 0 && <span style={{ color: 'var(--color-success)', fontWeight: 700 }}> · {t('分數 ×{n}', 'Score ×{n}').replace('{n}', (1 + value.difficulty * 0.1).toFixed(1))}</span>}
      </p>

      {isVoice && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          <button type="button" className="ui-choice" aria-pressed={!!value.noReadback} onClick={() => set({ noReadback: !value.noReadback })}>
            <span aria-hidden="true">{value.noReadback ? '☑' : '☐'}</span>
            <span style={{ flex: 1 }}>⏩ {t('不要複誦我背過的經文(比較順暢)', 'Do not repeat what I just recited (faster flow)')}</span>
          </button>
          <button type="button" className="ui-choice" aria-pressed={!!value.debug} onClick={() => set({ debug: !value.debug })}>
            <span aria-hidden="true">{value.debug ? '☑' : '☐'}</span>
            <span style={{ flex: 1 }}>🔍 {t('顯示除錯資訊(期待 vs 聽見)', 'Show debug (expects vs heard)')}</span>
          </button>
        </div>
      )}
    </Modal>
  );
}
