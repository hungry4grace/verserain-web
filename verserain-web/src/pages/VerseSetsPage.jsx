// The 經文組 (verse sets) tab — moved out of App.jsx unchanged (UI/UX 第 4 階段).
import { Button, IconButton, confirmDialog, toast } from '../ui';
import { Crown, Edit, Headphones, Home, Languages, Library, Lock, Mic, Pause, Play, Search, Share2, Star, Trophy, Users, Zap } from 'lucide-react';
import { GardenSprite } from '../GardenView.jsx';
import { buildPublicShareUrl } from '../lib/routes.js';
import { createRoomCode } from '../lib/rooms.js';
import { formatVerseReferenceForDisplay, humanizeChineseReferencesForSpeech, parseVerseRef } from '../lib/verseDisplay.js';
import { getVoiceLangForVersion, isEnglishBibleVersion } from '../lib/bible.js';
import { initAudio } from '../lib/audio.js';
import { pickSpeechVoice, stopSpeechIfActive } from '../lib/speech.js';
import { stageBg, stageLabelPair } from '../lib/gardenView.js';
import { toSpeechText } from '../lib/speechText.js';


// Temporarily hide the per-row action buttons on the Scripture Sets list
// (Admin 編輯 / Admin 刪除 / 複製) — low value for now. Flip to true to restore.
const SHOW_SET_LIST_ROW_ACTIONS = false;
export default function VerseSetsPage({ t, canCreateCustomSets, canEditSet, copyVerseSetToMine, currentSet, currentSetAuthorName, currentSetLastEditorName, currentSetVoiceRefs, currentSetVoices, customVerseSets, descTtsState, distractionLevel, favoriteVerseSetIdSet, hiddenOfficialSetIds, isAdmin, isSuperAdmin, myVoicesInSet, openChallengeSetup, personalCode, playerName, playMode, playSingleVerseCard, publishedVerseSets, pushSetForSharing, randomPickCount, selectedSetId, selectedVerseRefs, setActiveVerse, setAuthorSetsModal, setCampaignQueue, setCampaignResults, setDescTtsState, setEditingCustomSet, setHiddenOfficialSetIds, setIsFetchingLeaderboard, setLeaderboardModalData, setLeaderboardModalVerse, setMainTab, setMultiplayerDistractionLevel, setMultiplayerPlayMode, setMultiplayerRoomId, setMultiplayerRoomMode, setMultiplayerRoomRole, setMultiplayerSearchText, setMultiplayerSelectedVerses, setPickerLockedSet, setPickerSelectedSet, setPlayOrderChooser, setPublishedVerseSets, setQrShareModal, setRandomPickCount, setSelectedSetId, setSelectedVerseRefs, setShowMultiplayerVersePicker, setShowPickerBrowser, setTranslateModal, setVersesetsPage, setVersesetsSort, setVerseSortNeedsPractice, setVerseViewModal, setViewCounts, sortedVerseSetList, startGame, toggleFavoriteVerseSet, toggleMyVerseVoicePublic, toggleSelection, userEmail, verseRowsWithGarden, versesetsPage, versesetsSort, verseSortNeedsPractice, version, viewCounts, voiceVisibilityBusy }) {
  return (
    <>

      {/* The Verse Sets Table */}
      <div className="versesets-table-card" style={{ backgroundColor: '#ffffff', overflowX: 'auto', borderRadius: '8px', border: '1px solid #cbd5e1', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        {selectedSetId === null ? (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', padding: '1rem', borderBottom: '1px solid #e2e8f0', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                <Button
                  variant="secondary"
                  icon={canCreateCustomSets ? <Crown size={18} /> : <Lock size={18} />}
                  onClick={() => {
                    setEditingCustomSet(null);
                    setMainTab('custom_verses');
                  }}
                  title={canCreateCustomSets ? t('建立自訂經文組', 'Create custom sets') : t('登入後即可建立自訂經文組', 'Sign in to create custom verse sets')}
                >
                  {t('我的經文組', 'My Custom Sets')}
                </Button>
                <Button variant="secondary" icon={<Search size={18} />} data-testid="sets-search" onClick={() => setMainTab('search')}>
                  {t('搜尋', 'Search')}
                </Button>
              </div>
              <select
                value={versesetsSort}
                onChange={(e) => { setVersesetsSort(e.target.value); setVersesetsPage(1); }}
                style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', background: '#f8fafc', color: '#334155', fontWeight: 'bold', cursor: 'pointer' }}
              >
                <option value="newest">{t("最新", "Newest")}</option>
                <option value="title">{t("標題", "Title")}</option>
                <option value="popular">{t("最受歡迎", "Most Popular")}</option>
              </select>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', color: '#475569', fontSize: '0.9rem' }}>
                  <th style={{ padding: '1rem', borderBottom: '2px solid #e2e8f0', width: '50px' }}><Library size={18} /></th>
                  <th style={{ padding: '1rem', borderBottom: '2px solid #e2e8f0' }}>{t("標題", "Title")}</th>
                  <th style={{ padding: '1rem', borderBottom: '2px solid #e2e8f0' }}>{t("作者", "Author")}</th>
                  <th style={{ padding: '1rem', borderBottom: '2px solid #e2e8f0', textAlign: 'right' }}>{t("點閱次數", "Views")}</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const totalPages = Math.ceil(sortedVerseSetList.length / 10) || 1;
                  const currentPage = Math.min(versesetsPage, totalPages);
                  const currentSetList = sortedVerseSetList.slice((currentPage - 1) * 10, currentPage * 10);

                  return currentSetList.map((set, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #e2e8f0', backgroundColor: i % 2 === 0 ? '#ffffff' : '#f8fafc', transition: 'background 0.2s', cursor: 'pointer' }} onClick={() => {
                      setSelectedSetId(set.id);
                      fetch("https://verserain-party.hungry4grace.partykit.dev/parties/main/global-auth-db/custom-sets/view", { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: set.id, adminEmail: userEmail, adminName: playerName }) }).catch(e => e);
                      setViewCounts(prev => ({ ...prev, [set.id]: (prev[set.id] || 0) + 1 }));
                    }} onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#eff6ff'} onMouseOut={(e) => e.currentTarget.style.backgroundColor = i % 2 === 0 ? '#ffffff' : '#f8fafc'}>
                      <td style={{ padding: '1rem', textAlign: 'center', color: '#3b82f6', fontSize: '1.2rem' }}>{customVerseSets.some(c => c.id === set.id) ? <Crown size={22} /> : <Library size={22} />}</td>
                      <td style={{ padding: '1rem', fontWeight: 'bold', color: '#1e293b', fontSize: '1.05rem' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', minWidth: 0 }}>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleFavoriteVerseSet(set);
                            }}
                            title={favoriteVerseSetIdSet.has(set.id) ? t('從我的最愛移除', 'Remove from favorites') : (userEmail ? t('加入我的最愛', 'Add to favorites') : t('登入後可加入我的最愛', 'Log in to save favorites'))}
                            aria-label={favoriteVerseSetIdSet.has(set.id) ? t('從我的最愛移除', 'Remove from favorites') : t('加入我的最愛', 'Add to favorites')}
                            style={{
                              width: '30px',
                              height: '30px',
                              borderRadius: '8px',
                              border: favoriteVerseSetIdSet.has(set.id) ? '1px solid #facc15' : '1px solid #cbd5e1',
                              background: favoriteVerseSetIdSet.has(set.id) ? '#fef3c7' : '#ffffff',
                              color: favoriteVerseSetIdSet.has(set.id) ? '#ca8a04' : '#94a3b8',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              padding: 0,
                              flex: '0 0 auto'
                            }}
                          >
                            <Star size={17} fill={favoriteVerseSetIdSet.has(set.id) ? 'currentColor' : 'none'} />
                          </button>
                          <span>{set.title}</span>
                        </span>
                        {SHOW_SET_LIST_ROW_ACTIONS && isAdmin && (
                          <span style={{ marginLeft: '1rem', display: 'inline-flex', gap: '0.5rem' }}>
                            <button onClick={(e) => {
                              e.stopPropagation();
                              setEditingCustomSet({ ...set, isPublished: true, verses: set.verses?.map(parseVerseRef) || [] });
                              setMainTab('custom_verses');
                            }} style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', padding: '0.2rem 0.5rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem', color: '#475569' }}>Admin {t('編輯', 'Edit')}</button>
                            {isSuperAdmin && (
                              <button onClick={async (e) => {
                                e.stopPropagation();
                                if (!(await confirmDialog({ title: t('刪除經文組？', 'Delete this set?'), message: t('「{title}」會被刪除，其他人也看不到了。這無法復原。', '“{title}” will be deleted and no one else will see it. This can’t be undone.').replace('{title}', set.title || t('未命名經文組', 'Untitled set')), confirmLabel: t('刪除', 'Delete'), danger: true }))) return;
                                const publishedExists = publishedVerseSets.some(p => p.id === set.id);
                                if (!publishedExists) {
                                  const nextHidden = Array.from(new Set([...(hiddenOfficialSetIds || []), set.id]));
                                  setHiddenOfficialSetIds(nextHidden);
                                  localStorage.setItem('verseRain_hidden_official_sets', JSON.stringify(nextHidden));
                                  return;
                                }
                                fetch("https://verserain-party.hungry4grace.partykit.dev/parties/main/global-auth-db/custom-sets", {
                                  method: "DELETE",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ id: set.id, adminEmail: userEmail, adminName: playerName })
                                })
                                  .then(async (res) => {
                                    if (!res.ok) {
                                      const msg = await res.text().catch(() => '');
                                      throw new Error(msg || `HTTP ${res.status}`);
                                    }
                                    setPublishedVerseSets(prev => prev.filter(p => p.id !== set.id));
                                    toast.success(t('經文組已刪除', 'Set deleted'));
                                  })
                                  .catch((err) => {
                                    console.error(err);
                                    toast.error(t("刪除失敗，請重新登入後再試。", "Delete failed. Please log in again and try once more."));
                                  });
                              }} style={{ background: '#fee2e2', border: '1px solid #fca5a5', color: '#ef4444', padding: '0.2rem 0.5rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}>{`Admin ${t('刪除', 'Delete')}`}</button>
                            )}
                          </span>
                        )}
                        {SHOW_SET_LIST_ROW_ACTIONS && (
                        <button onClick={(e) => { e.stopPropagation(); copyVerseSetToMine(set); }}
                          title={t('複製成我的經文組，可自行編輯，不影響原本的', 'Copy into my sets — edit freely without touching the original')}
                          style={{ marginLeft: isAdmin ? '0.5rem' : '1rem', background: '#eef2ff', border: '1px solid #c7d2fe', padding: '0.2rem 0.5rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem', color: '#4338ca' }}>
                          {t('複製', 'Copy')}
                        </button>
                        )}
                      </td>
                      <td style={{ padding: '1rem', color: '#337ab7', fontSize: '0.9rem', fontWeight: 'bold' }}>{set.authorName && set.authorName !== "Anonymous" ? set.authorName : (String(set.id).startsWith("custom-") ? t('匿名玩家', 'Anonymous') : t('Verserain 官方', 'Official'))}</td>
                      <td style={{ padding: '1rem', textAlign: 'right', color: '#64748b', fontWeight: 'bold' }}>{viewCounts[set.id] || 0}</td>
                    </tr>
                  ));
                })()}
              </tbody>
            </table>

            {/* Pagination for Verse Sets */}
            {(() => {
              const totalPages = Math.ceil(sortedVerseSetList.length / 10) || 1;
              if (totalPages <= 1) return null;
              const PAGE_GROUP_SIZE = 10;
              const groupStart = Math.floor((versesetsPage - 1) / PAGE_GROUP_SIZE) * PAGE_GROUP_SIZE + 1;
              const groupEnd = Math.min(totalPages, groupStart + PAGE_GROUP_SIZE - 1);
              const visiblePages = Array.from({ length: groupEnd - groupStart + 1 }, (_, idx) => groupStart + idx);
              const canGoPreviousGroup = groupStart > 1;
              const canGoNextGroup = groupEnd < totalPages;
              return (
                <div className="versesets-pagination" style={{ padding: '1rem', display: 'grid', gridTemplateColumns: 'auto minmax(0, 1fr) auto', alignItems: 'center', gap: '0.5rem', borderTop: '1px solid #e2e8f0' }}>
                  <button
                    onClick={() => setVersesetsPage(Math.max(1, groupStart - PAGE_GROUP_SIZE))}
                    disabled={!canGoPreviousGroup}
                    className="versesets-page-step"
                    title={t("前 10 頁", "Previous 10 pages")}
                    style={{
                      padding: '0.55rem 0.9rem',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      background: !canGoPreviousGroup ? '#f1f5f9' : '#ffffff',
                      color: !canGoPreviousGroup ? '#94a3b8' : '#475569',
                      fontWeight: 'bold',
                      cursor: !canGoPreviousGroup ? 'not-allowed' : 'pointer',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {'<'}
                  </button>

                  <div className="versesets-page-window" style={{ display: 'flex', justifyContent: 'center', minWidth: 0 }}>
                    <div className="versesets-page-scroll" style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', padding: '0.35rem 0.1rem', scrollSnapType: 'x proximity', WebkitOverflowScrolling: 'touch' }}>
                      {visiblePages.map((pageNumber) => {
                        const isCurrent = versesetsPage === pageNumber;
                        return (
                          <button
                            key={pageNumber}
                            onClick={() => setVersesetsPage(pageNumber)}
                            className="versesets-page-button"
                            style={{
                              padding: '0.55rem 0.9rem',
                              borderRadius: '8px',
                              border: isCurrent ? 'none' : '1px solid #cbd5e1',
                              background: isCurrent ? '#3b82f6' : '#ffffff',
                              color: isCurrent ? '#ffffff' : '#475569',
                              fontWeight: 'bold',
                              cursor: 'pointer',
                              transition: 'all 0.2s',
                              minWidth: '44px',
                              flex: '0 0 auto',
                              scrollSnapAlign: 'center'
                            }}
                          >
                            {pageNumber}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <button
                    onClick={() => setVersesetsPage(Math.min(totalPages, groupEnd + 1))}
                    disabled={!canGoNextGroup}
                    className="versesets-page-step"
                    title={t("後 10 頁", "Next 10 pages")}
                    style={{
                      padding: '0.55rem 0.9rem',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      background: !canGoNextGroup ? '#f1f5f9' : '#ffffff',
                      color: !canGoNextGroup ? '#94a3b8' : '#475569',
                      fontWeight: 'bold',
                      cursor: !canGoNextGroup ? 'not-allowed' : 'pointer',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {'>'}
                  </button>
                </div>
              );
            })()}
          </>
        ) : (
          <>
            <div data-testid="set-detail-header" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', padding: 'var(--space-4)', borderBottom: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface-2)' }}>
              <div>
                <Button variant="secondary" size="sm" icon={<Home size={18} />} onClick={() => setSelectedSetId(null)}>{t("返回目錄", "Back to Menu")}</Button>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-2)', minWidth: 0 }}>
                <IconButton
                  label={favoriteVerseSetIdSet.has(currentSet?.id) ? t('從我的最愛移除', 'Remove from favorites') : (userEmail ? t('加入我的最愛', 'Add to favorites') : t('登入後可加入我的最愛', 'Log in to save favorites'))}
                  aria-pressed={favoriteVerseSetIdSet.has(currentSet?.id)}
                  onClick={(e) => {
                          e.stopPropagation();
                          toggleFavoriteVerseSet(currentSet);
                        }}
                  style={{ color: favoriteVerseSetIdSet.has(currentSet?.id) ? 'var(--color-warning)' : 'var(--color-text-2)', marginTop: '-6px' }}
                >
                  <Star size={24} fill={favoriteVerseSetIdSet.has(currentSet?.id) ? 'currentColor' : 'none'} />
                </IconButton>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <h2 style={{ margin: 0, fontSize: 'var(--fs-title)', lineHeight: 1.3, color: 'var(--color-text)', overflowWrap: 'anywhere' }}>{currentSet?.title}</h2>
                  <div style={{ marginTop: 'var(--space-1)', color: 'var(--color-text-2)', fontSize: 'var(--fs-small)' }}>
                    {t("作者", "Author")}{' '}
                    <button
                      type="button"
                      onClick={() => setAuthorSetsModal({ authorName: currentSetAuthorName })}
                      style={{ background: 'none', border: 'none', padding: 0, color: 'var(--color-primary-strong)', fontSize: 'inherit', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: '2px' }}
                      title={t("查看這位作者的經文組", "View this author's verse sets")}
                    >
                      {currentSetAuthorName === '匿名玩家' ? t('匿名玩家', 'Anonymous') : currentSetAuthorName === 'Verserain 官方' ? t('Verserain 官方', 'Official') : currentSetAuthorName}
                    </button>
                    {currentSetLastEditorName && (
                      <span> · {t("最後編輯", "Last edited by")} {currentSetLastEditorName}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Top Level Action Bar */}
              <div data-testid="set-detail-actions" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                <Button size="sm" icon={<Headphones size={18} />} title={t("連續播放這個經文組（隨機或按序）", "Continuously play this verse set (shuffled or in order)")} onClick={() => {
                    initAudio();
                    if (!currentSet?.verses?.length) return;
                    setPlayOrderChooser(currentSet);
                  }}>
                  {t("全部聆聽", "Listen to all")}
                </Button>
                <Button size="sm" variant="secondary" icon={<Users size={18} />} title={t("開房間邀請連線遊玩", "Invite players for the whole set")} onClick={() => {
                    initAudio();
                    if (!currentSet?.verses?.length) return;
                    const pm = playMode.endsWith('_solo') ? playMode : playMode === 'square' ? 'square_solo' : playMode === 'rain' ? 'rain_solo' : 'voice_solo';
                    setMultiplayerPlayMode(pm);
                    setMultiplayerDistractionLevel(distractionLevel);
                    // Open the room with the setup panel showing this set already
                    // chosen: the host picks mode, difficulty and how many verses
                    // (or hand-picks verses), then presses 開始 to start the match.
                    setPickerSelectedSet(currentSet);
                    setMultiplayerSelectedVerses([]);
                    setMultiplayerSearchText('');
                    setShowPickerBrowser(true);
                    setPickerLockedSet(true);
                    setRandomPickCount(Math.min(currentSet.verses.length, Math.max(1, parseInt(randomPickCount) || 1)));
                    setShowMultiplayerVersePicker(true);
                    setMainTab('multiplayer');
                    const newRoom = createRoomCode();
                    setMultiplayerRoomMode('individual');
                    setMultiplayerRoomRole('player');
                    setMultiplayerRoomId(newRoom);
                  }}>
                  {t("邀人對戰", "Invite to a duel")}
                </Button>
                <Button size="sm" variant="secondary" icon={<Languages size={18} />} title={t("把整組經文翻譯到另一種語言的經文組", "Translate this whole set into another language's library")} onClick={() => {
                    if (!currentSet?.verses?.length) return;
                    setTranslateModal({ set: currentSet, target: '', phase: 'pick' });
                  }}>
                  {t("翻譯", "Translate")}
                </Button>
                {canEditSet(currentSet) && (
                  <Button size="sm" variant="text" icon={<Edit size={18} />} title={t("編輯這個經文組", "Edit this verse set")} onClick={() => {
                      setEditingCustomSet({ ...currentSet, isPublished: true, verses: currentSet.verses?.map(parseVerseRef) || [] });
                      setMainTab('custom_verses');
                    }}>
                    {t("編輯", "Edit")}
                  </Button>
                )}
                <IconButton label={t("分享聆聽連結(按序播放全部經文)", "Share listening link (all verses in order)")} onClick={() => {
                    // Push the set to /share-set BEFORE handing the
                    // URL out — otherwise recipients in fresh
                    // contexts (Skool in-app webview, new device,
                    // logged-out) hit the viewSet fallback chain
                    // and the /share-set GET 404s, leaving them
                    // staring at the home page. Pushing first means
                    // the fallback can always resolve the id.
                    pushSetForSharing(currentSet);
                    // Share the sequential-listen experience: the
                    // recipient hears the WHOLE set in order
                    // (creator recordings included) via the /lc card.
                    pushSetForSharing(currentSet, true);
                    const link = buildPublicShareUrl('/lc', {
    ref: personalCode,
                      set: currentSet.id,
                      order: 'seq',
                      version,
                    });
                    setQrShareModal({ url: link, reference: currentSet.title });
                  }}>
                  <Share2 size={20} />
                </IconButton>
              </div>
            </div>
            {currentSet?.description && (
              <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e2e8f0', backgroundColor: '#ffffff' }}>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={() => {
                      if (!('speechSynthesis' in window)) return;
                      if (descTtsState === 'playing') {
                        window.speechSynthesis.pause();
                        setDescTtsState('paused');
                        return;
                      }
                      if (descTtsState === 'paused') {
                        window.speechSynthesis.resume();
                        setDescTtsState('playing');
                        return;
                      }
                      // idle → start fresh
                      const tmp = document.createElement('div');
                      tmp.innerHTML = currentSet.description || '';
                      // Sanitize the description for TTS so URLs,
                      // markdown syntax characters, and bare
                      // protocol fragments aren't read out loud
                      // — that "https colon slash slash ..."
                      // recital is unpleasant.
                      const text = (tmp.textContent || '')
                        // Drop URLs (http(s)://, www., bare youtube embeds)
                        .replace(/https?:\/\/\S+/gi, ' ')
                        .replace(/\bwww\.\S+/gi, ' ')
                        // Drop markdown link [label](url) — keep label only
                        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
                        // Strip markdown emphasis & headers/blockquote/list markers
                        .replace(/[*_~`]+/g, ' ')        // **bold** *italic* ~~strike~~ `code`
                        .replace(/^#{1,6}\s+/gm, '')      // # ## ### headings
                        .replace(/^\s*>\s+/gm, '')        // > blockquotes
                        .replace(/^\s*[-+]\s+/gm, '')     // - + list bullets
                        .replace(/^\s*\d+\.\s+/gm, '')    // 1. 2. ordered list
                        // Collapse whitespace
                        .replace(/\s+/g, ' ')
                        .trim();
                      if (!text) return;
                      initAudio();
                      stopSpeechIfActive();
                      const lang = getVoiceLangForVersion(version);
                      // 中文朗讀時把出處唸成口語:「3:16」→「第三章16節」、
                      // 「4:1-3」→「第四章1到3節」。
                      const zhLike = !isEnglishBibleVersion(version) && !['ko', 'ja', 'fa', 'ar', 'he'].includes(version);
                      const speechText = zhLike ? humanizeChineseReferencesForSpeech(text) : text;
                      // Chunk by sentence to keep utterances short (some
                      // browsers cap utterance length and silently fail).
                      const chunks = speechText.match(/[^。！？!?.\n]+[。！？!?.\n]?/g) || [speechText];
                      let i = 0;
                      const speakNext = () => {
                        if (i >= chunks.length) { setDescTtsState('idle'); return; }
                        const u = new SpeechSynthesisUtterance(toSpeechText(chunks[i++], lang));
                        u.lang = lang;
                        u.rate = 1.0;
                        try { const v = pickSpeechVoice(lang); if (v) u.voice = v; } catch {}
                        u.onend = speakNext;
                        u.onerror = () => setDescTtsState('idle');
                        window.speechSynthesis.speak(u);
                      };
                      setDescTtsState('playing');
                      speakNext();
                    }}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.4rem 0.9rem', borderRadius: '6px', border: '1px solid #cbd5e1', background: descTtsState === 'playing' ? '#fde68a' : '#ffffff', color: '#334155', fontSize: '0.85rem', fontWeight: 'bold', cursor: 'pointer' }}
                    title={descTtsState === 'playing' ? t('暫停朗讀', 'Pause reading') : descTtsState === 'paused' ? t('繼續朗讀', 'Resume reading') : t('朗讀說明', 'Read description')}
                  >
                    {descTtsState === 'playing' ? <Pause size={14} /> : <Play size={14} />}
                    {descTtsState === 'playing' ? t('暫停', 'Pause') : descTtsState === 'paused' ? t('繼續', 'Resume') : t('朗讀', 'Read')}
                  </button>
                </div>
                <div style={{ color: '#334155', fontSize: '1rem', lineHeight: '1.6' }} dangerouslySetInnerHTML={{ __html: currentSet.description }} className="ql-editor-content" />
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.5rem' }}>
              <button
                type="button"
                onClick={() => setVerseSortNeedsPractice(s => !s)}
                style={{ background: verseSortNeedsPractice ? '#dbeafe' : '#fff', border: '1px solid #93c5fd', color: '#1d4ed8', borderRadius: 999, padding: '0.3rem 0.8rem', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer' }}
              >
                {verseSortNeedsPractice ? `✓ ${t('未通過優先', 'Needs practice first')}` : t('未通過優先排序', 'Sort: needs practice first')}
              </button>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', color: '#475569', fontSize: '0.9rem' }}>
                  <th style={{ padding: '1rem', borderBottom: '2px solid #e2e8f0' }}>{t("經文出處 (點擊觀看)", "Reference (Click to View)")}</th>
                  <th style={{ padding: '1rem', borderBottom: '2px solid #e2e8f0', textAlign: 'center', width: '100px' }}>{t("排行", "Rank")}</th>
                  <th style={{ padding: '1rem', borderBottom: '2px solid #e2e8f0', minWidth: '140px', whiteSpace: 'nowrap', textAlign: 'center' }}>{t("操作", "Action")}</th>
                </tr>
              </thead>
              <tbody>
                {verseRowsWithGarden.map(({ v, i, gEntry }, rowPos) => {
                  const vBest = parseInt(localStorage.getItem(`verseRainBestScore_${v.reference}`)) || 0;
                  const isSelected = selectedVerseRefs.includes(v.reference);

                  return (
                    <tr key={i} style={{ borderBottom: '1px solid #e2e8f0', backgroundColor: isSelected ? '#eff6ff' : (rowPos % 2 === 0 ? '#ffffff' : '#f8fafc'), transition: 'background 0.2s', cursor: 'pointer' }} onClick={() => toggleSelection(v.reference)}>
                      <td style={{ padding: '0.8rem 1rem', fontWeight: 'bold', color: '#1e293b', fontSize: '0.95rem' }} onClick={(e) => { e.stopPropagation(); setVerseViewModal({ ...v, setId: currentSet?.id }); }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                          <span
                            title={gEntry ? `${t(...stageLabelPair(gEntry.stage))}${gEntry.fruits ? ` 🍎×${gEntry.fruits}` : ''}` : t('空地', 'Empty')}
                            style={{ position: 'relative', width: '28px', height: '28px', flexShrink: 0, borderRadius: '5px', background: gEntry ? stageBg(gEntry.stage) : '#5d4037', border: '1px solid rgba(0,0,0,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          >
                            {gEntry && <GardenSprite stage={gEntry.stage} fruits={gEntry.fruits} />}
                          </span>
                          <button style={{ background: 'none', border: 'none', padding: 0, margin: 0, color: '#3b82f6', textDecoration: 'underline', cursor: 'pointer', fontWeight: 'bold', fontSize: 'inherit', fontFamily: 'inherit' }}>
                            {formatVerseReferenceForDisplay(v.reference, version)}
                          </button>
                        </div>
                      </td>
                      <td style={{ padding: '0.8rem 1rem', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                        <button
                          style={{ background: 'transparent', border: '1px solid #fbbf24', color: '#d97706', padding: '0.3rem 0.6rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem', whiteSpace: 'nowrap', fontWeight: 'bold' }}
                          onClick={() => {
                            setLeaderboardModalVerse(v);
                            setIsFetchingLeaderboard(true);
                            fetch(`/api/get-scores?verseRef=${encodeURIComponent(v.reference)}`)
                              .then(res => res.json())
                              .then(data => setLeaderboardModalData(data && Array.isArray(data.alltime) ? data : { alltime: Array.isArray(data) ? data : [], monthly: [], daily: [] }))
                              .catch(() => setLeaderboardModalData({ alltime: [], monthly: [], daily: [] }))
                              .finally(() => setIsFetchingLeaderboard(false));
                          }}
                        >
                          <Trophy size={11} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '3px' }} /> {vBest > 0 ? vBest : t('排行榜', 'Rank')}
                        </button>
                      </td>
                      <td style={{ padding: '0.8rem 1rem', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                        <div className="verse-row-actions">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              playSingleVerseCard(v, currentSet);
                            }}
                            title={(currentSetVoices[v.reference] || currentSetVoiceRefs.has(v.reference))
                              ? (currentSetVoices[v.reference]
                                  ? t('播放這節經文({name}親聲朗讀)', 'Play this verse (read by {name})').replace('{name}', String(currentSetVoices[v.reference].recordedBy || t('創作者', 'the creator')))
                                  : t('這節有人聲錄音', 'This verse has a voice recording'))
                              : t("播放這節經文", "Play this verse")}
                            style={{ position: 'relative', backgroundColor: '#8b5cf6', color: 'white', border: 'none', borderRadius: '6px', minWidth: '44px', height: '44px', padding: '0 0.35rem', display: 'flex', flexDirection: 'column', gap: '1px', fontSize: '0.7rem', fontWeight: 700, lineHeight: 1.1, alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'transform 0.1s' }}
                            onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                            onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                          >
                            <Headphones size={14} fill="white" />
                            <span>{t('聆聽', 'Listen')}</span>
                            {(currentSetVoices[v.reference] || currentSetVoiceRefs.has(v.reference)) && (
                              <span style={{ position: 'absolute', top: '-7px', right: '-7px', fontSize: '0.8rem', filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.35))' }} aria-label={t('有人聲錄音', 'Voice recording available')}>⭐</span>
                            )}
                          </button>
                          {/* My OWN recording on this verse. The ⭐ above can't say this —
                              it lights up for anyone's recording — so a listener couldn't
                              tell their own reading from a stranger's, let alone whether
                              theirs was shared. Green = listed for everyone, grey+🔒 =
                              unlisted; tapping flips it. Deliberately a sibling of the play
                              button rather than a badge inside it, so the tap can't also
                              start playback. */}
                          {myVoicesInSet[v.reference] && (() => {
                            const isPublic = myVoicesInSet[v.reference].public !== false;
                            const busy = voiceVisibilityBusy === v.reference;
                            return (
                              <button
                                onClick={(e) => { e.stopPropagation(); toggleMyVerseVoicePublic(v.reference); }}
                                disabled={busy}
                                aria-label={isPublic ? t('我的錄音（已公開）', 'My recording (public)') : t('我的錄音（不公開）', 'My recording (private)')}
                                title={isPublic
                                  ? t('我的錄音（已公開）· 點一下改為不公開', 'My recording (public) · tap to make it private')
                                  : t('我的錄音（不公開）· 點一下改為公開', 'My recording (private) · tap to make it public')}
                                style={{ position: 'relative', backgroundColor: isPublic ? '#16a34a' : '#64748b', color: 'white', border: 'none', borderRadius: '6px', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.5 : 1, transition: 'transform 0.1s' }}
                                onMouseOver={(e) => { if (!busy) e.currentTarget.style.transform = 'scale(1.1)'; }}
                                onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                              >
                                <Mic size={14} />
                                {!isPublic && (
                                  <span style={{ position: 'absolute', top: '-6px', right: '-6px', fontSize: '0.62rem', filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.35))' }}>🔒</span>
                                )}
                              </button>
                            );
                          })()}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              // Open the same challenge chooser (mode + difficulty)
                              // as the set-level 挑戰, but scoped to this one verse.
                              openChallengeSetup({
                                subtitle: formatVerseReferenceForDisplay(v.reference, version),
                                run: () => {
                                  setCampaignQueue(null);
                                  setCampaignResults([]);
                                  setActiveVerse(v);
                                  setSelectedVerseRefs([v.reference]);
                                  if (currentSet?.id) setSelectedSetId(currentSet.id);
                                  setTimeout(() => startGame(false, v), 50);
                                },
                              });
                            }}
                            title={t("挑戰這節經文", "Challenge this verse")}
                            style={{ backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '6px', minWidth: '44px', height: '44px', padding: '0 0.35rem', display: 'flex', flexDirection: 'column', gap: '1px', fontSize: '0.7rem', fontWeight: 700, lineHeight: 1.1, alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'transform 0.1s' }}
                            onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                            onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                          >
                            <Zap size={14} fill="white" />
                            <span>{t('挑戰', 'Challenge')}</span>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              // Share the LISTEN experience (/lc card link with the
                              // set context) — recipients hear the verse (creator
                              // recording when available) instead of jumping straight
                              // into a challenge.
                              pushSetForSharing(currentSet, true);
                              const verseIdx = (currentSet?.verses || []).findIndex(x => x?.reference === v.reference);
                              const link = buildPublicShareUrl('/lc', {
    ref: personalCode,
                                set: currentSet?.id,
                                ...(verseIdx >= 0 ? { i: verseIdx } : { verse: v.reference }),
                                version,
                              });
                              setQrShareModal({ url: link, reference: v.reference });
                            }}
                            title={t("分享聆聽連結", "Share listening link")}
                            style={{ backgroundColor: '#ffffff', color: '#64748b', border: '1px solid #cbd5e1', borderRadius: '6px', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.1s' }}
                            onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#f1f5f9'; e.currentTarget.style.color = '#3b82f6'; e.currentTarget.style.borderColor = '#3b82f6'; }}
                            onMouseOut={(e) => { e.currentTarget.style.backgroundColor = '#ffffff'; e.currentTarget.style.color = '#64748b'; e.currentTarget.style.borderColor = '#cbd5e1'; }}
                          >
                            <Share2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </>
        )}
      </div>

    </>
  );
}
