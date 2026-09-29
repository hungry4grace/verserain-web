// 播放方式: how a verse set is played back — moved out of App.jsx unchanged (UI/UX 第 4 階段).
import { PLAY_DURATION_OPTIONS, PLAY_FONT_OPTIONS, PLAY_INK_OPTIONS } from '../lib/bible.js';

export default function PlayOrderModal({ t, playOrderChooser, selectedPlayDuration, selectedPlayFont, selectedPlayInk, setPlayDurationChoice, setPlayFontChoice, setPlayInkChoice, setPlayOrderChooser, setVoiceChoice, startContinuousPlay, voiceChoice, voiceOptions }) {
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1200, padding: '1rem' }} onClick={(e) => { if (e.target === e.currentTarget) setPlayOrderChooser(null); }}>
      <div style={{ background: '#fff', borderRadius: '14px', padding: '1.6rem 1.5rem', width: '100%', maxWidth: '380px', boxShadow: '0 20px 40px rgba(0,0,0,0.25)', textAlign: 'center' }}>
        <h3 style={{ margin: '0 0 0.3rem', color: '#1e293b' }}>{t('播放方式', 'Play Mode')}</h3>
        <p style={{ margin: '0 0 1.2rem', color: '#64748b', fontSize: '0.9rem' }}>
          {playOrderChooser.title} · {selectedPlayDuration.minutes
            ? t('{n} 分鐘後停止', 'Stops after {n} min').replace('{n}', selectedPlayDuration.minutes)
            : t('無限循環播放', 'Loops forever')}
        </p>
        <div style={{ margin: '0 0 1.1rem', textAlign: 'left' }}>
          <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '0.5rem', fontWeight: 600 }}>
            ⏱️ {t('播放時間', 'Duration')}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '0.45rem' }}>
            {PLAY_DURATION_OPTIONS.map(option => {
              const active = option.value === selectedPlayDuration.value;
              const labelText = option.minutes
                ? t('{n}分', '{n}m').replace('{n}', option.minutes)
                : t('無限', '∞');
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setPlayDurationChoice(option.value)}
                  style={{
                    padding: '0.52rem 0.35rem',
                    borderRadius: '999px',
                    border: active ? '2px solid #2563eb' : '1px solid #cbd5e1',
                    background: active ? '#eff6ff' : '#fff',
                    color: active ? '#1d4ed8' : '#475569',
                    fontWeight: active ? 800 : 600,
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {labelText}
                </button>
              );
            })}
          </div>
        </div>
        <div style={{ margin: '0 0 1.1rem', textAlign: 'left' }}>
          <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '0.5rem', fontWeight: 600 }}>
            Aa {t('字體大小', 'Font size')}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '0.45rem' }}>
            {PLAY_FONT_OPTIONS.map(option => {
              const active = option.value === selectedPlayFont.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setPlayFontChoice(option.value)}
                  style={{
                    padding: '0.52rem 0.35rem',
                    borderRadius: '999px',
                    border: active ? '2px solid #2563eb' : '1px solid #cbd5e1',
                    background: active ? '#eff6ff' : '#fff',
                    color: active ? '#1d4ed8' : '#475569',
                    fontWeight: active ? 800 : 600,
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {t(option.label, option.enLabel)}
                </button>
              );
            })}
          </div>
        </div>
        <div style={{ margin: '0 0 1.1rem', textAlign: 'left' }}>
          <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '0.5rem', fontWeight: 600 }}>
            🎨 {t('字體顏色', 'Font color')}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '0.45rem' }}>
            {PLAY_INK_OPTIONS.map(option => {
              const active = option.value === selectedPlayInk.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setPlayInkChoice(option.value)}
                  style={{
                    padding: '0.52rem 0.35rem',
                    borderRadius: '999px',
                    border: active ? '2px solid #2563eb' : '1px solid #cbd5e1',
                    background: active ? '#eff6ff' : '#fff',
                    color: active ? '#1d4ed8' : '#475569',
                    fontWeight: active ? 800 : 600,
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.35rem'
                  }}
                >
                  <span aria-hidden="true" style={{ width: 14, height: 14, borderRadius: '50%', background: option.swatch, border: '1px solid #94a3b8', flex: '0 0 auto' }} />
                  {t(option.label, option.enLabel)}
                </button>
              );
            })}
          </div>
        </div>
        {voiceOptions && (voiceOptions.ownerHasVoice || voiceOptions.contributors.length > 0) && (() => {
          const pill = (active) => ({
            padding: '0.5rem 0.75rem', borderRadius: '999px', border: active ? '2px solid #8b5cf6' : '1px solid #cbd5e1',
            background: active ? '#f5f3ff' : '#fff', color: active ? '#6d28d9' : '#475569', fontWeight: active ? 700 : 500,
            fontSize: '0.85rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5,
          });
          const isSel = (pred) => voiceChoice ? pred(voiceChoice) : false;
          return (
            <div style={{ margin: '0 0 1.1rem', textAlign: 'left' }}>
              <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '0.5rem', fontWeight: 600 }}>
                🔊 {t('聲音來源', 'Voice')}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {/* Auto = current default (your own › author › TTS). */}
                <button onClick={() => setVoiceChoice(null)} style={pill(!voiceChoice)}>
                  ✨ {t('自動', 'Auto')}
                </button>
                <button onClick={() => setVoiceChoice({ type: 'tts' })} style={pill(isSel(v => v.type === 'tts'))}>
                  💻 {t('電腦語音', 'Computer voice')}
                </button>
                {voiceOptions.ownerHasVoice && (
                  <button onClick={() => setVoiceChoice({ type: 'owner' })} style={pill(isSel(v => v.type === 'owner'))}>
                    🎙️ {voiceOptions.ownerName ? t('作者:{n}', 'Author: {n}').replace('{n}', voiceOptions.ownerName) : t('作者錄音', 'Author')}
                  </button>
                )}
                {voiceOptions.contributors.map((c) => {
                  const mine = voiceOptions.mineId && c.ownerId === voiceOptions.mineId;
                  const active = isSel(v => v.type === 'personal' && v.ownerId === c.ownerId);
                  return (
                    <button key={c.ownerId} onClick={() => setVoiceChoice({ type: 'personal', ownerId: c.ownerId, label: c.recordedBy })} style={pill(active)}>
                      🎙️ {c.recordedBy || t('某人', 'Someone')}{mine ? ` ${t('(你)', '(you)')}` : ''}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })()}
        <div style={{ display: 'flex', gap: '0.8rem' }}>
          <button
            onClick={() => startContinuousPlay(playOrderChooser, 'random')}
            style={{ flex: 1, padding: '0.9rem 0.5rem', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg, #a78bfa, #8b5cf6)', color: '#fff', fontWeight: 'bold', fontSize: '1rem', cursor: 'pointer' }}
          >
            🔀 {t('隨機', 'Shuffle')}
          </button>
          <button
            onClick={() => startContinuousPlay(playOrderChooser, 'sequential')}
            style={{ flex: 1, padding: '0.9rem 0.5rem', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg, #60a5fa, #3b82f6)', color: '#fff', fontWeight: 'bold', fontSize: '1rem', cursor: 'pointer' }}
          >
            🔁 {t('按序', 'In Order')}
          </button>
        </div>
        <button onClick={() => setPlayOrderChooser(null)} style={{ marginTop: '0.9rem', background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '0.9rem' }}>
          {t('取消', 'Cancel')}
        </button>
      </div>
    </div>
  );
}
