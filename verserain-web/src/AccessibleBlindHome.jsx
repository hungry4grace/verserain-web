// Moved out of App.jsx unchanged (UI/UX 第 4 階段).
import React from 'react';

export function AccessibleBlindHome({
  verseSets,
  currentSet,
  randomPickCount,
  setRandomPickCount,
  onSelectSet,
  onStart,
  onReadGuide,
  t
}) {
  const [localSetId, setLocalSetId] = React.useState(currentSet?.id || verseSets?.[0]?.id || '');
  const selectedSet = React.useMemo(
    () => verseSets.find(set => set.id === localSetId) || currentSet || verseSets[0],
    [verseSets, localSetId, currentSet]
  );
  const verseCount = selectedSet?.verses?.length || 0;

  React.useEffect(() => {
    if (currentSet?.id) setLocalSetId(currentSet.id);
  }, [currentSet?.id]);

  const startCount = Math.min(verseCount || 1, Math.max(1, parseInt(randomPickCount) || 1));

  return (
    <section
      role="region"
      aria-labelledby="accessible-blind-title"
      onKeyDown={(e) => {
        if (e.key === 'Enter') onStart(selectedSet, startCount);
        if (e.key.toLowerCase() === 'h') onReadGuide(selectedSet, startCount);
      }}
      tabIndex={0}
      style={{
        minHeight: 'calc(100dvh - 120px)',
        background: '#050505',
        color: '#f8fafc',
        margin: '-0.5rem',
        padding: 'clamp(1rem, 4vw, 3rem)',
        borderRadius: '12px',
        outline: '4px solid #facc15',
        outlineOffset: '-4px'
      }}
    >
      <div aria-live="polite" style={{ position: 'absolute', left: '-9999px' }}>
        {t('你在視障友善版。按 Enter 開始，按 H 聽操作說明。', 'Accessible mode. Press Enter to start, H for instructions.')}
      </div>

      <div style={{ maxWidth: '980px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div style={{ borderBottom: '3px solid #facc15', paddingBottom: '1rem' }}>
          <p style={{ margin: '0 0 0.5rem', color: '#facc15', fontWeight: 'bold', fontSize: '1rem' }}>
            {t('完全視障友善版', 'Fully Accessible Mode')}
          </p>
          <h1 id="accessible-blind-title" style={{ margin: 0, fontSize: 'clamp(2.2rem, 7vw, 4.5rem)', lineHeight: 1.05, letterSpacing: 0 }}>
            {t('聽見、背誦、通關', 'Listen, Recite, Complete')}
          </h1>
        </div>

        <p style={{ margin: 0, color: '#e2e8f0', fontSize: 'clamp(1.15rem, 3vw, 1.6rem)', lineHeight: 1.7, maxWidth: '820px' }}>
          {t('這一版不需要看方塊。系統會讀出經文出處，停頓，然後用語音引導你背誦。請允許麥克風，照著提示開口唸出經文。', 'This version does not require seeing blocks. The app reads the reference, pauses, then guides you by voice. Allow microphone access and recite aloud.')}
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontWeight: 'bold', fontSize: '1.1rem' }}>
            {t('選擇經文組', 'Choose Verse Set')}
            <select
              value={localSetId}
              onChange={(e) => {
                setLocalSetId(e.target.value);
                onSelectSet(e.target.value);
              }}
              aria-label={t('選擇經文組', 'Choose verse set')}
              style={{ fontSize: '1.2rem', padding: '1rem', borderRadius: '8px', border: '3px solid #facc15', background: '#111827', color: '#fff', fontWeight: 'bold' }}
            >
              {verseSets.map(set => (
                <option key={set.id} value={set.id}>{set.title} ({set.verses?.length || 0})</option>
              ))}
            </select>
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontWeight: 'bold', fontSize: '1.1rem' }}>
            {t('本次經文數量', 'Number of Verses')}
            <input
              type="number"
              min="1"
              max={Math.max(1, verseCount)}
              value={startCount}
              onChange={(e) => setRandomPickCount(Math.min(Math.max(1, parseInt(e.target.value) || 1), Math.max(1, verseCount)))}
              aria-label={t('本次經文數量', 'Number of verses')}
              style={{ fontSize: '1.4rem', padding: '1rem', borderRadius: '8px', border: '3px solid #facc15', background: '#111827', color: '#fff', fontWeight: 'bold' }}
            />
          </label>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
          <button
            onClick={() => onStart(selectedSet, startCount)}
            style={{ flex: '1 1 280px', background: '#facc15', color: '#050505', border: 'none', borderRadius: '10px', padding: '1.4rem 1.6rem', fontSize: '1.35rem', fontWeight: 900, cursor: 'pointer' }}
            aria-label={t('開始視障版，{title}，{n}節經文', 'Start accessible mode, {title}, {n} verses').replace('{title}', String(selectedSet?.title || '')).replace('{n}', String(startCount))}
          >
            {t('開始視障版', 'Start Accessible Mode')}
          </button>
          <button
            onClick={() => onReadGuide(selectedSet, startCount)}
            style={{ flex: '1 1 220px', background: '#0f172a', color: '#fff', border: '3px solid #93c5fd', borderRadius: '10px', padding: '1.4rem 1.6rem', fontSize: '1.2rem', fontWeight: 800, cursor: 'pointer' }}
          >
            {t('朗讀操作說明', 'Read Instructions')}
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.8rem' }}>
          {[
            t('Enter：開始挑戰', 'Enter: Start'),
            t('H：朗讀說明', 'H: Read help'),
            t('Esc：遊戲中離開', 'Esc: Exit in game'),
            t('請先允許麥克風', 'Allow microphone first')
          ].map((item) => (
            <div key={item} style={{ border: '2px solid #334155', background: '#0f172a', borderRadius: '8px', padding: '1rem', fontSize: '1.05rem', fontWeight: 'bold' }}>
              {item}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
