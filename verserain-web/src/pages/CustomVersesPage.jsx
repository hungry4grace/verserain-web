// The 我的經文組 (my verse sets / set editor) tab — moved out of App.jsx unchanged (UI/UX 第 4 階段).
import { BIBLE_BOOKS, getBookAbbr } from '../bibleDictionary';
import { BookOpen, ChevronDown, ChevronUp, Crown, Edit, Languages, Library, Lock, Play, Plus, Save, Square, Trash2, X } from 'lucide-react';
import { Button, confirmDialog, toast } from '../ui';
import { PRESET_BGM, PRESET_BGM_RANDOM, bgmGainToSlider, bgmSliderToGain, isPresetBgm, presetBgmFor } from '../lib/audio.js';
import React from 'react';
import { SET_BACKGROUND_THEMES } from '../setBackgrounds';
import VerseVoiceRecorder from '../VerseVoiceRecorder';
import YouTubeBgmField from '../YouTubeBgmField';
import { bakeBeautifiedBlob } from '../voiceBeautify';
import { fetchEditorVerseText, getVoiceLangForVersion, normalizeVerseInput } from '../lib/bible.js';
import { formatVerseReferenceForDisplay, parseVerseRef } from '../lib/verseDisplay.js';
import { isMySet } from '../lib/partyApi.js';
import { speakText } from '../lib/speech.js';
import { uploadVerseVoice } from '../setVoiceApi';


// The rich-text editor (react-quill-new + its CSS) stays out of the initial bundle.
const ReactQuill = React.lazy(() => import('../LazyQuill'));

// A pasted Dropbox share link (?dl=0) opens Dropbox's preview page, not the
// raw image, and a pasted Google Drive share link (/file/d/ID/view or
// ?id=ID) opens Drive's viewer page — neither is the raw image bytes an
// <img src> needs, so both render broken unless rewritten. This fixes both
// without making the user remember to edit the URL themselves. (A Drive file
// still has to be shared as "Anyone with the link" — no URL rewrite gets
// around that; it just gets skipped by the try/catch-style checks below and
// the original link is returned unchanged.)
function normalizeImageUrl(url) {
  try {
    const u = new URL(url);
    if (/(^|\.)dropbox\.com$/i.test(u.hostname)) {
      u.searchParams.delete('dl');
      u.searchParams.set('raw', '1');
      return u.toString();
    }
    if (/(^|\.)(drive|docs)\.google\.com$/i.test(u.hostname)) {
      const fileId = u.pathname.match(/\/file\/d\/([^/]+)/)?.[1] || u.searchParams.get('id');
      // drive.google.com/uc?export=view only serves the image on a direct,
      // top-level navigation — loaded as an <img> from another origin (i.e.
      // exactly how this ends up being used) Google blocks it as a hotlink
      // and it 404s. lh3.googleusercontent.com/d/ID is Google's actual
      // image-CDN endpoint and embeds fine cross-origin.
      if (fileId) return `https://lh3.googleusercontent.com/d/${fileId}`;
    }
  } catch {
    // Not a parseable absolute URL — leave it untouched.
  }
  return url;
}

// Quill's default image button opens a file picker and embeds the photo as a
// base64 data URI directly in the saved HTML — a single normal phone photo
// easily exceeds Cloudflare Durable Object storage's 128KB per-value limit
// and the whole set fails to save with a DB error. Prompting for an already-
// hosted image URL instead keeps the saved value tiny (just the URL string).
function quillImageUrlHandler() {
  const url = window.prompt('貼上圖片網址 (Paste an image URL):');
  if (!url) return;
  const range = this.quill.getSelection(true) || { index: this.quill.getLength() };
  this.quill.insertEmbed(range.index, 'image', normalizeImageUrl(url.trim()), 'user');
  this.quill.setSelection(range.index + 1);
}

const quillModules = {
  toolbar: {
    container: [
      [{ 'header': [1, 2, 3, 4, false] }],
      ['bold', 'italic', 'underline', 'strike', 'blockquote'],
      [{ 'list': 'ordered' }, { 'list': 'bullet' }],
      ['link', 'image'],
      ['clean']
    ],
    handlers: {
      image: quillImageUrlHandler,
    },
  },
};

