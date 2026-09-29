// Translate a verse set into another language — moved out of App.jsx unchanged (UI/UX 第 4 階段).
import { BIBLE_LANGUAGE_OPTIONS } from '../lib/bible.js';
import { Languages, XCircle } from 'lucide-react';

export default function TranslateModal({ t, handleVersionChange, publishTranslatedSet, retryTranslateVerse, runSetTranslation, setTranslateModal, translateModal, version }) {
  const tm = translateModal;
  const langLabel = (BIBLE_LANGUAGE_OPTIONS.find(o => o.value === tm.target) || {}).label || tm.target;
  const closeModal = () => setTranslateModal(null);
  const switchAndClose = () => { const target = tm.target; setTranslateModal(null); handleVersionChange(target); };
  return (
  <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1500, padding: '1rem' }} onClick={(e) => { if (e.target === e.currentTarget && tm.phase !== 'working') closeModal(); }}>
    <div style={{ background: '#fff', borderRadius: '14px', width: '100%', maxWidth: '520px', maxHeight: '86vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
      <div style={{ padding: '1.1rem 1.3rem 0.8rem', borderBottom: '1px solid #eef2f7', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: 6 }}><Languages size={20} /> {t('翻譯經文組', 'Translate verse set')}</div>
          <div style={{ color: '#64748b', fontSize: '0.85rem', marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tm.set?.title}</div>
        </div>
        {(tm.phase !== 'working') && (
          <button onClick={closeModal} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 0, flexShrink: 0 }}><XCircle size={22} /></button>
        )}
      </div>

      {tm.phase === 'pick' && (
        <div style={{ padding: '1.1rem 1.3rem 1.3rem' }}>
          <label style={{ display: 'block', fontWeight: 700, color: '#334155', marginBottom: '0.5rem', fontSize: '0.95rem' }}>{t('翻譯成哪一種語言？', 'Translate into which language?')}</label>
          <select
            value={tm.target}
            onChange={(e) => setTranslateModal(m => (m ? { ...m, target: e.target.value } : m))}
            style={{ width: '100%', padding: '0.6rem 0.7rem', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff', color: '#1e293b', fontSize: '1rem', cursor: 'pointer' }}
          >
            <option value="" disabled>{t('請選擇語言…', 'Choose a language…')}</option>
            {BIBLE_LANGUAGE_OPTIONS.filter(o => o.value !== version).map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <div style={{ marginTop: '0.8rem', fontSize: '0.82rem', color: '#64748b', lineHeight: 1.6, background: '#f8fafc', border: '1px solid #eef2f7', borderRadius: 8, padding: '0.6rem 0.7rem' }}>
            {t('會自動翻譯標題、把每節出處換成該語言的書名、並抓取該語言官方譯本的經文。簡介會留空，請加入後自行以該語言填寫。', "The title is auto-translated, each reference is remapped to that language's book names, and the official verse text in that language is fetched. The description is left blank — write your own in that language after adding.")}
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem', marginTop: '1.1rem' }}>
            <button onClick={closeModal} style={{ background: 'transparent', border: '1px solid #cbd5e1', color: '#64748b', borderRadius: 8, padding: '0.55rem 1rem', cursor: 'pointer', fontWeight: 600 }}>{t('取消', 'Cancel')}</button>
            <button onClick={runSetTranslation} disabled={!tm.target} style={{ background: tm.target ? '#0ea5e9' : '#cbd5e1', color: '#fff', border: 'none', borderRadius: 8, padding: '0.55rem 1.2rem', cursor: tm.target ? 'pointer' : 'not-allowed', fontWeight: 800 }}>{t('開始翻譯', 'Translate')}</button>
          </div>
        </div>
      )}

      {tm.phase === 'working' && (
        <div style={{ padding: '1.6rem 1.3rem 1.8rem', textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.6rem' }}>🌧️</div>
          <div style={{ fontWeight: 700, color: '#1e293b' }}>{t('翻譯中…', 'Translating…')}</div>
          <div style={{ color: '#64748b', fontSize: '0.9rem', marginTop: 4 }}>
            {langLabel} · {(tm.progress?.done || 0)}/{(tm.progress?.total || 0)}
          </div>
          <div style={{ marginTop: '0.9rem', height: 8, background: '#eef2f7', borderRadius: 999, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${tm.progress?.total ? Math.round((tm.progress.done / tm.progress.total) * 100) : 0}%`, background: 'linear-gradient(90deg,#38bdf8,#0ea5e9)', transition: 'width 0.2s' }} />
          </div>
        </div>
      )}

      {tm.phase === 'exists' && (
        <div style={{ padding: '1.3rem' }}>
          <div style={{ color: '#334155', lineHeight: 1.6 }}>
            {t('這個經文組已經有「{lang}」版本了。', 'A {lang} version of this set already exists.').replace('{lang}', langLabel)}
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem', marginTop: '1.2rem' }}>
            <button onClick={closeModal} style={{ background: 'transparent', border: '1px solid #cbd5e1', color: '#64748b', borderRadius: 8, padding: '0.55rem 1rem', cursor: 'pointer', fontWeight: 600 }}>{t('取消', 'Cancel')}</button>
            <button onClick={switchAndClose} style={{ background: '#0ea5e9', color: '#fff', border: 'none', borderRadius: 8, padding: '0.55rem 1.2rem', cursor: 'pointer', fontWeight: 800 }}>{t('切換到該語言查看', 'Switch to that language')}</button>
          </div>
        </div>
      )}

      {tm.phase === 'preview' && (
        <>
          <div style={{ padding: '1rem 1.3rem 0.4rem', overflowY: 'auto' }}>
            <label style={{ display: 'block', fontWeight: 700, color: '#334155', marginBottom: '0.35rem', fontSize: '0.9rem' }}>{t('標題（可修改）', 'Title (editable)')}</label>
            <input
              value={tm.title || ''}
              onChange={(e) => setTranslateModal(m => (m ? { ...m, title: e.target.value } : m))}
              style={{ width: '100%', padding: '0.55rem 0.7rem', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: '1rem', color: '#0f172a', boxSizing: 'border-box' }}
            />
            <div style={{ marginTop: '0.9rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {(tm.verses || []).map((v, i) => (
                <div key={i} style={{ border: '1px solid #eef2f7', borderRadius: 8, padding: '0.5rem 0.65rem', background: v.failed ? '#fef2f2' : '#f8fafc' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                    <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.9rem' }}>{v.reference || t('（無法解析出處）', '(unparsed reference)')}</div>
                    {v.failed && (
                      <button onClick={() => retryTranslateVerse(i)} disabled={v.retrying} style={{ flexShrink: 0, background: '#fff', border: '1px solid #fca5a5', color: '#dc2626', borderRadius: 999, padding: '0.15rem 0.6rem', fontSize: '0.78rem', fontWeight: 700, cursor: v.retrying ? 'default' : 'pointer' }}>{v.retrying ? t('重試中…', 'Retrying…') : `⚠ ${t('重試', 'Retry')}`}</button>
                    )}
                  </div>
                  <div style={{ color: v.failed ? '#b91c1c' : '#475569', fontSize: '0.85rem', marginTop: 3, lineHeight: 1.5 }}>
                    {v.text ? v.text : t('找不到這節經文，可重試或先加入之後再用「編輯」補上。', 'Verse text not found — retry, or add now and fill it in later via Edit.')}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: '0.7rem', fontSize: '0.8rem', color: '#94a3b8' }}>{t('※ 簡介會留空，請加入後自行填寫。', '※ The description is left blank — write your own after adding.')}</div>
          </div>
          <div style={{ padding: '0.9rem 1.3rem', borderTop: '1px solid #eef2f7', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
            <div style={{ fontSize: '0.82rem', color: '#64748b' }}>
              {(() => { const ok = (tm.verses || []).filter(v => v.text).length; const total = (tm.verses || []).length; return `${ok}/${total} ${t('節有內文', 'verses ready')}`; })()}
            </div>
            <div style={{ display: 'flex', gap: '0.6rem' }}>
              <button onClick={closeModal} style={{ background: 'transparent', border: '1px solid #cbd5e1', color: '#64748b', borderRadius: 8, padding: '0.55rem 1rem', cursor: 'pointer', fontWeight: 600 }}>{t('取消', 'Cancel')}</button>
              <button onClick={publishTranslatedSet} disabled={!(tm.title || '').trim()} style={{ background: (tm.title || '').trim() ? '#10b981' : '#cbd5e1', color: '#fff', border: 'none', borderRadius: 8, padding: '0.55rem 1.2rem', cursor: (tm.title || '').trim() ? 'pointer' : 'not-allowed', fontWeight: 800 }}>{t('加入並編輯', 'Add & edit')}</button>
            </div>
          </div>
        </>
      )}

    </div>
  </div>
  );
}
