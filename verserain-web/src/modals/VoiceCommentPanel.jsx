// 錄音留言: comments on a recording — moved out of App.jsx unchanged (UI/UX 第 4 階段).
import { XCircle } from 'lucide-react';

export default function VoiceCommentPanel({ t, currentSet, deleteVoiceComment, likeRecording, playCommentAudio, reactVoiceComment, setCommentRecTarget, setShowLoginModal, setVoiceCommentPanel, setVoiceCommentText, submitTextComment, userEmail, voiceCommentBusy, voiceCommentData, voiceCommentPanel, voiceCommentText }) {
  const meLc = (userEmail || '').toLowerCase();
  const isAdminEmail = ['samhsiung@gmail.com', 'davidhwang1125@gmail.com', 'hsiungsam@gmail.com', 'hungry4grace@gmail.com', 'verserain.admin@gmail.com'].includes(meLc);
  const canModerate = isAdminEmail || voiceCommentPanel.mine || (currentSet?.ownerEmail && String(currentSet.ownerEmail).toLowerCase() === meLc && currentSet.id === voiceCommentPanel.setId);
  const recRx = voiceCommentData?.recordingReactions || [];
  const myLiked = recRx.some(r => r.from === meLc && r.emoji === '❤️');
  const commentEmojis = ['❤️', '🙏'];
  return (
  <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2700, padding: '1rem' }} onClick={(e) => { if (e.target === e.currentTarget) setVoiceCommentPanel(null); }}>
    <div style={{ background: '#fff', borderRadius: '14px', width: '100%', maxWidth: '440px', maxHeight: '86vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 40px rgba(0,0,0,0.25)' }}>
      {/* Header */}
      <div style={{ padding: '1.1rem 1.3rem 0.8rem', borderBottom: '1px solid #eef2f7' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 700, color: '#1e293b', fontSize: '1.05rem' }}>💬 {t('留言 / 鼓勵', 'Comments')}</div>
            <div style={{ color: '#64748b', fontSize: '0.82rem', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {voiceCommentPanel.reference} · 🎙️ {voiceCommentPanel.recordedBy || t('某人', 'Someone')}{voiceCommentPanel.mine ? ` ${t('(你)', '(you)')}` : ''}
            </div>
          </div>
          <button onClick={() => setVoiceCommentPanel(null)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 0, flexShrink: 0 }}><XCircle size={22} /></button>
        </div>
        {/* Recording-level like */}
        <button
          onClick={() => { if (!userEmail) { setShowLoginModal('login'); return; } likeRecording('❤️'); }}
          title={t('為這個錄音按讚', 'Like this recording')}
          style={{ marginTop: 10, display: 'inline-flex', alignItems: 'center', gap: 6, padding: '0.4rem 0.8rem', borderRadius: 999, border: myLiked ? '1px solid #fecaca' : '1px solid #e2e8f0', background: myLiked ? '#fef2f2' : '#f8fafc', color: myLiked ? '#dc2626' : '#475569', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}
        >
          ❤️ {t('讚', 'Like')}{recRx.filter(r => r.emoji === '❤️').length > 0 ? ` · ${recRx.filter(r => r.emoji === '❤️').length}` : ''}
        </button>
      </div>
      {/* Comment list */}
      <div style={{ flex: '1 1 auto', minHeight: 0, overflowY: 'auto', padding: '0.9rem 1.3rem', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
        {voiceCommentData === null && <div style={{ color: '#94a3b8', fontSize: '0.9rem', textAlign: 'center' }}>{t('載入中…', 'Loading…')}</div>}
        {voiceCommentData && voiceCommentData.comments.length === 0 && (
          <div style={{ color: '#94a3b8', fontSize: '0.9rem', textAlign: 'center', padding: '1rem 0' }}>{t('還沒有留言。留下第一句鼓勵吧！', 'No comments yet — leave the first word of encouragement!')}</div>
        )}
        {voiceCommentData && voiceCommentData.comments.map((c) => {
          const canDelete = c.author === meLc || canModerate;
          return (
            <div key={c.cid} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontWeight: 700, color: '#334155', fontSize: '0.88rem' }}>{c.authorName || t('某人', 'Someone')}</span>
                <span style={{ color: '#cbd5e1', fontSize: '0.72rem' }}>{new Date(c.at).toLocaleDateString()}</span>
                {canDelete && (
                  <button onClick={() => deleteVoiceComment(c.cid)} title={t('刪除', 'Delete')} style={{ marginLeft: 'auto', background: 'transparent', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: '0.8rem', padding: '0 4px' }}>✕</button>
                )}
              </div>
              {c.type === 'voice' ? (
                <button onClick={() => playCommentAudio(voiceCommentPanel.setId, c.voiceId, c.voiceMime)} style={{ alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: 6, padding: '0.4rem 0.8rem', borderRadius: 8, border: '1px solid #ddd6fe', background: '#f5f3ff', color: '#6d28d9', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}>
                  ▶ {t('語音留言', 'Voice comment')}{c.voiceDur ? ` · ${Math.round(c.voiceDur)}s` : ''}
                </button>
              ) : (
                <div style={{ color: '#334155', fontSize: '0.92rem', lineHeight: 1.5, wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>{c.text}</div>
              )}
              {/* Per-comment reactions */}
              <div style={{ display: 'flex', gap: 6, marginTop: 2 }}>
                {commentEmojis.map((em) => {
                  const n = (c.reactions || []).filter(r => r.emoji === em).length;
                  const mine = (c.reactions || []).some(r => r.from === meLc && r.emoji === em);
                  return (
                    <button key={em} onClick={() => { if (!userEmail) { setShowLoginModal('login'); return; } reactVoiceComment(c.cid, em); }}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '0.15rem 0.5rem', borderRadius: 999, border: mine ? '1px solid #c7d2fe' : '1px solid #e2e8f0', background: mine ? '#eef2ff' : '#fff', color: '#475569', fontSize: '0.78rem', cursor: 'pointer' }}>
                      {em}{n > 0 ? ` ${n}` : ''}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      {/* Composer */}
      <div style={{ borderTop: '1px solid #eef2f7', padding: '0.8rem 1.3rem 1rem' }}>
        {userEmail ? (
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
            <textarea
              value={voiceCommentText}
              onChange={(e) => setVoiceCommentText(e.target.value.slice(0, 1000))}
              placeholder={t('留一句鼓勵…', 'Leave an encouragement…')}
              rows={1}
              style={{ flex: 1, resize: 'none', minHeight: 40, maxHeight: 120, padding: '0.55rem 0.7rem', borderRadius: 10, border: '1px solid #cbd5e1', fontSize: '0.92rem', fontFamily: 'inherit', color: '#334155' }}
            />
            <button onClick={() => setCommentRecTarget(voiceCommentPanel)} title={t('錄語音留言', 'Record a voice comment')} style={{ flexShrink: 0, width: 42, height: 42, borderRadius: '50%', border: '1px solid #e2e8f0', background: '#f8fafc', color: '#dc2626', cursor: 'pointer', fontSize: '1.2rem' }}>🎙️</button>
            <button onClick={submitTextComment} disabled={voiceCommentBusy || !voiceCommentText.trim()} style={{ flexShrink: 0, height: 42, padding: '0 1rem', borderRadius: 10, border: 'none', background: voiceCommentText.trim() ? 'linear-gradient(135deg,#8b5cf6,#6d28d9)' : '#e2e8f0', color: '#fff', fontWeight: 700, cursor: voiceCommentText.trim() ? 'pointer' : 'default' }}>{t('送出', 'Send')}</button>
          </div>
        ) : (
          <button onClick={() => setShowLoginModal('login')} style={{ width: '100%', padding: '0.7rem', borderRadius: 10, border: '1px solid #cbd5e1', background: '#f8fafc', color: '#475569', fontWeight: 600, cursor: 'pointer' }}>
            {t('登入後即可留言 / 鼓勵', 'Sign in to comment')}
          </button>
        )}
      </div>
    </div>
  </div>
  );
}
