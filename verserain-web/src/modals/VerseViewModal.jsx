// One verse, full text — moved out of App.jsx unchanged (UI/UX 第 4 階段).
import { Headphones, Play, XCircle } from 'lucide-react';
import { initAudio } from '../lib/audio.js';
import { isEnglishBibleVersion } from '../lib/bible.js';
import { speakText } from '../lib/speech.js';
import { toast } from '../ui';

export default function VerseViewModal({ t, currentSetVoiceRefs, gatherVerseVoiceOptions, openVoiceComments, playVerseVoiceOption, setActiveVerse, setCampaignQueue, setCampaignResults, setVerseViewModal, setVerseVoicePicker, startGame, stopVerseModalAudio, updateGarden, verseViewModal, version }) {
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '1rem' }} onClick={(e) => { if (e.target === e.currentTarget) { setVerseViewModal(null); stopVerseModalAudio(); if ('speechSynthesis' in window) window.speechSynthesis.cancel(); } }}>
      <div style={{ background: '#ffffff', borderRadius: '12px', padding: '2rem', width: '100%', maxWidth: '600px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', display: 'flex', flexDirection: 'column', gap: '1.5rem', border: '1px solid #e2e8f0', maxHeight: '85vh' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '1rem' }}>
          <h2 style={{ margin: 0, color: '#1e293b', fontSize: '1.6rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ color: '#3b82f6' }}>{verseViewModal.reference}</span>
            <button
              onClick={async () => {
                updateGarden('activity_only', 'listen');
                const vLang = isEnglishBibleVersion(version) ? 'en-US' : (version === 'ko' ? 'ko-KR' : (version === 'ja' ? 'ja-JP' : (version === 'he' ? 'he-IL' : (version === 'fa' ? 'fa-IR' : 'zh-TW'))));
                const opts = await gatherVerseVoiceOptions(verseViewModal.setId, verseViewModal.reference);
                // >1 recording → let the listener choose whose voice to hear.
                if (opts.length > 1) {
                  setVerseVoicePicker({ setId: verseViewModal.setId, reference: verseViewModal.reference, text: verseViewModal.text, vLang, options: opts });
                  return;
                }
                // Exactly one recording → play it; none → TTS.
                if (opts.length === 1) {
                  const ok = await playVerseVoiceOption(verseViewModal.setId, opts[0]);
                  if (ok) return;
                }
                speakText(verseViewModal.text, 1.0, vLang);
              }}
              title={t("朗讀經文", "Read aloud")}
              style={{ background: '#ecfdf5', color: '#10b981', border: '1px solid #a7f3d0', borderRadius: '50%', width: '38px', height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s', padding: 0 }}
              onMouseOver={(e) => { e.currentTarget.style.background = '#d1fae5'; e.currentTarget.style.transform = 'scale(1.05)'; }}
              onMouseOut={(e) => { e.currentTarget.style.background = '#ecfdf5'; e.currentTarget.style.transform = 'scale(1)'; }}
            >
              <Headphones size={20} />
            </button>
            {/* 留言 / 鼓勵 — shown when this verse has any recording. Picks
                the recording directly when there's one, else lets the
                viewer choose which recording to comment on. */}
            {verseViewModal.setId && currentSetVoiceRefs.has(verseViewModal.reference) && (
              <button
                onClick={async () => {
                  const opts = await gatherVerseVoiceOptions(verseViewModal.setId, verseViewModal.reference);
                  const withOwner = opts.filter(o => o.ownerId);
                  if (withOwner.length === 0) { toast.info(t('這節還沒有錄音可留言', 'No recording to comment on yet')); return; }
                  if (withOwner.length === 1) {
                    openVoiceComments(verseViewModal.setId, verseViewModal.reference, withOwner[0]);
                  } else {
                    const vLang = isEnglishBibleVersion(version) ? 'en-US' : (version === 'ko' ? 'ko-KR' : (version === 'ja' ? 'ja-JP' : (version === 'he' ? 'he-IL' : (version === 'fa' ? 'fa-IR' : 'zh-TW'))));
                    setVerseVoicePicker({ setId: verseViewModal.setId, reference: verseViewModal.reference, text: verseViewModal.text, vLang, options: opts });
                  }
                }}
                title={t('留言 / 鼓勵', 'Comment / encourage')}
                style={{ background: '#f5f3ff', color: '#8b5cf6', border: '1px solid #ddd6fe', borderRadius: '50%', width: '38px', height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '1.2rem', padding: 0 }}
                onMouseOver={(e) => { e.currentTarget.style.background = '#ede9fe'; e.currentTarget.style.transform = 'scale(1.05)'; }}
                onMouseOut={(e) => { e.currentTarget.style.background = '#f5f3ff'; e.currentTarget.style.transform = 'scale(1)'; }}
              >💬</button>
            )}
          </h2>
          <button
            onClick={() => {
              if ('speechSynthesis' in window) window.speechSynthesis.cancel();
              stopVerseModalAudio();
              setVerseViewModal(null);
            }}
            style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
          >
            <XCircle size={26} />
          </button>
        </div>

        {/* flex:1 + minHeight:0 — without them a flex child never shrinks
            below its content, so long passages overflowed past 85vh with
            no scrollbar and the tail of the verse was unreachable. */}
        <div style={{ color: '#475569', fontSize: '1.2rem', lineHeight: '1.8', flex: '1 1 auto', minHeight: 0, overflowY: 'auto', WebkitOverflowScrolling: 'touch', paddingRight: '1rem', fontWeight: '500', fontFamily: 'var(--app-font-family)', wordBreak: 'break-word' }}>
          {verseViewModal.text}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '1rem', borderTop: '1px solid #e2e8f0', gap: '1rem' }}>
          <button
            onClick={() => {
              setVerseViewModal(null);
              stopVerseModalAudio();
              if ('speechSynthesis' in window) window.speechSynthesis.cancel();
            }}
            style={{ background: '#f1f5f9', color: '#64748b', border: '1px solid #cbd5e1', padding: '0.6rem 1.5rem', borderRadius: '6px', fontSize: '1rem', fontWeight: 'bold', cursor: 'pointer', transition: 'background 0.2s' }}
          >
            {t("關閉", "Close")}
          </button>
          <button
            onClick={() => {
              setVerseViewModal(null);
              if ('speechSynthesis' in window) window.speechSynthesis.cancel();
              initAudio();
              setCampaignQueue(null);
              setCampaignResults([]);
              setActiveVerse(verseViewModal);
              setTimeout(() => startGame(false, verseViewModal), 50);
            }}
            style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '0.6rem 1.5rem', borderRadius: '6px', fontSize: '1rem', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', transition: 'background 0.2s' }}
            onMouseOver={(e) => e.target.style.background = '#2563eb'}
            onMouseOut={(e) => e.target.style.background = '#3b82f6'}
          >
            <Play size={16} fill="white" /> {t("立刻挑戰", "Challenge now")}
          </button>
        </div>
      </div>
    </div>
  );
}
