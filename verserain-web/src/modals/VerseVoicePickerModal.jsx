// Choose whose recorded voice to hear — moved out of App.jsx unchanged (UI/UX 第 4 階段).
import { Headphones, Play } from 'lucide-react';
import { speakText } from '../lib/speech.js';

export default function VerseVoicePickerModal({ t, openVoiceComments, playVerseVoiceOption, setVerseVoicePicker, stopVerseModalAudio, verseVoicePicker, voiceCommentCounts }) {
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1300, padding: '1rem' }} onClick={(e) => { if (e.target === e.currentTarget) setVerseVoicePicker(null); }}>
      <div style={{ background: '#fff', borderRadius: '14px', padding: '1.5rem 1.4rem', width: '100%', maxWidth: '360px', boxShadow: '0 20px 40px rgba(0,0,0,0.25)' }}>
        <h3 style={{ margin: '0 0 0.3rem', color: '#1e293b', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Headphones size={20} color="#10b981" /> {t('選擇聲音', 'Choose a voice')}
        </h3>
        <p style={{ margin: '0 0 1rem', color: '#64748b', fontSize: '0.85rem' }}>{verseVoicePicker.reference}</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
          {verseVoicePicker.options.map((opt, i) => {
            const cnt = opt.ownerId ? voiceCommentCounts[`${verseVoicePicker.reference}||${opt.ownerId}`] : null;
            return (
            <div key={opt.voiceId || i} style={{ display: 'flex', alignItems: 'stretch', gap: 6 }}>
              <button
                onClick={async () => {
                  const pk = verseVoicePicker;
                  setVerseVoicePicker(null);
                  const ok = await playVerseVoiceOption(pk.setId, opt);
                  if (!ok) speakText(pk.text, 1.0, pk.vLang);
                }}
                style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 8, padding: '0.7rem 0.9rem', borderRadius: '10px', border: '1px solid #e2e8f0', background: '#f8fafc', color: '#334155', fontSize: '0.95rem', fontWeight: 600, cursor: 'pointer', textAlign: 'left' }}
                onMouseOver={(e) => { e.currentTarget.style.background = '#eef2ff'; e.currentTarget.style.borderColor = '#c7d2fe'; }}
                onMouseOut={(e) => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#e2e8f0'; }}
              >
                <span aria-hidden="true">🎙️</span>
                <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {opt.kind === 'owner'
                    ? (opt.recordedBy ? t('作者:{n}', 'Author: {n}').replace('{n}', opt.recordedBy) : t('作者錄音', 'Author'))
                    : `${opt.recordedBy || t('某人', 'Someone')}${opt.mine ? ` ${t('(你)', '(you)')}` : ''}`}
                  {cnt && (cnt.comments > 0 || cnt.likes > 0) && (
                    <span style={{ marginLeft: 6, fontSize: '0.72rem', color: '#94a3b8', fontWeight: 500 }}>
                      {cnt.likes > 0 ? `❤️${cnt.likes} ` : ''}{cnt.comments > 0 ? `💬${cnt.comments}` : ''}
                    </span>
                  )}
                </span>
                <Play size={15} color="#8b5cf6" fill="#8b5cf6" />
              </button>
              {opt.ownerId && (
                <button
                  title={t('留言 / 鼓勵', 'Comments')}
                  onClick={() => openVoiceComments(verseVoicePicker.setId, verseVoicePicker.reference, opt)}
                  style={{ flexShrink: 0, width: 44, borderRadius: '10px', border: '1px solid #e2e8f0', background: '#fff', color: '#8b5cf6', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.15rem' }}
                >💬</button>
              )}
            </div>
            );
          })}
          {/* 電腦語音 fallback — always offered as the last option. */}
          <button
            onClick={() => {
              const pk = verseVoicePicker;
              setVerseVoicePicker(null);
              stopVerseModalAudio();
              speakText(pk.text, 1.0, pk.vLang);
            }}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0.7rem 0.9rem', borderRadius: '10px', border: '1px dashed #cbd5e1', background: '#fff', color: '#64748b', fontSize: '0.95rem', fontWeight: 600, cursor: 'pointer', textAlign: 'left' }}
          >
            <span aria-hidden="true">💻</span>
            <span style={{ flex: 1 }}>{t('電腦語音', 'Computer voice')}</span>
            <Play size={15} color="#94a3b8" fill="#94a3b8" />
          </button>
        </div>
        <button onClick={() => setVerseVoicePicker(null)} style={{ marginTop: '1rem', width: '100%', background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '0.9rem' }}>
          {t('取消', 'Cancel')}
        </button>
      </div>
    </div>
  );
}
