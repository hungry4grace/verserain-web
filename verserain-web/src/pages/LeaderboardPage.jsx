// The 排行榜 (leaderboard) tab — moved out of App.jsx unchanged (UI/UX 第 4 階段).
import { Crown, Hourglass, Info, Sprout, Trophy, Zap } from 'lucide-react';
import { GARDEN_LOOKUP_LANGS, findVerseByRef } from '../lib/verseDisplay.js';
import { getSkoolLevel } from '../lib/rooms.js';
import { loadLanguageSets } from '../verseLoader';
import { tidyGarden } from '../lib/gardenSync.js';
import { toast } from '../ui';
import { verseRefKey } from '../lib/verseRef.js';

export default function LeaderboardPage({ t, activeVerseSets, cjkDataFontStack, globalFruitsMap, globalLeaderboardData, globalLeaderboardTab, globalVerseStats, isFetchingGlobalLeaderboard, loadedLangs, pageGlobalLeaderboard, pagePopularSets, pagePopularVerses, playerName, safeActiveSets, setActiveVerse, setGlobalLeaderboardTab, setIsLangsLoading, setLoadedLangs, setMainTab, setPageGlobalLeaderboard, setPagePopularSets, setPagePopularVerses, setSelectedSetId, setShowLevelInfo, setVersion, setViewCounts, setViewingPlayerGarden, startGame, userEmail, VERSES_DB, version, versionBeforeChallenge, viewCounts }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

      {/* 1. 排行榜切換按鈕 */}
      <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
        <button onClick={() => { setGlobalLeaderboardTab('daily'); setPageGlobalLeaderboard(1); setPagePopularVerses(1); }} style={{ padding: '0.8rem 2rem', border: 'none', background: globalLeaderboardTab === 'daily' ? '#10b981' : '#e2e8f0', color: globalLeaderboardTab === 'daily' ? 'white' : '#475569', borderRadius: '30px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1.1rem', transition: 'all 0.2s', boxShadow: globalLeaderboardTab === 'daily' ? '0 4px 6px -1px rgba(16, 185, 129, 0.4)' : 'none' }}>{t("本日排行", "Daily")}</button>
        <button onClick={() => { setGlobalLeaderboardTab('monthly'); setPageGlobalLeaderboard(1); setPagePopularVerses(1); }} style={{ padding: '0.8rem 2rem', border: 'none', background: globalLeaderboardTab === 'monthly' ? '#8b5cf6' : '#e2e8f0', color: globalLeaderboardTab === 'monthly' ? 'white' : '#475569', borderRadius: '30px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1.1rem', transition: 'all 0.2s', boxShadow: globalLeaderboardTab === 'monthly' ? '0 4px 6px -1px rgba(139, 92, 246, 0.4)' : 'none' }}>{t("本月排行", "Monthly")}</button>
        <button onClick={() => { setGlobalLeaderboardTab('alltime'); setPageGlobalLeaderboard(1); setPagePopularVerses(1); }} style={{ padding: '0.8rem 2rem', border: 'none', background: globalLeaderboardTab === 'alltime' ? '#3b82f6' : '#e2e8f0', color: globalLeaderboardTab === 'alltime' ? 'white' : '#475569', borderRadius: '30px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1.1rem', transition: 'all 0.2s', boxShadow: globalLeaderboardTab === 'alltime' ? '0 4px 6px -1px rgba(59, 130, 246, 0.4)' : 'none' }}>{t("歷史總榜", "All Time")}</button>
      </div>

      {/* 2. 個人累積點數排行榜 - reads from globalLeaderboardData (Redis) */}
      <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '2rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <h2 style={{ color: '#1e293b', marginTop: 0, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Trophy color="#2563eb" /> {t("個人累積點數排行榜", "Player Total Points Leaderboard")}
          <button
            onClick={() => setShowLevelInfo(true)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', color: '#94a3b8', transition: 'color 0.2s' }}
            onMouseOver={(e) => e.currentTarget.style.color = '#3b82f6'}
            onMouseOut={(e) => e.currentTarget.style.color = '#94a3b8'}
            title={t("階層說明", "Level Info")}
          >
            <Info size={18} />
          </button>
        </h2>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#64748b', fontSize: '0.9rem' }}>
              <th style={{ padding: '0.8rem 1rem', width: '50px' }}><Trophy size={18} /></th>
              <th style={{ padding: '0.8rem 1rem' }}>{t("玩家名稱", "Player Name")}</th>
              <th style={{ padding: '0.8rem 1rem', textAlign: 'right' }}>{t("累積點數", "Total Points")}</th>
              <th style={{ padding: '0.8rem 1rem', textAlign: 'right' }}>{t("完成次數", "Clears")}</th>
            </tr>
          </thead>
          <tbody>
            {(() => {
              const entries = globalLeaderboardData[globalLeaderboardTab] || [];
              if (isFetchingGlobalLeaderboard) {
                return <tr><td colSpan="4" style={{ padding: '1rem', textAlign: 'center', color: '#94a3b8' }}><span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}><Hourglass size={16} /> {t("載入中...", "Loading...")}</span></td></tr>;
              }
              if (entries.length === 0) {
                return <tr><td colSpan="4" style={{ padding: '1rem', textAlign: 'center', color: '#94a3b8' }}>{t("目前尚無紀錄", "No records yet")}</td></tr>;
              }
              const alltimeClears = {};
              (globalLeaderboardData.alltime || []).forEach(({ name, clears }) => {
                if (!name) return;
                alltimeClears[name] = clears || 0;
              });

              return entries
                .slice((pageGlobalLeaderboard - 1) * 10, pageGlobalLeaderboard * 10)
                .map(({ name, total, clears }, relativeIdx) => {
                  const idx = (pageGlobalLeaderboard - 1) * 10 + relativeIdx;
                  return (
                    <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '0.8rem 1rem', fontWeight: 'bold', color: idx === 0 ? '#d97706' : idx === 1 ? '#94a3b8' : idx === 2 ? '#b45309' : '#64748b', fontSize: '1.2rem' }}>#{idx + 1}</td>
                      <td style={{ padding: '0.8rem 1rem', fontWeight: 'bold', color: '#1e293b', fontFamily: cjkDataFontStack }}>
                        <span style={{ fontFamily: cjkDataFontStack }}>{name}</span> {name === playerName && <Crown size={14} style={{ color: '#fbbf24', marginLeft: '5px' }} />}
                        <button
                          onClick={async () => {
                            setViewingPlayerGarden({ playerName: name, gardenData: null, loading: true });
                            try {
                              const [gardenRes, pointsRes] = await Promise.all([
                                fetch(`https://verserain-party.hungry4grace.partykit.dev/parties/main/global-auth-db/garden?player=${encodeURIComponent(name)}`),
                                fetch(`/api/get-creator-points?author=${encodeURIComponent(name)}`).catch(() => null)
                              ]);
                              const data = await gardenRes.json();
                              let creatorPts = 0;
                              let refPts = 0;
                              if (pointsRes && pointsRes.ok) {
                                try {
                                  const ptsData = await pointsRes.json();
                                  creatorPts = ptsData.points || 0;
                                  refPts = ptsData.referralPoints || 0;
                                } catch (e) {}
                              }
                              if (data.success) {
                                setViewingPlayerGarden({ playerName: name, gardenData: tidyGarden(data.gardenData, verseRefKey).garden, creatorPoints: creatorPts, referralPoints: refPts, loading: false });
                              } else {
                                setViewingPlayerGarden({ playerName: name, gardenData: {}, creatorPoints: creatorPts, referralPoints: refPts, loading: false, error: t('該玩家尚未分享園地', 'This player has not shared their garden yet') });
                              }
                            } catch {
                              setViewingPlayerGarden({ playerName: name, gardenData: {}, loading: false, error: t('無法載入', 'Failed to load') });
                            }
                          }}
                          style={{ marginLeft: '8px', fontSize: '0.8rem', backgroundColor: '#f1f5f9', color: '#2563eb', padding: '0.2rem 0.6rem', borderRadius: '12px', border: '1px solid #bfdbfe', whiteSpace: 'nowrap', cursor: 'pointer', fontWeight: 'bold', transition: 'all 0.2s' }}
                          onMouseOver={e => { e.currentTarget.style.backgroundColor = '#dbeafe'; e.currentTarget.style.borderColor = '#3b82f6'; }}
                          onMouseOut={e => { e.currentTarget.style.backgroundColor = '#f1f5f9'; e.currentTarget.style.borderColor = '#bfdbfe'; }}
                          title={t('點擊查看此玩家的園地', "Click to view this player's garden")}
                        >
                          {(() => {
                            // Only use true fruits when globalFruitsMap has been loaded
                            const hasGardenData = globalFruitsMap && Object.keys(globalFruitsMap).length > 0;
                            if (hasGardenData) {
                              const gardenFruits = globalFruitsMap[name] || 0;
                              const bonus = globalLeaderboardData && globalLeaderboardData.bonusFruitsMap && globalLeaderboardData.bonusFruitsMap[name];
                              const creatorFruits = (bonus && bonus.creatorPoints) || 0;
                              const lvl = getSkoolLevel(gardenFruits + creatorFruits);
                              return <><Sprout size={15} /> Lv.{lvl.level} {t(lvl.title, lvl.enTitle)}</>;
                            }
                            // Fallback: garden data not loaded yet, use clears
                            const lvl = getSkoolLevel(alltimeClears[name] || clears);
                            return <><Sprout size={15} /> Lv.{lvl.level} {t(lvl.title, lvl.enTitle)}</>;
                          })()}
                        </button>

                      </td>
                      <td style={{ padding: '0.8rem 1rem', textAlign: 'right', fontWeight: 'bold', color: '#3b82f6' }}>{(total || 0).toLocaleString()}</td>
                      <td style={{ padding: '0.8rem 1rem', textAlign: 'right', fontWeight: 'bold', color: '#059669' }}>{clears || 0}</td>
                    </tr>
                  );
                });
            })()}
          </tbody>
        </table>
        {(() => {
          const totalEntries = (globalLeaderboardData[globalLeaderboardTab] || []).length;
          const totalPages = Math.max(1, Math.ceil(totalEntries / 10));
          if (totalPages > 1) {
            return (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginTop: '1.5rem', gap: '1rem' }}>
                <button onClick={() => setPageGlobalLeaderboard(p => Math.max(1, p - 1))} disabled={pageGlobalLeaderboard === 1} style={{ background: pageGlobalLeaderboard === 1 ? '#f1f5f9' : '#e2e8f0', color: pageGlobalLeaderboard === 1 ? '#cbd5e1' : '#475569', border: 'none', padding: '0.5rem 1rem', borderRadius: '4px', cursor: pageGlobalLeaderboard === 1 ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}>{t("上一頁", "Prev")}</button>
                <span style={{ color: '#64748b', fontSize: '0.9rem', fontWeight: 'bold' }}>{pageGlobalLeaderboard} / {totalPages}</span>
                <button onClick={() => setPageGlobalLeaderboard(p => Math.min(totalPages, p + 1))} disabled={pageGlobalLeaderboard === totalPages} style={{ background: pageGlobalLeaderboard === totalPages ? '#f1f5f9' : '#e2e8f0', color: pageGlobalLeaderboard === totalPages ? '#cbd5e1' : '#475569', border: 'none', padding: '0.5rem 1rem', borderRadius: '4px', cursor: pageGlobalLeaderboard === totalPages ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}>{t("下一頁", "Next")}</button>
              </div>
            );
          }
          return null;
        })()}
      </div>

      {/* 4. 最受歡迎經文組 */}
      <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '2rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <h2 style={{ color: '#1e293b', marginTop: 0, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '10px' }}><Trophy color="#f59e0b" /> {t("最受歡迎經文組", "Most Popular Verse Sets")}</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#64748b', fontSize: '0.9rem' }}>
              <th style={{ padding: '0.8rem 1rem', width: '50px' }}><Trophy size={18} /></th>
              <th style={{ padding: '0.8rem 1rem' }}>{t("標題", "Title")}</th>
              <th style={{ padding: '0.8rem 1rem' }}>{t("作者", "Author")}</th>
              <th style={{ padding: '0.8rem 1rem', textAlign: 'right' }}>{t("點閱次數", "Views")}</th>
              <th style={{ padding: '0.8rem 1rem', width: '60px' }}></th>
            </tr>
          </thead>
          <tbody>
            {(() => {
              const sortedSets = [...activeVerseSets]
                .sort((a, b) => (viewCounts[b.id] || 0) - (viewCounts[a.id] || 0));
              const paginatedSets = sortedSets.slice((pagePopularSets - 1) * 10, pagePopularSets * 10);
              return paginatedSets.map((set, relativeIdx) => {
                const idx = (pagePopularSets - 1) * 10 + relativeIdx;
                return (
                  <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer', transition: 'background 0.2s' }} onClick={() => {
                    setMainTab('versesets');
                    setSelectedSetId(set.id);
                    fetch("https://verserain-party.hungry4grace.partykit.dev/parties/main/global-auth-db/custom-sets/view", { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: set.id, adminEmail: userEmail, adminName: playerName }) }).catch(e => e);
                    setViewCounts(prev => ({ ...prev, [set.id]: (prev[set.id] || 0) + 1 }));
                  }} onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#eff6ff'} onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                    <td style={{ padding: '0.8rem 1rem', fontWeight: 'bold', color: idx === 0 ? '#d97706' : idx === 1 ? '#94a3b8' : idx === 2 ? '#b45309' : '#64748b', fontSize: '1.2rem' }}>#{idx + 1}</td>
                    <td style={{ padding: '0.8rem 1rem', fontWeight: 'bold', color: '#1e293b' }}>{set.title}</td>
                    <td style={{ padding: '0.8rem 1rem', color: '#3b82f6' }}>{set.authorName && set.authorName !== "Anonymous" ? set.authorName : (String(set.id).startsWith("custom-") ? t('匿名玩家', 'Anonymous') : t('Verserain 官方', 'Official'))}</td>
                    <td style={{ padding: '0.8rem 1rem', textAlign: 'right', fontWeight: 'bold', color: '#059669' }}>{viewCounts[set.id] || 0}</td>
                    <td style={{ padding: '0.8rem 0' }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setMainTab('versesets');
                          setSelectedSetId(set.id);
                          fetch("https://verserain-party.hungry4grace.partykit.dev/parties/main/global-auth-db/custom-sets/view", { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: set.id, adminEmail: userEmail, adminName: playerName }) }).catch(e => e);
                          setViewCounts(prev => ({ ...prev, [set.id]: (prev[set.id] || 0) + 1 }));
                        }}
                        style={{ backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '6px', minWidth: '44px', height: '44px', padding: '0 0.35rem', display: 'flex', flexDirection: 'column', gap: '1px', fontSize: '0.7rem', fontWeight: 700, lineHeight: 1.1, alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'transform 0.1s' }}
                        onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                        onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                      >
                        <Zap size={14} fill="white" />
                        <span>{t('開啟', 'Open')}</span>
                      </button>
                    </td>
                  </tr>
                );
              });
            })()}
          </tbody>
        </table>
        {(() => {
          const totalEntries = activeVerseSets.length;
          const totalPages = Math.max(1, Math.ceil(totalEntries / 10));
          if (totalPages > 1) {
            return (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginTop: '1.5rem', gap: '1rem' }}>
                <button onClick={() => setPagePopularSets(p => Math.max(1, p - 1))} disabled={pagePopularSets === 1} style={{ background: pagePopularSets === 1 ? '#f1f5f9' : '#e2e8f0', color: pagePopularSets === 1 ? '#cbd5e1' : '#475569', border: 'none', padding: '0.5rem 1rem', borderRadius: '4px', cursor: pagePopularSets === 1 ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}>{t("上一頁", "Prev")}</button>
                <span style={{ color: '#64748b', fontSize: '0.9rem', fontWeight: 'bold' }}>{pagePopularSets} / {totalPages}</span>
                <button onClick={() => setPagePopularSets(p => Math.min(totalPages, p + 1))} disabled={pagePopularSets === totalPages} style={{ background: pagePopularSets === totalPages ? '#f1f5f9' : '#e2e8f0', color: pagePopularSets === totalPages ? '#cbd5e1' : '#475569', border: 'none', padding: '0.5rem 1rem', borderRadius: '4px', cursor: pagePopularSets === totalPages ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}>{t("下一頁", "Next")}</button>
              </div>
            );
          }
          return null;
        })()}
      </div>

      {/* 3. 最受歡迎經文排行榜 */}
      <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '2rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <h2 style={{ color: '#1e293b', marginTop: 0, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '10px' }}><Trophy color="#10b981" /> {t("最受歡迎經文排行榜", "Most Popular Verses")}</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#64748b', fontSize: '0.9rem' }}>
              <th style={{ padding: '0.8rem 1rem', width: '50px' }}><Trophy size={18} /></th>
              <th style={{ padding: '0.8rem 1rem' }}>{t("經文出處", "Reference")}</th>
              <th style={{ padding: '0.8rem 1rem', textAlign: 'right' }}>{t("遊玩次數", "Plays")}</th>
              <th style={{ padding: '0.8rem 1rem', textAlign: 'right' }}>{t("完成次數", "Completes")}</th>
              <th style={{ padding: '0.8rem 1rem', width: '60px' }}></th>
            </tr>
          </thead>
          <tbody>
            {(() => {
              const allVerses = Object.entries((globalVerseStats[globalLeaderboardTab] || {}))
                .sort((a, b) => b[1].plays - a[1].plays || b[1].completes - a[1].completes);
              const paginatedVerses = allVerses.slice((pagePopularVerses - 1) * 10, pagePopularVerses * 10);

              if (allVerses.length === 0) {
                return <tr><td colSpan="5" style={{ padding: '1rem', textAlign: 'center', color: '#94a3b8' }}>{t("目前尚無經文紀錄", "No records yet")}</td></tr>;
              }

              return paginatedVerses.map(([ref, stats], relativeIdx) => {
                const idx = (pagePopularVerses - 1) * 10 + relativeIdx;
                return (
                  <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '0.8rem 1rem', fontWeight: 'bold', color: idx === 0 ? '#d97706' : idx === 1 ? '#94a3b8' : idx === 2 ? '#b45309' : '#64748b', fontSize: '1.2rem' }}>#{idx + 1}</td>
                    <td style={{ padding: '0.8rem 1rem', fontWeight: 'bold', color: '#1e293b' }}>{ref}</td>
                    <td style={{ padding: '0.8rem 1rem', textAlign: 'right', fontWeight: 'bold', color: '#10b981' }}>{stats.plays}</td>
                    <td style={{ padding: '0.8rem 1rem', textAlign: 'right', fontWeight: 'bold', color: '#059669' }}>{stats.completes}</td>
                    <td style={{ padding: '0.8rem 0' }}>
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          // Search current set first, then ALL language pools (fixes iPhone 'verse not found')
                          let targetVerse = findVerseByRef(VERSES_DB, ref);
                          let detectedLang = null;
                          if (!targetVerse) {
                            const allCurrentVerses = safeActiveSets.flatMap(s => s.verses);
                            targetVerse = findVerseByRef(allCurrentVerses, ref);
                          }
                          if (!targetVerse) {
                            setIsLangsLoading(true);
                            for (const lang of GARDEN_LOOKUP_LANGS) {
                              if (lang === version) continue;
                              let data = loadedLangs[lang];
                              if (!data) {
                                data = await loadLanguageSets(lang);
                                setLoadedLangs(prev => ({ ...prev, [lang]: data }));
                              }
                              const found = findVerseByRef(data.verses, ref);
                              if (found) { targetVerse = found; detectedLang = lang; break; }
                            }
                            setIsLangsLoading(false);
                          }
                          if (targetVerse) {
                            if (detectedLang) {
                              versionBeforeChallenge.current = version;
                              setVersion(detectedLang);
                            }
                            setActiveVerse(targetVerse);
                            setTimeout(() => startGame(false, targetVerse), 200);
                          } else {
                            toast.error(t('本機找不到此經文', 'Verse not found locally'));
                          }
                        }}
                        style={{ backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '6px', minWidth: '44px', height: '44px', padding: '0 0.35rem', display: 'flex', flexDirection: 'column', gap: '1px', fontSize: '0.7rem', fontWeight: 700, lineHeight: 1.1, alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'transform 0.1s' }}
                        onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                        onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                      >
                        <Zap size={14} fill="white" />
                        <span>{t('挑戰', 'Challenge')}</span>
                      </button>
                    </td>
                  </tr>
                );
              });
            })()}
          </tbody>
        </table>
        {(() => {
          const totalEntries = Object.keys((globalVerseStats[globalLeaderboardTab] || {})).length;
          const totalPages = Math.max(1, Math.ceil(totalEntries / 10));
          if (totalPages > 1) {
            return (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginTop: '1.5rem', gap: '1rem' }}>
                <button onClick={() => setPagePopularVerses(p => Math.max(1, p - 1))} disabled={pagePopularVerses === 1} style={{ background: pagePopularVerses === 1 ? '#f1f5f9' : '#e2e8f0', color: pagePopularVerses === 1 ? '#cbd5e1' : '#475569', border: 'none', padding: '0.5rem 1rem', borderRadius: '4px', cursor: pagePopularVerses === 1 ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}>{t("上一頁", "Prev")}</button>
                <span style={{ color: '#64748b', fontSize: '0.9rem', fontWeight: 'bold' }}>{pagePopularVerses} / {totalPages}</span>
                <button onClick={() => setPagePopularVerses(p => Math.min(totalPages, p + 1))} disabled={pagePopularVerses === totalPages} style={{ background: pagePopularVerses === totalPages ? '#f1f5f9' : '#e2e8f0', color: pagePopularVerses === totalPages ? '#cbd5e1' : '#475569', border: 'none', padding: '0.5rem 1rem', borderRadius: '4px', cursor: pagePopularVerses === totalPages ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}>{t("下一頁", "Next")}</button>
              </div>
            );
          }
          return null;
        })()}
      </div>

    </div>
  );
}
