// The 搜尋 (search) tab — moved out of App.jsx unchanged (UI/UX 第 4 階段).
import { Edit, Library, Play, Search } from 'lucide-react';
import { formatVerseReferenceForDisplay, parseVerseRef } from '../lib/verseDisplay.js';
import { initAudio } from '../lib/audio.js';
import { parseScriptureKey, parseSetChapterRange } from '../lib/bible.js';

export default function SearchPage({ t, activeVerseSets, searchQuery, searchSetsPage, searchVersesPage, setActiveVerse, setCampaignQueue, setCampaignResults, setEditingCustomSet, setMainTab, setSearchQuery, setSearchSetsPage, setSearchVersesPage, setSelectedSetId, setVerseViewModal, startGame, version }) {
  return (
    <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '2rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
      <h2 style={{ color: '#1e293b', marginTop: 0, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '10px' }}><Search color="#0369a1" /> {t("搜尋經文", "Search Verses")}</h2>
      <input
        type="text"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder={t("輸入關鍵字，例如「利未記」或「醫治」...", "Enter keyword...")}
        style={{ width: '100%', padding: '0.8rem 1rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '1rem', marginBottom: '2rem', boxSizing: 'border-box' }}
      />

      {(() => {
        if (!searchQuery.trim()) return <div style={{ color: '#64748b' }}>{t("請輸入關鍵字開始搜尋。", "Please enter a keyword to search.")}</div>;
        const query = searchQuery.trim().toLowerCase();
        // When the query looks like a scripture reference ("詩篇 150", "詩 150",
        // "Psalms 150"), also match by book+chapter so ranges and abbreviations
        // resolve. Null for plain keyword searches, which skip this extra work.
        const scriptureQ = parseScriptureKey(searchQuery.trim());

        // Search in sets — title, description, author name, or (for a
        // reference query) a chapter range in the title that contains the chapter.
        const matchingSets = activeVerseSets.filter(s =>
          s && s.title && (
            s.title.toLowerCase().includes(query) ||
            (s.description && s.description.replace(/<[^>]+>/g, '').toLowerCase().includes(query)) ||
            (s.authorName && s.authorName.toLowerCase().includes(query)) ||
            (scriptureQ && (() => {
              const r = parseSetChapterRange(s.title);
              return !!r && r.bookId === scriptureQ.bookId &&
                scriptureQ.chapter >= r.start && scriptureQ.chapter <= r.end;
            })())
          )
        );
        // Search in individual verses — reference/title/text substring, or (for a
        // reference query) a matching book+chapter regardless of abbreviation form.
        const matchingVerses = activeVerseSets.flatMap(s =>
          (s && s.verses) ? s.verses.map(v => ({ ...v, setId: s.id, setName: s.title })) : []
        ).filter(v =>
          v && (
            (v.reference && v.reference.toLowerCase().includes(query)) ||
            (v.title && v.title.toLowerCase().includes(query)) ||
            (v.text && v.text.toLowerCase().includes(query)) ||
            (scriptureQ && v.reference && (() => {
              const vk = parseScriptureKey(v.reference);
              if (!vk || vk.bookId !== scriptureQ.bookId || vk.chapter !== scriptureQ.chapter) return false;
              if (!scriptureQ.verses) return true;
              if (!vk.verses) return false;
              return vk.verses === scriptureQ.verses ||
                vk.verses.split(/[,\-\s]+/).includes(scriptureQ.verses);
            })())
          )
        );

        return (
          <div>
            {matchingSets.length > 0 && (
              <div style={{ marginBottom: '2rem' }}>
                <h3 style={{ color: '#334155', borderBottom: '2px solid #e2e8f0', paddingBottom: '0.5rem' }}>{t("經文組資料夾", "Verse Sets")} ({matchingSets.length})</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', marginTop: '1rem' }}>
                  {(() => {
                    const totalPages = Math.ceil(matchingSets.length / 10);
                    const paginatedSets = matchingSets.slice((searchSetsPage - 1) * 10, searchSetsPage * 10);
                    return paginatedSets.map(set => (
                      <div key={set.id} onClick={() => { setSelectedSetId(set.id); setMainTab('versesets'); }} style={{ padding: '1.5rem', border: '1px solid #e2e8f0', borderRadius: '8px', cursor: 'pointer', backgroundColor: '#f8fafc', display: 'flex', alignItems: 'center', gap: '1rem', transition: 'background-color 0.2s' }} onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#eff6ff'} onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}>
                        <div style={{ color: '#3b82f6' }}><Library size={34} /></div>
                        <div>
                          <div style={{ fontWeight: 'bold', color: '#1e293b', fontSize: '1.1rem' }}>{set.title}</div>
                          <div style={{ color: '#3b82f6', fontSize: '0.8rem', marginTop: '0.2rem' }}>
                            {t('作者', 'Author')}：{set.authorName && set.authorName !== "Anonymous" ? set.authorName : (String(set.id).startsWith("custom-") ? t('匿名玩家', 'Anonymous') : t('Verserain 官方', 'Official'))}
                          </div>
                          <div className="ql-editor-content" style={{ color: '#64748b', fontSize: '0.9rem', marginTop: '0.3rem', maxHeight: '4.5em', overflow: 'hidden', textOverflow: 'ellipsis' }} dangerouslySetInnerHTML={{ __html: set.description }} />
                        </div>
                      </div>
                    ));
                  })()}
                </div>

                {/* Search Sets Pagination */}
                {Math.ceil(matchingSets.length / 10) > 1 && (
                  <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
                    {Array.from({ length: Math.ceil(matchingSets.length / 10) }).map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => setSearchSetsPage(idx + 1)}
                        style={{
                          padding: '0.5rem 1rem',
                          borderRadius: '8px',
                          border: searchSetsPage === idx + 1 ? 'none' : '1px solid #cbd5e1',
                          background: searchSetsPage === idx + 1 ? '#8b5cf6' : '#ffffff',
                          color: searchSetsPage === idx + 1 ? '#ffffff' : '#475569',
                          fontWeight: 'bold',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          minWidth: '40px'
                        }}
                      >
                        {idx + 1}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {matchingVerses.length > 0 && (
              <div>
                <h3 style={{ color: '#334155', borderBottom: '2px solid #e2e8f0', paddingBottom: '0.5rem', marginBottom: '1rem' }}>{t("單獨經文", "Individual Verses")} ({matchingVerses.length})</h3>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f8fafc', color: '#475569', fontSize: '0.9rem' }}>
                        <th style={{ padding: '0.8rem 1rem', borderBottom: '2px solid #cbd5e1' }}>{t("所屬經文組", "From Set")}</th>
                        <th style={{ padding: '0.8rem 1rem', borderBottom: '2px solid #cbd5e1' }}>{t("經文出處", "Reference")}</th>
                        <th style={{ padding: '0.8rem 1rem', borderBottom: '2px solid #cbd5e1' }}>{t("內容片段", "Preview")}</th>
                        <th style={{ padding: '0.8rem 1rem', borderBottom: '2px solid #cbd5e1', textAlign: 'right' }}>{t("直接遊玩", "Play")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        const totalPages = Math.ceil(matchingVerses.length / 10);
                        const paginatedVerses = matchingVerses.slice((searchVersesPage - 1) * 10, searchVersesPage * 10);
                        return paginatedVerses.map((v, i) => (
                          <tr key={i} style={{ borderBottom: '1px solid #e2e8f0', transition: 'background-color 0.1s' }} onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'} onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                            <td style={{ padding: '0.8rem 1rem', fontSize: '0.85rem' }}>
                              {v.setId ? (
                                <button
                                  onClick={(e) => { e.stopPropagation(); setSelectedSetId(v.setId); setMainTab('versesets'); }}
                                  title={t("前往這個經文組", "Go to this verse set")}
                                  style={{ background: 'transparent', border: 'none', color: '#0ea5e9', fontWeight: 'bold', fontSize: '0.85rem', cursor: 'pointer', padding: 0, textAlign: 'left' }}
                                  onMouseOver={(e) => e.target.style.textDecoration = 'underline'}
                                  onMouseOut={(e) => e.target.style.textDecoration = 'none'}
                                >
                                  {v.setName}
                                </button>
                              ) : (
                                <span style={{ color: '#64748b' }}>{v.setName}</span>
                              )}
                            </td>
                            <td style={{ padding: '0.8rem 1rem', fontWeight: 'bold', color: '#0369a1', fontSize: '0.95rem' }}>
                              <button onClick={(e) => { e.stopPropagation(); setVerseViewModal(v); }} style={{ background: 'transparent', border: 'none', color: '#0ea5e9', fontWeight: 'bold', fontSize: '0.95rem', cursor: 'pointer', padding: 0, textAlign: 'left' }} onMouseOver={(e) => e.target.style.textDecoration = 'underline'} onMouseOut={(e) => e.target.style.textDecoration = 'none'}>
                                {formatVerseReferenceForDisplay(v.reference, version)}
                              </button>
                            </td>
                            <td style={{ padding: '0.8rem 1rem', color: '#475569', fontSize: '0.9rem' }}>{v.text.substring(0, 35)}...</td>
                            <td style={{ padding: '0.8rem 1rem', textAlign: 'right' }}>
                              <div style={{ display: 'inline-flex', gap: '0.4rem', alignItems: 'center' }}>
                                <button
                                  onClick={() => {
                                    // Resolve the parent set from setId and open it in the
                                    // custom-verses editor. Works for both user-owned custom
                                    // sets (in-place edit) and built-in topical sets (saves
                                    // as a fork into customVerseSets, leaving the original
                                    // untouched).
                                    const parentSet = activeVerseSets.find(s => s && s.id === v.setId);
                                    if (!parentSet) return;
                                    setMainTab('custom_verses');
                                    setEditingCustomSet({ ...parentSet, verses: parentSet.verses?.map(parseVerseRef) || [] });
                                  }}
                                  title={t("編輯這個經文組", "Edit this verse set")}
                                  style={{ backgroundColor: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '50%', width: '32px', height: '32px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}
                                >
                                  <Edit size={14} />
                                </button>
                                <button
                                  onClick={() => {
                                    initAudio();
                                    setCampaignQueue(null);
                                    setCampaignResults([]);
                                    setActiveVerse(v);
                                    setTimeout(() => startGame(false, v), 50);
                                  }}
                                  title={t("遊玩這篇經文", "Play this verse")}
                                  style={{ backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '10px', minWidth: '44px', height: '44px', padding: '0 0.35rem', display: 'inline-flex', flexDirection: 'column', gap: '1px', fontSize: '0.7rem', fontWeight: 700, lineHeight: 1.1, alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}
                                >
                                  <Play size={16} fill="white" />
                                  <span>{t('挑戰', 'Challenge')}</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        ));
                      })()}
                    </tbody>
                  </table>
                </div>

                {/* Search Verses Pagination */}
                {Math.ceil(matchingVerses.length / 10) > 1 && (
                  <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
                    {Array.from({ length: Math.ceil(matchingVerses.length / 10) }).map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => setSearchVersesPage(idx + 1)}
                        style={{
                          padding: '0.5rem 1rem',
                          borderRadius: '8px',
                          border: searchVersesPage === idx + 1 ? 'none' : '1px solid #cbd5e1',
                          background: searchVersesPage === idx + 1 ? '#8b5cf6' : '#ffffff',
                          color: searchVersesPage === idx + 1 ? '#ffffff' : '#475569',
                          fontWeight: 'bold',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          minWidth: '40px'
                        }}
                      >
                        {idx + 1}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {matchingSets.length === 0 && matchingVerses.length === 0 && (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8', backgroundColor: '#f8fafc', borderRadius: '8px', marginTop: '1rem' }}>
                {t("很抱歉，沒有找到符合條件的經文或群組。", "Sorry, no matching verses or sets found.")}
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
}