export default function CustomVersesPage({ t, bgFileInputRef, bgUploadBusy, bookPickerIdx, bulkImportState, canCreateCustomSets, confirmDeleteIdx, confirmDeleteTimerRef, customSetsPage, customSetsSort, customVerseSets, editingCustomSet, editorBgPreview, editorMusicAudioRef, editorMusicPlaying, editorMusicUrl, editorPlayingVerse, editorSaveSeqRef, editorUploadJobRef, editorVerseVoices, editorVoiceStatus, editorVoiceTarget, handleBgImageUpload, handleMusicUpload, isNarrowEditor, loadedLangs, musicFileInputRef, musicUploadBusy, playerName, playSetVerseVoice, presetMenuOpen, publishedVerseSets, runBulkImport, setBookPickerIdx, setBulkImportState, setConfirmDeleteIdx, setCustomSetsPage, setCustomSetsSort, setCustomVerseSets, setEditingCustomSet, setEditorPlayingVerse, setEditorVerseVoices, setEditorVoiceStatus, setEditorVoiceTarget, setMainTab, setPresetMenuOpen, setPublishedVerseSets, setSelectedSetId, setShowLoginModal, setTranslateModal, setVoicesLookupRef, sortedCustomSets, stopVerseModalAudio, toggleEditorMusicPreview, userEmail, verseModalAudioRef, version }) {
  return (
    <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '2rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2 style={{ color: '#1e293b', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Crown size={28} /> {t("我的經文組", "My Custom Sets")}</h2>
      </div>

      {!canCreateCustomSets ? (
        <div style={{ textAlign: 'center', padding: '3rem 1rem', background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <div style={{ marginBottom: '1rem', color: '#64748b' }}><Lock size={64} /></div>
          <h3 style={{ color: '#334155', marginBottom: '1rem' }}>{t("登入即可建立專屬經文組", "Sign in to create custom verse sets")}</h3>
          <p style={{ color: '#64748b', marginBottom: '2rem', maxWidth: '400px', margin: '0 auto 2rem', lineHeight: '1.6' }}>
            {t("登入你的帳號後，就能自由建立、編輯並分享自己的經文組。", "Once you sign in, you can freely create, edit, and share your own verse sets.")}
          </p>
          <Button size="lg" onClick={() => setShowLoginModal('login')}>
            {t("登入", "Log In")}
          </Button>
        </div>
      ) : (
        <div>
          {editingCustomSet ? (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ margin: 0, color: '#3b82f6' }}>{editingCustomSet.id ? t("編輯經文組", "Edit Set") : t("新增經文組", "New Set")}</h3>
                <Button variant="text" size="sm" icon={<X size={18} />} onClick={() => setEditingCustomSet(null)}>{t("取消", "Cancel")}</Button>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.5rem', color: '#475569' }}>{t("標題", "Title")}</label>
                <input type="text" value={editingCustomSet.title} onChange={e => setEditingCustomSet({ ...editingCustomSet, title: e.target.value })} style={{ width: '100%', padding: '0.8rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '1rem' }} placeholder={t("例如：約翰福音核心經文", "e.g., Core Verses of John")} />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.5rem', color: '#475569' }}>{t("簡介", "Description")}</label>
                <div style={{ background: '#fff', color: '#0f172a', borderRadius: '6px', border: '1px solid #cbd5e1', overflow: 'visible' }}>
                  <style>{`.ql-editor { min-height: 100px; }`}</style>
                  <React.Suspense fallback={<div style={{ padding: '1rem', color: '#94a3b8', fontSize: '0.9rem' }}>{t('編輯器載入中…', 'Loading editor…')}</div>}>
                    <ReactQuill
                      theme="snow"
                      value={editingCustomSet.description || ''}
                      onChange={content => setEditingCustomSet({ ...editingCustomSet, description: content })}
                      modules={quillModules}
                      placeholder={t("描述一下這個經文組的用途...", "Describe this set...")}
                    />
                  </React.Suspense>
                </div>
              </div>

              {/* 背景圖片 — creator picks a themed background for this set;
                  unset = the default rotating AI backgrounds. */}
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.5rem', color: '#475569' }}>{t("背景圖片", "Background")}</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '0.6rem' }}>
                  <div
                    onClick={() => setEditingCustomSet({ ...editingCustomSet, background: '' })}
                    style={{ cursor: 'pointer', borderRadius: 8, border: `3px solid ${!editingCustomSet.background ? '#3b82f6' : '#e2e8f0'}`, overflow: 'hidden', textAlign: 'center', background: '#f8fafc' }}
                  >
                    <div style={{ height: 64, display: 'grid', placeItems: 'center', color: '#94a3b8', fontSize: '1.4rem' }}>🎲</div>
                    <div style={{ fontSize: '0.75rem', color: '#475569', padding: '0.25rem 0.2rem', fontWeight: 600 }}>{t('預設(每日輪換)', 'Default (rotates)')}</div>
                  </div>
                  {SET_BACKGROUND_THEMES.map(bg => (
                    <div
                      key={bg.id}
                      onClick={() => setEditingCustomSet({ ...editingCustomSet, background: `preset:${bg.id}` })}
                      style={{ cursor: 'pointer', borderRadius: 8, border: `3px solid ${editingCustomSet.background === `preset:${bg.id}` ? '#3b82f6' : '#e2e8f0'}`, overflow: 'hidden', textAlign: 'center', background: '#f8fafc' }}
                    >
                      <img src={bg.url} alt={bg.zh} style={{ width: '100%', height: 64, objectFit: 'cover', display: 'block' }} loading="lazy" />
                      <div style={{ fontSize: '0.75rem', color: '#475569', padding: '0.25rem 0.2rem', fontWeight: 600 }}>{t(bg.zh, bg.en)}</div>
                    </div>
                  ))}
                  <div
                    onClick={() => { if (!bgUploadBusy) bgFileInputRef.current?.click(); }}
                    style={{ cursor: 'pointer', borderRadius: 8, border: `3px solid ${String(editingCustomSet.background || '').startsWith('custom:') ? '#3b82f6' : '#e2e8f0'}`, overflow: 'hidden', textAlign: 'center', background: '#fefce8' }}
                  >
                    {editorBgPreview && String(editingCustomSet.background || '').startsWith('custom:') ? (
                      <img src={editorBgPreview} alt={t('自訂背景', 'Custom background')} style={{ width: '100%', height: 64, objectFit: 'cover', display: 'block' }} />
                    ) : (
                      <div style={{ height: 64, display: 'grid', placeItems: 'center', fontSize: '1.4rem' }}>
                        {bgUploadBusy ? '⏳' : (String(editingCustomSet.background || '').startsWith('custom:') ? '🖼️' : '⬆️')}
                      </div>
                    )}
                    <div style={{ fontSize: '0.75rem', color: '#475569', padding: '0.25rem 0.2rem', fontWeight: 600 }}>
                      {bgUploadBusy ? t('上傳中…', 'Uploading…') : (String(editingCustomSet.background || '').startsWith('custom:') ? t('自訂圖片 ✓', 'Custom ✓') : t('上傳圖片', 'Upload'))}
                    </div>
                  </div>
                  <input ref={bgFileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { handleBgImageUpload(e.target.files?.[0]); e.target.value = ''; }} />
                </div>
              </div>

              {/* 背景音樂 — preset list (PRESET_BGM) / none / custom MP3 upload (≤5MB). */}
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.5rem', color: '#475569' }}>{t("背景音樂", "Background Music")}</label>
                <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                  <button type="button"
                    onClick={() => {
                      if (isPresetBgm(editingCustomSet.bgMusic)) setPresetMenuOpen(o => !o);
                      else { setEditingCustomSet({ ...editingCustomSet, bgMusic: '' }); setPresetMenuOpen(true); }
                    }}
                    style={{ padding: '0.5rem 1rem', borderRadius: 20, border: `2px solid ${isPresetBgm(editingCustomSet.bgMusic) ? '#3b82f6' : '#cbd5e1'}`, background: isPresetBgm(editingCustomSet.bgMusic) ? '#eff6ff' : '#f8fafc', color: '#334155', cursor: 'pointer', fontWeight: 600 }}>
                    🎵 {t('預設音樂', 'Default music')}
                    {isPresetBgm(editingCustomSet.bgMusic) && <span style={{ fontWeight: 500, color: '#475569' }}> · {presetBgmFor(editingCustomSet.bgMusic).id === 'random' ? t('隨機播放（全部）', 'Shuffle all') : presetBgmFor(editingCustomSet.bgMusic).label}</span>}
                    <span style={{ marginLeft: 6, fontSize: '0.8em' }}>{presetMenuOpen && isPresetBgm(editingCustomSet.bgMusic) ? '▲' : '▼'}</span>
                  </button>
                  <button type="button" onClick={() => setEditingCustomSet({ ...editingCustomSet, bgMusic: 'none' })}
                    style={{ padding: '0.5rem 1rem', borderRadius: 20, border: `2px solid ${editingCustomSet.bgMusic === 'none' ? '#3b82f6' : '#cbd5e1'}`, background: editingCustomSet.bgMusic === 'none' ? '#eff6ff' : '#f8fafc', color: '#334155', cursor: 'pointer', fontWeight: 600 }}>
                    🔇 {t('無背景音樂', 'No music')}
                  </button>
                  <button type="button" disabled={musicUploadBusy} onClick={() => musicFileInputRef.current?.click()}
                    style={{ padding: '0.5rem 1rem', borderRadius: 20, border: `2px solid ${String(editingCustomSet.bgMusic || '').startsWith('custom:') ? '#3b82f6' : '#cbd5e1'}`, background: String(editingCustomSet.bgMusic || '').startsWith('custom:') ? '#eff6ff' : '#fefce8', color: '#334155', cursor: 'pointer', fontWeight: 600 }}>
                    {musicUploadBusy ? `⏳ ${t('上傳中…', 'Uploading…')}` : (String(editingCustomSet.bgMusic || '').startsWith('custom:') ? `🎶 ${t('自訂音樂 ✓(點擊更換)', 'Custom ✓ (replace)')}` : `⬆️ ${t('上傳 MP3(≤5MB)', 'Upload MP3 (≤5MB)')}`)}
                  </button>
                  <input ref={musicFileInputRef} type="file" accept="audio/*" style={{ display: 'none' }} onChange={e => { handleMusicUpload(e.target.files?.[0]); e.target.value = ''; }} />
                  <button type="button" data-testid="bgm-youtube"
                    onClick={() => { if (!String(editingCustomSet.bgMusic || '').startsWith('youtube:')) setEditingCustomSet(prev => ({ ...prev, bgMusic: 'youtube:' })); }}
                    style={{ padding: '0.5rem 1rem', borderRadius: 20, border: `2px solid ${String(editingCustomSet.bgMusic || '').startsWith('youtube:') ? '#3b82f6' : '#cbd5e1'}`, background: String(editingCustomSet.bgMusic || '').startsWith('youtube:') ? '#eff6ff' : '#f8fafc', color: '#334155', cursor: 'pointer', fontWeight: 600 }}>
                    ▶️ {t('YouTube 音樂', 'YouTube music')}
                  </button>
                </div>
                {String(editingCustomSet.bgMusic || '').startsWith('youtube:') && (
                  <YouTubeBgmField
                    t={t}
                    value={editingCustomSet.bgMusic}
                    volume={editingCustomSet.bgMusicVolume ?? 0.18}
                    onChange={(bgMusic) => setEditingCustomSet(prev => ({ ...prev, bgMusic }))}
                  />
                )}
                {presetMenuOpen && isPresetBgm(editingCustomSet.bgMusic) && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.6rem', maxWidth: 420 }}>
                    {[PRESET_BGM_RANDOM, ...PRESET_BGM].map(p => {
                      const sel = presetBgmFor(editingCustomSet.bgMusic).id === p.id;
                      return (
                        <button key={p.id} type="button"
                          onClick={() => setEditingCustomSet(prev => ({ ...prev, bgMusic: `preset:${p.id}` }))}
                          style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.5rem 0.9rem', borderRadius: 10, border: `2px solid ${sel ? '#3b82f6' : '#e2e8f0'}`, background: sel ? '#eff6ff' : '#fff', color: '#334155', cursor: 'pointer', fontWeight: sel ? 700 : 500, textAlign: 'left' }}>
                          <span style={{ color: sel ? '#3b82f6' : '#94a3b8' }}>{sel ? '◉' : '○'}</span>
                          <span>{p.id === 'random' ? `🔀 ${t('隨機播放（全部）', 'Shuffle all')}` : p.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
                {editingCustomSet.bgMusic !== 'none' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', flexWrap: 'wrap', marginTop: '0.7rem' }}>
                    {!String(editingCustomSet.bgMusic || '').startsWith('youtube:') && (
                      <button
                        type="button"
                        disabled={!editorMusicUrl}
                        onClick={toggleEditorMusicPreview}
                        style={{ padding: '0.4rem 0.9rem', borderRadius: 8, border: '1px solid #cbd5e1', background: editorMusicPlaying ? '#fde68a' : '#f8fafc', color: '#334155', cursor: editorMusicUrl ? 'pointer' : 'wait', fontWeight: 600 }}
                      >
                        {editorMusicPlaying ? `⏸ ${t('停止試聽', 'Stop')}` : (editorMusicUrl ? `▶ ${t('試聽', 'Preview')}` : `⏳ ${t('載入中…', 'Loading…')}`)}
                      </button>
                    )}
                    <span style={{ color: '#64748b', fontSize: '0.88rem' }}>🔉 {t('音量', 'Volume')}</span>
                    <input
                      type="range" min={1} max={100}
                      value={bgmGainToSlider(editingCustomSet.bgMusicVolume)}
                      onChange={e => {
                        const vol = bgmSliderToGain(Number(e.target.value));
                        setEditingCustomSet(prev => ({ ...prev, bgMusicVolume: vol }));
                        editorMusicAudioRef.current?._bgmSetVolume?.(vol);
                      }}
                      style={{ width: 180, cursor: 'pointer' }}
                    />
                    <span style={{ color: '#334155', fontSize: '0.88rem', fontWeight: 600, minWidth: 38 }}>
                      {bgmGainToSlider(editingCustomSet.bgMusicVolume)}%
                    </span>
                  </div>
                )}
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.5rem', color: '#475569' }}>{t("經文列表", "Verses")}</label>

                {editingCustomSet.verses.map((v, idx) => {
                  const autoFetchVerse = async (bookInfo, verseInput, verseIdx) => {
                    if (!bookInfo || !verseInput) return;
                    const sanitized = normalizeVerseInput(verseInput);
                    if (!/^\d/.test(sanitized)) return;
                    const bookAbbr = getBookAbbr(bookInfo, version);
                    const refStr = `${bookAbbr} ${sanitized}`;
                    setEditingCustomSet(prev => {
                      const nv = [...prev.verses];
                      nv[verseIdx] = { ...nv[verseIdx], reference: refStr, book: bookInfo.id, verseInput: sanitized };
                      return { ...prev, verses: nv };
                    });
                    const db = loadedLangs[version]?.verses || [];
                    const sanitizeRef = (str) => str.toString().replace(/\s+/g, '').replace(/[–—~]/g, '-').replace(/[：]/g, ':').toLowerCase();
                    const searchRef = sanitizeRef(refStr);
                    let foundText = '';
                    for (const verse of db) {
                      if (!verse.reference) continue;
                      const dbRef = sanitizeRef(verse.reference);
                      if (dbRef === searchRef) { foundText = verse.text; break; }
                      const sNum = searchRef.match(/\d+.*$/);
                      const dNum = dbRef.match(/\d+.*$/);
                      if (sNum && dNum && sNum[0] === dNum[0]) {
                        const dBk = dbRef.replace(dNum[0], '');
                        const validNames = [...bookInfo.names, bookInfo.ja, bookInfo.ko].filter(Boolean).map(n => sanitizeRef(n));
                        if (validNames.includes(dBk)) {
                          foundText = verse.text;
                          break;
                        }
                      }
                    }
                    if (foundText) {
                      setEditingCustomSet(prev => {
                        const nv = [...prev.verses]; nv[verseIdx] = { ...nv[verseIdx], text: foundText }; return { ...prev, verses: nv };
                      });
                      return;
                    }
                    try {
                      // Language-aware fetch — English APIs, or bolls/getbible
                      // with the correct per-language slug (never a Chinese
                      // stand-in for a Spanish/Korean/etc. set).
                      const combined = await fetchEditorVerseText({ bookInfo, sanitized, version });
                      if (!combined) throw new Error("No verses");
                      setEditingCustomSet(prev => {
                        const nv = [...prev.verses]; nv[verseIdx] = { ...nv[verseIdx], text: combined }; return { ...prev, verses: nv };
                      });
                    } catch (e) { /* user can fill manually */ }
                  };

                  const moveVerse = (fromIdx, direction) => {
                    const toIdx = fromIdx + direction;
                    if (toIdx < 0 || toIdx >= editingCustomSet.verses.length) return;
                    const newVerses = [...editingCustomSet.verses];
                    [newVerses[fromIdx], newVerses[toIdx]] = [newVerses[toIdx], newVerses[fromIdx]];
                    setEditingCustomSet({ ...editingCustomSet, verses: newVerses });
                  };

                  return (
                    <div key={idx} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.8rem', alignItems: 'flex-start', position: 'relative' }}>
                      {/* Move column: reorder this verse up/down within the list. */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flexShrink: 0 }}>
                        <button type="button" disabled={idx === 0} onClick={() => moveVerse(idx, -1)}
                          title={t('往上移', 'Move up')}
                          style={{ padding: '0.25rem', borderRadius: '4px', border: '1px solid #cbd5e1', background: idx === 0 ? '#f1f5f9' : '#fff', color: idx === 0 ? '#cbd5e1' : '#475569', cursor: idx === 0 ? 'not-allowed' : 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                          <ChevronUp size={16} />
                        </button>
                        <button type="button" disabled={idx === editingCustomSet.verses.length - 1} onClick={() => moveVerse(idx, 1)}
                          title={t('往下移', 'Move down')}
                          style={{ padding: '0.25rem', borderRadius: '4px', border: '1px solid #cbd5e1', background: idx === editingCustomSet.verses.length - 1 ? '#f1f5f9' : '#fff', color: idx === editingCustomSet.verses.length - 1 ? '#cbd5e1' : '#475569', cursor: idx === editingCustomSet.verses.length - 1 ? 'not-allowed' : 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                          <ChevronDown size={16} />
                        </button>
                      </div>
                      {/* Reference column: book name on top, chapter:verse below (stacked on phones). */}
                      <div style={{ display: 'flex', flexDirection: isNarrowEditor ? 'column' : 'row', gap: isNarrowEditor ? '4px' : '0.5rem', alignItems: isNarrowEditor ? 'stretch' : 'flex-start', flexShrink: 0 }}>
                      <button type="button" onClick={() => setBookPickerIdx(bookPickerIdx === idx ? null : idx)}
                        style={{ padding: '0.5rem 0.7rem', borderRadius: '4px', border: '1px solid #cbd5e1', background: v.book ? '#3b82f6' : '#f1f5f9', color: v.book ? '#fff' : '#475569', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem', whiteSpace: 'nowrap', minWidth: '50px', textAlign: 'center', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}>
                        {v.book ? getBookAbbr(BIBLE_BOOKS.find(b => b.id === v.book), version) : <Library size={16} />}
                      </button>

                      {bookPickerIdx === idx && (
                        <div style={{ position: 'absolute', top: '100%', left: 0, zIndex: 100, background: '#1e293b', borderRadius: '8px', padding: '0.8rem', boxShadow: '0 10px 30px rgba(0,0,0,0.4)', width: '320px', maxHeight: '400px', overflowY: 'auto' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                            <span style={{ color: '#10b981', fontWeight: 'bold', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}><Library size={16} /> {t("選擇書卷", "Books")}</span>
                            <button type="button" onClick={() => setBookPickerIdx(null)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontWeight: 'bold' }}>{t("取消", "Cancel")}</button>
                          </div>
                          <div style={{ color: '#e2e8f0', fontWeight: 'bold', fontSize: '0.85rem', padding: '0.3rem 0', borderBottom: '1px solid rgba(255,255,255,0.1)', marginBottom: '0.3rem' }}>{t("舊約", "Old Testament")}</div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2px', marginBottom: '0.5rem' }}>
                            {BIBLE_BOOKS.filter(b => b.testament === 'OT').map(book => (
                              <button key={book.id} type="button" onClick={() => {
                                const newVerses = [...editingCustomSet.verses];
                                newVerses[idx] = { ...newVerses[idx], book: book.id, reference: '' };
                                setEditingCustomSet({ ...editingCustomSet, verses: newVerses });
                                setBookPickerIdx(null);
                              }} style={{ padding: '0.35rem 0.5rem', borderRadius: '3px', border: 'none', background: v.book === book.id ? '#10b981' : 'rgba(255,255,255,0.08)', color: v.book === book.id ? '#fff' : '#e2e8f0', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold', minWidth: '42px' }}>
                                {getBookAbbr(book, version)}
                              </button>
                            ))}
                          </div>
                          <div style={{ color: '#e2e8f0', fontWeight: 'bold', fontSize: '0.85rem', padding: '0.3rem 0', borderBottom: '1px solid rgba(255,255,255,0.1)', marginBottom: '0.3rem' }}>{t("新約", "New Testament")}</div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2px' }}>
                            {BIBLE_BOOKS.filter(b => b.testament === 'NT').map(book => (
                              <button key={book.id} type="button" onClick={() => {
                                const newVerses = [...editingCustomSet.verses];
                                newVerses[idx] = { ...newVerses[idx], book: book.id, reference: '' };
                                setEditingCustomSet({ ...editingCustomSet, verses: newVerses });
                                setBookPickerIdx(null);
                              }} style={{ padding: '0.35rem 0.5rem', borderRadius: '3px', border: 'none', background: v.book === book.id ? '#10b981' : 'rgba(255,255,255,0.08)', color: v.book === book.id ? '#fff' : '#e2e8f0', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold', minWidth: '42px' }}>
                                {getBookAbbr(book, version)}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      <input type="text" value={v.verseInput !== undefined ? v.verseInput : (v.reference || '')} onChange={e => {
                        const newVerses = [...editingCustomSet.verses];
                        const bookInfo = v.book ? BIBLE_BOOKS.find(b => b.id === v.book) : null;
                        const bookPrefix = bookInfo ? getBookAbbr(bookInfo, version) + ' ' : '';
                        newVerses[idx] = { ...newVerses[idx], verseInput: e.target.value, reference: v.book ? bookPrefix + e.target.value : e.target.value };
                        setEditingCustomSet({ ...editingCustomSet, verses: newVerses });
                      }} onKeyDown={async (e) => {
                        if (e.key === 'Enter' || e.key === 'Tab') {
                          if (e.key === 'Enter') e.preventDefault();
                          const bookInfo = BIBLE_BOOKS.find(b => b.id === v.book);
                          if (!bookInfo) return toast.error(t("請先選擇書卷", "Please select a book first"));
                          await autoFetchVerse(bookInfo, v.verseInput || '', idx);
                        }
                      }} placeholder={t("章:節 (如 3:16)", "Ch:Vs (e.g. 3:16)")}
                        style={{ width: isNarrowEditor ? '84px' : '110px', boxSizing: 'border-box', padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }} />
                      </div>

                      <textarea
                        value={v.text}
                        readOnly={!v.reference}
                        onChange={e => {
                          const newVerses = [...editingCustomSet.verses];
                          newVerses[idx].text = e.target.value;
                          setEditingCustomSet({ ...editingCustomSet, verses: newVerses });
                        }}
                        placeholder={t("請先在前方選定書卷並輸入章節，按下 Enter 或 Tab 後即可解鎖此欄位", "Select book & chapter:verse, press Enter/Tab to unlock")}
                        style={{
                          flex: 1,
                          minWidth: 0,
                          padding: '0.5rem',
                          borderRadius: '4px',
                          border: '1px solid #cbd5e1',
                          minHeight: isNarrowEditor ? '116px' : '40px',
                          resize: 'vertical',
                          fontSize: '0.9rem',
                          background: !v.reference ? '#e2e8f0' : '#ffffff',
                          cursor: !v.reference ? 'not-allowed' : 'text',
                          color: !v.reference ? '#94a3b8' : '#0f172a'
                        }}
                      />

                      {/* Action column: read-aloud / record / delete (stacked on phones). */}
                      <div style={{ display: 'flex', flexDirection: isNarrowEditor ? 'column' : 'row', gap: '0.4rem', flexShrink: 0 }}>
                      {/* 朗讀預覽 — play the creator's recording if any, else TTS (like the
                          View modal). Toggles: while this row is reading aloud the button
                          becomes a red ⏹ stop (long passages must be stoppable). */}
                      <button
                        type="button"
                        disabled={!v.text}
                        onClick={async () => {
                          const stopAll = () => {
                            if ('speechSynthesis' in window) window.speechSynthesis.cancel();
                            stopVerseModalAudio();
                          };
                          if (editorPlayingVerse === idx) {
                            stopAll();
                            setEditorPlayingVerse(null);
                            return;
                          }
                          stopAll();
                          setEditorPlayingVerse(idx);
                          // Drop the cache so a just-recorded voice is picked up.
                          if (editingCustomSet.id) setVoicesLookupRef.current.delete(editingCustomSet.id);
                          const played = editingCustomSet.id
                            ? await playSetVerseVoice(editingCustomSet.id, v.reference)
                            : false;
                          if (played) {
                            // Flip back to ▶ when the recording finishes on its own.
                            const audio = verseModalAudioRef.current;
                            if (audio) {
                              const clear = () => setEditorPlayingVerse(cur => (cur === idx ? null : cur));
                              audio.onended = clear;
                              audio.onerror = clear;
                            }
                            return;
                          }
                          // speakText resolves when TTS ends (or is cancelled) — only
                          // clear if this row is still the active one.
                          await speakText(v.text, 1.0, getVoiceLangForVersion(version));
                          setEditorPlayingVerse(cur => (cur === idx ? null : cur));
                        }}
                        title={editorPlayingVerse === idx ? t('停止朗讀', 'Stop reading') : t('朗讀這節', 'Read this verse aloud')}
                        style={{
                          background: !v.text ? '#f1f5f9' : editorPlayingVerse === idx ? '#ef4444' : '#8b5cf6',
                          color: v.text ? '#fff' : '#94a3b8',
                          border: '1px solid #cbd5e1', padding: '0.5rem', borderRadius: '4px',
                          cursor: !v.text ? 'not-allowed' : 'pointer',
                          opacity: !v.text ? 0.5 : 1,
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        }}
                      >{editorPlayingVerse === idx
                        ? <Square size={16} fill="currentColor" />
                        : <Play size={16} fill="currentColor" />}</button>

                      {/* 創作者親聲朗讀 — record / re-record this verse.
                          Background bake+upload shows ⏳ (processing) / ⚠️ (error). */}
                      {(() => {
                        const vStatus = editorVoiceStatus[v.reference];
                        const hasVoice = !!editorVerseVoices[v.reference];
                        const bg = vStatus === 'processing' ? '#a855f7' : vStatus === 'error' ? '#f59e0b' : hasVoice ? '#16a34a' : '#f1f5f9';
                        return (
                      <button
                        type="button"
                        disabled={!editingCustomSet.id || !v.reference || !v.text || vStatus === 'processing'}
                        onClick={() => setEditorVoiceTarget({ reference: v.reference, text: v.text })}
                        title={!editingCustomSet.id
                          ? t('請先儲存經文組,再錄音', 'Save the set first, then record')
                          : vStatus === 'processing'
                            ? t('背景美化上傳中…', 'Enhancing + uploading in the background…')
                            : vStatus === 'error'
                              ? t('處理失敗 — 點擊重錄這節', 'Failed — tap to re-record')
                              : hasVoice
                                ? t('已有錄音({name})— 點擊重錄', 'Recorded ({name}) — click to re-record').replace('{name}', String(editorVerseVoices[v.reference].recordedBy || ''))
                                : t('用你的聲音錄這節,聽的人會聽到你唸', 'Record this verse — listeners will hear your voice')}
                        style={{
                          background: bg,
                          color: (bg === '#f1f5f9') ? '#475569' : '#fff',
                          border: '1px solid #cbd5e1', padding: '0.5rem', borderRadius: '4px',
                          cursor: (!editingCustomSet.id || !v.reference || !v.text || vStatus === 'processing') ? 'not-allowed' : 'pointer',
                          opacity: (!editingCustomSet.id || !v.reference || !v.text) ? 0.5 : 1,
                        }}
                      >{vStatus === 'processing' ? '⏳' : vStatus === 'error' ? '⚠️' : '🎙️'}</button>
                        );
                      })()}
                      <button type="button"
                        onClick={() => {
                          const hasContent = v.reference || v.text;
                          // First tap on a non-empty row just arms; second tap deletes.
                          // (window.confirm is a silent no-op in iOS WKWebView, so we
                          // confirm in-app instead.)
                          if (hasContent && confirmDeleteIdx !== idx) {
                            setConfirmDeleteIdx(idx);
                            clearTimeout(confirmDeleteTimerRef.current);
                            confirmDeleteTimerRef.current = setTimeout(() => setConfirmDeleteIdx(null), 3500);
                            return;
                          }
                          clearTimeout(confirmDeleteTimerRef.current);
                          setConfirmDeleteIdx(null);
                          const newVerses = editingCustomSet.verses.filter((_, i) => i !== idx);
                          setEditingCustomSet({ ...editingCustomSet, verses: newVerses });
                        }}
                        title={confirmDeleteIdx === idx ? t('再按一次刪除', 'Tap again to delete') : t('刪除這節', 'Delete this verse')}
                        style={{ background: confirmDeleteIdx === idx ? '#b91c1c' : '#ef4444', color: 'white', border: confirmDeleteIdx === idx ? '2px solid #fca5a5' : 'none', padding: confirmDeleteIdx === idx ? '0.4rem 0.5rem' : '0.5rem', borderRadius: '4px', cursor: 'pointer', fontWeight: confirmDeleteIdx === idx ? 700 : 400, fontSize: confirmDeleteIdx === idx ? '0.8rem' : '1rem', whiteSpace: 'nowrap' }}>
                        {confirmDeleteIdx === idx ? t('確定?', 'Sure?') : '✖'}
                      </button>
                      </div>
                    </div>
                  );
                })}

                {editorVoiceTarget && editingCustomSet.id && (
                  <VerseVoiceRecorder
                    t={t}
                    reference={formatVerseReferenceForDisplay(editorVoiceTarget.reference, version)}
                    verseText={editorVoiceTarget.text}
                    onUpload={({ blob, mime, dur, beautify }) => {
                      // Bake (if enhancing) + upload in the BACKGROUND — the
                      // realtime bake takes ~as long as the clip, so we never
                      // block the creator. Capture the raw reference + setId now.
                      const ref = editorVoiceTarget.reference;
                      const setId = editingCustomSet.id;
                      const recordedBy = playerName || (userEmail || '').split('@')[0] || 'Anonymous';
                      const email = userEmail || '';
                      const seq = (editorSaveSeqRef.current[ref] || 0) + 1;
                      editorSaveSeqRef.current[ref] = seq;
                      const isLatest = () => editorSaveSeqRef.current[ref] === seq;
                      const prevJob = editorUploadJobRef.current[ref];
                      setEditorVoiceStatus(prev => ({ ...prev, [ref]: 'processing' }));
                      const job = (async () => {
                        // Serialize same-verse re-records so the last take wins on the
                        // server, not whichever upload finishes last.
                        if (prevJob) { try { await prevJob; } catch { /* prior take failed — still record this one */ } }
                        if (!isLatest()) return;
                        try {
                          const finalBlob = beautify ? await bakeBeautifiedBlob(blob, mime) : blob;
                          if (!isLatest()) return; // superseded during the bake
                          const meta = await uploadVerseVoice({ email, setId, reference: ref, blob: finalBlob, mime, dur, recordedBy });
                          if (!isLatest()) return; // a newer take already replaced this one
                          setEditorVerseVoices(prev => ({ ...prev, [ref]: meta }));
                          // No success toast — the mic button turning green is enough,
                          // and extra notifications distract mid-recording.
                          setEditorVoiceStatus(prev => { const n = { ...prev }; delete n[ref]; return n; });
                        } catch (e) {
                          if (!isLatest()) return;
                          setEditorVoiceStatus(prev => ({ ...prev, [ref]: 'error' }));
                          // A permission conflict (this verse was recorded under a
                          // different account) is NOT a transient failure — re-recording
                          // will keep failing. Say the real reason instead of "re-record".
                          const locked = /original recorder/i.test(String(e?.message || ''));
                          toast.error(locked
                            ? t('這節之前是用別的帳號錄的,無法覆蓋。請先刪掉這一行再重加,或用原本的帳號登入。',
                                 'This verse was recorded under a different account and can’t be overwritten. Remove and re-add this row, or sign in with the original account.')
                            : t('錄音處理失敗,請重錄這節', 'Recording failed — please re-record this verse'));
                        }
                      })();
                      editorUploadJobRef.current[ref] = job;
                      job.finally(() => { if (editorUploadJobRef.current[ref] === job) delete editorUploadJobRef.current[ref]; });
                    }}
                    onCancel={() => setEditorVoiceTarget(null)}
                    onDone={() => setEditorVoiceTarget(null)}
                  />
                )}

                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                  <button type="button" onClick={() => {
                    setEditingCustomSet({
                      ...editingCustomSet,
                      verses: [...editingCustomSet.verses, { book: null, verseInput: '', reference: '', text: '' }]
                    });
                  }} style={{ background: '#e2e8f0', color: '#475569', border: '1px dashed #94a3b8', padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer', flex: 1, fontWeight: 'bold' }}>
                    + {t("新增一節經文", "Add Verse")}
                  </button>
                  <button type="button" onClick={() => setBulkImportState({ text: '', busy: false, progress: '', failed: [] })}
                    title={t('貼上經文出處清單(每行一個),自動抓取經文', 'Paste a list of references (one per line) to auto-fetch the verses')}
                    style={{ background: '#eff6ff', color: '#1d4ed8', border: '1px dashed #93c5fd', padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer', flex: 1, fontWeight: 'bold' }}>
                    📋 {t("輸入出處批次匯入", "Bulk Import by Reference")}
                  </button>
                </div>

                {bulkImportState && (
                  <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1300, padding: '1rem' }} onClick={(e) => { if (e.target === e.currentTarget && !bulkImportState.busy) setBulkImportState(null); }}>
                    <div style={{ background: '#fff', borderRadius: 14, padding: '1.5rem', width: 'min(520px, 100%)', boxShadow: '0 20px 40px rgba(0,0,0,0.25)' }}>
                      <h3 style={{ margin: '0 0 0.4rem', color: '#1e293b' }}>📋 {t('輸入出處來建立經文組', 'Build the set from references')}</h3>
                      <p style={{ margin: '0 0 0.8rem', color: '#64748b', fontSize: '0.88rem', lineHeight: 1.5 }}>
                        {t('每行或以逗號分隔貼上經文出處(例:太 19:14、詩 139:13-14),系統會自動抓取經文內容。', 'Paste references one per line or separated by commas (e.g. 太 19:14, 詩 139:13-14) — the verse text is fetched automatically.')}
                      </p>
                      <p style={{ margin: '-0.4rem 0 0.8rem', color: '#64748b', fontSize: '0.85rem', lineHeight: 1.5 }}>
                        {t('同一章的其他節可以用逗號接在後面：「約翰福音 1:1, 4」＝ 1:1 與 1:4；「創世記 1:26-28, 2:7」＝ 同書卷的 2:7。', 'After a reference, a comma followed by a bare verse stays in the same chapter: "John 1:1, 4" = 1:1 and 1:4; "Genesis 1:26-28, 2:7" = 2:7 of the same book.')}
                      </p>
                      <textarea
                        value={bulkImportState.text}
                        disabled={bulkImportState.busy}
                        onChange={e => setBulkImportState(s => ({ ...s, text: e.target.value }))}
                        placeholder={[[40, '19:14'], [41, '10:16'], [19, '127:3'], [23, '49:15']].map(([id, cv]) => `${getBookAbbr(BIBLE_BOOKS.find(b => b.id === id), version)} ${cv}`).join('\n')}
                        style={{ width: '100%', minHeight: '180px', padding: '0.7rem', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: '0.95rem', fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box' }}
                      />
                      {bulkImportState.failed?.length > 0 && !bulkImportState.busy && (
                        <div style={{ margin: '0.6rem 0 0', padding: '0.6rem 0.8rem', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, color: '#991b1b', fontSize: '0.85rem' }}>
                          {t('這些行無法辨識或抓不到經文,請修改後重試或手動輸入:', 'These lines could not be matched/fetched — fix and retry, or add them manually:')}
                          <div style={{ marginTop: 4, fontWeight: 600 }}>{bulkImportState.failed.join('、')}</div>
                        </div>
                      )}
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem', marginTop: '1rem', alignItems: 'center' }}>
                        {bulkImportState.busy && <span style={{ color: '#64748b', fontSize: '0.85rem' }}>{t('抓取中… {progress}', 'Fetching… {progress}').replace('{progress}', String(bulkImportState.progress))}</span>}
                        <Button variant="secondary" disabled={bulkImportState.busy} onClick={() => setBulkImportState(null)}>
                          {t('取消', 'Cancel')}
                        </Button>
                        <Button loading={bulkImportState.busy} disabled={!bulkImportState.text.trim()} onClick={runBulkImport}>
                          {bulkImportState.busy ? t('匯入中…', 'Importing…') : t('匯入', 'Import')}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input type="checkbox" id="publishSet" checked={editingCustomSet.isPublished || false} onChange={e => setEditingCustomSet({ ...editingCustomSet, isPublished: e.target.checked })} style={{ width: '1.2rem', height: '1.2rem', cursor: 'pointer' }} />
                <label htmlFor="publishSet" style={{ fontWeight: 'bold', color: '#475569', cursor: 'pointer' }}>{t("公開此經文組 (Publish to Global Verse Sets)", "Publish to Global Verse Sets")}</label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginTop: '2rem' }}>
                {editingCustomSet.id ? (
                  <Button variant="danger" icon={<Trash2 size={18} />} onClick={async () => {
                    const doomed = editingCustomSet;
                    const ok = await confirmDialog({
                      title: t('刪除經文組？', 'Delete this set?'),
                      message: t('「{title}」會被刪除，其他人也看不到了。這無法復原。', '“{title}” will be deleted and no one else will see it. This can’t be undone.').replace('{title}', doomed.title || t('未命名經文組', 'Untitled set')),
                      confirmLabel: t('刪除', 'Delete'),
                      danger: true,
                    });
                    if (!ok) return;

                    // Remove from local custom sets + localStorage
                    const updatedSets = customVerseSets.filter(s => s.id !== doomed.id);
                    setCustomVerseSets(updatedSets);
                    localStorage.setItem('verseRain_custom_sets', JSON.stringify(updatedSets));

                    // If published, also remove from PartyKit
                    if (publishedVerseSets.some(p => p.id === doomed.id)) {
                      fetch("https://verserain-party.hungry4grace.partykit.dev/parties/main/global-auth-db/custom-sets", {
                        method: "DELETE",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ id: doomed.id, adminEmail: userEmail, adminName: playerName })
                      }).catch(e => console.error("Delete-from-published failed", e));
                      setPublishedVerseSets(prev => prev.filter(p => p.id !== doomed.id));
                    }

                    toast.success(t('經文組已刪除', 'Set deleted'));
                    setEditingCustomSet(null);
                  }} data-testid="set-editor-delete">
                    {t("刪除經文組", "Delete Set")}
                  </Button>
                ) : <span />}
                <Button size="lg" icon={<Save size={20} />} data-testid="set-editor-save" onClick={() => {
                  if (!editingCustomSet.title) return toast.error(t("請填寫標題", "Please fill in title"));
                  if (editingCustomSet.verses.length === 0) return toast.error(t("請至少新增一節經文", "Please add at least one verse"));

                  const setObj = {
                    ...editingCustomSet,
                    language: version,
                    id: editingCustomSet.id || `custom-${Date.now()}`,
                    // My own set (bound to my email, or authored under my
                    // current / an earlier name) carries my current name;
                    // someone else's keeps its author.
                    authorName: isMySet(editingCustomSet, playerName, userEmail)
                      ? (playerName || "Anonymous")
                      : editingCustomSet.authorName,
                    lastEditedAt: new Date().toISOString(),
                    lastEditorName: playerName || "Anonymous"
                  };

                  let updatedSets;
                  if (editingCustomSet.id) {
                    if (customVerseSets.some(s => s.id === setObj.id)) {
                      updatedSets = customVerseSets.map(s => s.id === setObj.id ? setObj : s);
                    } else if (setObj.isPublished && !isMySet(editingCustomSet, playerName, userEmail)) {
                      // An admin editing someone else's published set: update
                      // the published copy only, don't add it to my own sets.
                      updatedSets = customVerseSets;
                    } else {
                      updatedSets = [setObj, ...customVerseSets];
                    }
                  } else {
                    updatedSets = [setObj, ...customVerseSets];
                  }

                  if (updatedSets !== customVerseSets) {
                    setCustomVerseSets(updatedSets);
                    localStorage.setItem('verseRain_custom_sets', JSON.stringify(updatedSets));
                  }

                  // Handle publishing sync
                  if (setObj.isPublished) {
                    const existingPublishedSet = publishedVerseSets.find(p => p.id === setObj.id);
                    const originalAuthorName = (!existingPublishedSet || isMySet(existingPublishedSet, playerName, userEmail))
                      ? ((setObj.authorName && setObj.authorName !== "Anonymous") ? setObj.authorName : (playerName || "Anonymous"))
                      : existingPublishedSet.authorName;
                    const publishedObj = {
                      ...setObj,
                      authorName: originalAuthorName,
                      lastEditorName: playerName || "Anonymous",
                      lastEditedAt: new Date().toISOString()
                    };
                    fetch("https://verserain-party.hungry4grace.partykit.dev/parties/main/global-auth-db/custom-sets", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ ...publishedObj, adminEmail: userEmail, adminName: playerName })
                    }).then(async (res) => {
                      if (res.ok) return;
                      // Surface the failure — silent 403s made
                      // creators think their set was published
                      // when nobody else could see it.
                      const d = await res.json().catch(() => ({}));
                      toast.error(t('發布失敗:{error}。其他人將看不到這個經文組。', "Publish failed: {error}. Others won't see this set.").replace('{error}', String(d.error || res.status)));
                      setPublishedVerseSets(prev => prev.filter(p => p.id !== setObj.id));
                    }).catch(e => console.error("Publish failed", e));

                    setPublishedVerseSets(prev => {
                      const exists = prev.find(p => p.id === setObj.id);
                      if (exists) return prev.map(p => p.id === setObj.id ? publishedObj : p);
                      return [publishedObj, ...prev];
                    });
                  } else {
                    fetch("https://verserain-party.hungry4grace.partykit.dev/parties/main/global-auth-db/custom-sets", {
                      method: "DELETE",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ id: setObj.id, adminEmail: userEmail, adminName: playerName })
                    }).catch(e => console.error("Unpublish failed", e));

                    setPublishedVerseSets(prev => prev.filter(p => p.id !== setObj.id));
                  }

                  setEditingCustomSet(null);
                  toast.success(t('已儲存「{title}」', 'Saved “{title}”').replace('{title}', setObj.title));
                }}>
                  {t("儲存經文組", "Save Set")}
                </Button>
              </div>
            </div>
          ) : (
            <div>
              <Button icon={<Plus size={20} />} style={{ marginBottom: 'var(--space-5)' }} onClick={() => {
                setEditingCustomSet({ title: '', description: '', verses: [{ version: 'CUV', reference: '', text: '' }] });
              }}>
                {t("建立新經文組", "Create New Set")}
              </Button>

              {customVerseSets.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#94a3b8', border: '2px dashed #e2e8f0', borderRadius: '8px' }}>
                  {t("你還沒有建立任何專屬經文組。點擊上方按鈕開始！", "You haven't created any custom sets yet. Click the button above to start!")}
                </div>
              ) : (() => {
                const PER_PAGE = 10;
                const totalPages = Math.max(1, Math.ceil(sortedCustomSets.length / PER_PAGE));
                const page = Math.min(customSetsPage, totalPages);
                const pageSets = sortedCustomSets.slice((page - 1) * PER_PAGE, page * PER_PAGE);
                return (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '0.5rem', marginBottom: '0.8rem' }}>
                    <span style={{ color: '#64748b', fontSize: '0.85rem' }}>{t('排序', 'Sort')}</span>
                    <select
                      value={customSetsSort}
                      onChange={e => { setCustomSetsSort(e.target.value); setCustomSetsPage(1); }}
                      style={{ padding: '0.4rem 0.7rem', borderRadius: 6, border: '1px solid #cbd5e1', background: '#f8fafc', color: '#334155', fontSize: '0.9rem', cursor: 'pointer' }}
                    >
                      <option value="newest">{t('最新', 'Newest')}</option>
                      <option value="title">{t('標題', 'Title')}</option>
                      <option value="popular">{t('最受歡迎', 'Most Popular')}</option>
                      <option value="favorites">{t('我的最愛', 'Favorites')}</option>
                    </select>
                  </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {pageSets.map(set => (
                    <div key={set.id} data-testid="my-set-card" style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: 'var(--space-4) var(--space-5)', background: 'var(--color-surface)' }}>
                      <h3 style={{ margin: '0 0 var(--space-2) 0', color: 'var(--color-text)', fontSize: 'var(--fs-heading)' }}>{set.title}</h3>
                      {/* Clamp long rich-text intros to ~3 lines so the list stays scannable.
                          line-clamp handles plain text; maxHeight backstops embedded headings/
                          images whose line boxes line-clamp can't count. Full intro still shows
                          on the set's play page. */}
                      <div
                        className="ql-editor-content"
                        style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '1rem', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden', maxHeight: '4.4em' }}
                        dangerouslySetInnerHTML={{ __html: set.description }}
                      />
                      <div style={{ color: 'var(--color-primary-strong)', fontSize: 'var(--fs-small)', fontWeight: 'bold' }}>{set.verses?.length || 0} {t("節經文", "verses")}</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)', marginTop: 'var(--space-3)' }}>
                        <Button size="sm" icon={<BookOpen size={18} />} onClick={() => {
                          setSelectedSetId(set.id);
                          setMainTab('versesets');
                        }}>{t("查看", "Open")}</Button>
                        <Button size="sm" variant="secondary" icon={<Edit size={18} />} onClick={() => setEditingCustomSet({ ...set, verses: set.verses?.map(parseVerseRef) || [] })}>{t("編輯", "Edit")}</Button>
                        <Button size="sm" variant="text" icon={<Languages size={18} />} disabled={!set?.verses?.length} onClick={() => setTranslateModal({ set, target: '', phase: 'pick' })} title={t("把整組經文翻譯到另一種語言的經文組", "Translate this whole set into another language's library")}>{t("翻譯", "Translate")}</Button>
                      </div>
                    </div>
                  ))}
                </div>
                  {totalPages > 1 && (
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.6rem', marginTop: '1.2rem' }}>
                      <button
                        type="button"
                        disabled={page <= 1}
                        onClick={() => setCustomSetsPage(page - 1)}
                        style={{ padding: '0.4rem 0.9rem', borderRadius: 6, border: '1px solid #cbd5e1', background: page <= 1 ? '#f1f5f9' : 'white', color: '#475569', cursor: page <= 1 ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}
                      >← {t('上一頁', 'Prev')}</button>
                      <span style={{ color: '#64748b', fontSize: '0.9rem' }}>{t('第 {page} / {total} 頁', 'Page {page} / {total}').replace('{page}', String(page)).replace('{total}', String(totalPages))}</span>
                      <button
                        type="button"
                        disabled={page >= totalPages}
                        onClick={() => setCustomSetsPage(page + 1)}
                        style={{ padding: '0.4rem 0.9rem', borderRadius: 6, border: '1px solid #cbd5e1', background: page >= totalPages ? '#f1f5f9' : 'white', color: '#475569', cursor: page >= totalPages ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}
                      >{t('下一頁', 'Next')} →</button>
                    </div>
                  )}
                </div>
                );
              })()}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
