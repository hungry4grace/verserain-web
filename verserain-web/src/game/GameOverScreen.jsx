// The result screen after a game (success or failure) — moved out of App.jsx unchanged (UI/UX 第 4 階段).
import { Button } from '../ui';
import { CloudRain, Crown, Headphones, Heart, Home, RotateCcw, Star, TreePine, Trophy, Zap } from 'lucide-react';
import { formatVerseReferenceForDisplay } from '../lib/verseDisplay.js';

export default function GameOverScreen({ t, activePhrases, activeVerse, campaignQueue, distractionLevel, isAutoPlayRef, isFailed, isFlawless, isNewHighScore, isSubmittingScore, leaderboard, leaderboardTab, playerName, playMode, pureBaseScore, quitGame, readerReturnRef, score, setActiveVerse, setCampaignQueue, setContinuousRainSet, setGameState, setIsSubmittingScore, setLeaderboard, setLeaderboardTab, setMainTab, setPlayerName, setShowLoginModal, startGame, submitScoreToServer, timeBonus, timeLeft, userEmail, version }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100dvh', zIndex: 20, position: 'relative' }}>
      {isFailed ? (
        <div className="hud-glass" style={{ padding: 'clamp(1.5rem, 4vw, 3rem)', textAlign: 'center', width: '90%', maxWidth: '900px', border: '1px solid #f87171', maxHeight: '95dvh', display: 'flex', flexDirection: 'column' }}>
          <h2 style={{ fontSize: 'clamp(1.2rem, 3vh, 1.8rem)', color: '#f87171', marginBottom: 'clamp(0.5rem, 2vh, 1rem)' }}>{t("再接再厲！", "Try Again!")}</h2>
          <div style={{ background: 'rgba(0,0,0,0.5)', padding: 'clamp(1rem, 3vw, 2.5rem)', borderRadius: '16px', marginBottom: 'clamp(1rem, 3vh, 2.5rem)', overflowY: 'auto', flex: 1 }}>
            <p style={{ fontSize: 'clamp(1.2rem, 3.5vh, 2.2rem)', color: '#fff', fontWeight: 'bold', marginBottom: 'clamp(0.5rem, 2vh, 1.5rem)', textTransform: 'uppercase', letterSpacing: '2px' }}>{formatVerseReferenceForDisplay(activeVerse.reference, version)}</p>
            <div style={{ fontSize: 'clamp(1.2rem, 3.5vh, 2.2rem)', color: '#fff', lineHeight: '1.6', fontWeight: 'bold' }}>
              {activePhrases.map((phrase, idx) => (
                <span key={idx} style={{ color: idx % 2 === 0 ? '#93c5fd' : '#cbd5e1' }}>{phrase}{" "}</span>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'center' }}>
            <Button size="lg" icon={<RotateCcw size={22} />} style={{ flex: '1 1 200px', maxWidth: '400px' }} onClick={() => startGame()}>{t("再玩一次", "Play Again")}</Button>
            {campaignQueue !== null ? (
              campaignQueue.length > 0 ? (
                <Button size="lg" variant="secondary" style={{ flex: '1 1 200px', maxWidth: '400px' }} onClick={() => {
                    setActiveVerse(campaignQueue[0]);
                    setCampaignQueue(campaignQueue.slice(1));
                    setTimeout(() => startGame(false, campaignQueue[0]), 50);
                  }}>{t("跳過", "Skip")}</Button>
              ) : (
                <Button size="lg" variant="secondary" style={{ flex: '1 1 200px', maxWidth: '400px' }} onClick={() => setGameState('campaign-results')}>{t("查看成績", "View Results")}</Button>
              )
            ) : (
              <Button size="lg" variant="secondary" icon={<Home size={20} />} style={{ flex: '1 1 200px', maxWidth: '400px' }} onClick={() => quitGame()}>{t("離開", "Exit")}</Button>
            )}
          </div>
        </div>
      ) : (
        <div className="hud-glass" style={{ padding: 'clamp(1.5rem, 4vw, 3rem)', textAlign: 'center', width: '90%', maxWidth: '800px', maxHeight: '95dvh', overflowY: 'auto', WebkitOverflowScrolling: 'touch', display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', animation: isNewHighScore || isFlawless ? 'flashSuccess 1s ease-out' : 'none' }}>

          <div style={{ flexShrink: 0 }}>
            {isNewHighScore ? (
              <Crown size={48} color="#fbbf24" style={{ margin: '0 auto clamp(0.5rem, 2vh, 1.5rem)', animation: 'bounce 1s infinite' }} />
            ) : isFlawless ? (
              <Star size={48} color="#34d399" style={{ margin: '0 auto clamp(0.5rem, 2vh, 1.5rem)' }} />
            ) : (
              <Trophy size={48} color="#fbbf24" style={{ margin: '0 auto clamp(0.5rem, 2vh, 1.5rem)' }} />
            )}

            <h2 style={{ fontSize: 'clamp(1.8rem, 4vh, 2.5rem)', marginBottom: '0.5rem', color: '#fff' }}>
              {isNewHighScore ? t("新高分！", "New High Score!") : isFlawless ? t("完美無瑕！", "Flawless!") : ""}
            </h2>

            {isFlawless && !isNewHighScore && (
              <div style={{ color: '#34d399', fontSize: 'clamp(1rem, 2vh, 1.2rem)', marginBottom: 'clamp(0.5rem, 2vh, 1rem)', fontWeight: 'bold' }}>
                {t("完美的順序！", "Perfect Sequence!")}
              </div>
            )}
          </div>

          <div style={{ background: 'rgba(0,0,0,0.3)', padding: 'clamp(1rem, 3vw, 2rem)', borderRadius: '16px', margin: 'clamp(0.5rem, 2vh, 2rem) 0', overflowY: 'auto', flex: 1, minHeight: '150px' }}>
            <p style={{ fontSize: 'clamp(1.3rem, 3.5vh, 2.2rem)', color: '#fff', fontWeight: 'bold', marginBottom: 'clamp(0.5rem, 2vh, 1rem)', textTransform: 'uppercase', letterSpacing: '1px' }}>{formatVerseReferenceForDisplay(activeVerse.reference, version)}</p>
            <div style={{ fontSize: 'clamp(1.3rem, 3.5vh, 2.2rem)', color: '#fff', lineHeight: '1.5', fontWeight: 'bold' }}>
              {activePhrases.map((phrase, idx) => (
                <span key={idx} style={{ color: idx % 2 === 0 ? '#93c5fd' : '#cbd5e1' }}>{phrase}{" "}</span>
              ))}
            </div>
          </div>

          <div style={{ flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'clamp(1rem, 3vw, 2.5rem)', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 'clamp(0.5rem, 2vh, 1rem)', marginTop: '0.5rem' }}>

              {/* Left: Final Score */}
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 'clamp(0.9rem, 2vh, 1.1rem)', color: '#cbd5e1' }}>{t("最終得分", "Final Score")}</div>
                <strong style={{ color: isNewHighScore ? '#fbbf24' : '#fff', fontSize: 'clamp(2.5rem, 6vh, 3.5rem)', display: 'block', marginTop: '0.2rem', lineHeight: '1' }}>{score}</strong>
              </div>

              {/* Right: Breakdown */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', textAlign: 'left', borderLeft: '1px solid rgba(255,255,255,0.2)', paddingLeft: 'clamp(1rem, 3vw, 2.5rem)' }}>
                <div style={{ fontSize: 'clamp(0.85rem, 1.8vh, 1rem)', color: '#93c5fd', marginBottom: '0.3rem', fontWeight: 'bold' }}>
                  {t("通關基礎分", "Base Score")}: {pureBaseScore}
                </div>
                {timeBonus > 0 && (
                  <div style={{ fontSize: 'clamp(0.85rem, 1.8vh, 1rem)', color: '#34d399', marginBottom: '0.3rem', fontWeight: 'bold' }}>
                    {t("時間加成", "Time Bonus")}: {(timeLeft / 100).toFixed(2)}s × {(playMode === 'blind' || playMode?.startsWith('voice')) ? '75' : '50'} = +{timeBonus}
                    {(playMode === 'blind' || playMode?.startsWith('voice')) && (
                      <div style={{ fontSize: 'clamp(0.7rem, 1.5vh, 0.8rem)', color: '#fbbf24', marginTop: '0.1rem' }}>
                        ({t("語音權重 +50%", "Voice +50%")})
                      </div>
                    )}
                  </div>
                )}
                {distractionLevel > 0 && !isFailed && (
                  <div style={{ fontSize: 'clamp(0.85rem, 1.8vh, 1rem)', color: '#f59e0b', fontWeight: 'bold' }}>
                    {t("難度加成", "Difficulty Multiplier")}: × {(1 + distractionLevel * 0.1).toFixed(1)} {t('(難度 {n})', '(Lv {n})').replace('{n}', String(distractionLevel))}
                  </div>
                )}
              </div>
            </div>

            {/* 看我的樹: the verse just played grows a tree — show it (the garden
                focuses that tree via gardenFocus set in startGame). */}
            {campaignQueue === null && (
              <Button size="lg" block data-testid="result-see-tree" icon={<TreePine size={22} />} style={{ maxWidth: '350px', margin: 'clamp(0.6rem, 2vh, 1rem) auto 0' }} onClick={() => {
                  readerReturnRef.current = null;
                  quitGame();
                  setMainTab('garden');
                }}>{t('看我的樹', 'See my tree')}</Button>
            )}
            {campaignQueue === null && !userEmail && (
              <div data-testid="result-signup" style={{ width: '100%', maxWidth: '350px', margin: 'clamp(0.6rem, 2vh, 1rem) auto 0', padding: 'var(--space-3) var(--space-4)', borderRadius: 'var(--radius-md)', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
                <span style={{ flex: '1 1 10rem', lineHeight: 1.5 }}>{t('登入後，你的樹和點數會保存在所有裝置。', 'Log in to keep your trees and points on all your devices.')}</span>
                <Button variant="secondary" size="sm" onClick={() => setShowLoginModal('signup')}>{t('申請帳號', 'Sign Up')}</Button>
              </div>
            )}
            {/* Home and Play Again buttons placed HERE — always visible above the leaderboard */}
            {campaignQueue === null && (
              <div style={{ display: 'flex', gap: '1rem', width: '100%', maxWidth: '350px', margin: 'clamp(0.6rem, 2vh, 1rem) auto' }}>
                <Button variant="secondary" style={{ flex: 1 }} icon={readerReturnRef.current ? <Headphones size={18} /> : <Home size={18} />} onClick={() => {
                    // If the challenge came from a reading, drop the player
                    // back into it (so they can ‹ › to the next verse and
                    // ⚡ again) instead of the lobby.
                    const back = readerReturnRef.current;
                    readerReturnRef.current = null;
                    setGameState('menu');
                    setCampaignQueue(null);
                    if (back) setContinuousRainSet(back);
                  }}>
                  {readerReturnRef.current ? t("返回朗讀", "Back to reading") : t("回到主頁", "Home")}
                </Button>
                <Button variant="secondary" style={{ flex: 1 }} icon={<RotateCcw size={18} />} onClick={() => startGame()}>{t("再玩一次", "Play Again")}</Button>
              </div>
            )}

            {campaignQueue !== null ? (
              campaignQueue.length > 0 ? (
                <Button size="lg" block style={{ maxWidth: '300px', margin: '0 auto 1rem auto' }} onClick={() => {
                    setActiveVerse(campaignQueue[0]);
                    setCampaignQueue(campaignQueue.slice(1));
                    setTimeout(() => startGame(false, campaignQueue[0]), 50);
                  }}>{t("下一回合", "Next Round")}</Button>
              ) : (
                <Button size="lg" block style={{ maxWidth: '300px', margin: '0 auto 1rem auto' }} onClick={() => setGameState('campaign-results')}>{t("查看最終成績", "View Final Results")}</Button>
              )
            ) : null}

            {!isAutoPlayRef.current && (
              <div style={{ background: 'rgba(0,0,0,0.4)', borderRadius: '12px', padding: '1rem', marginTop: '1rem', marginBottom: '1.5rem', border: '1px solid rgba(255,255,255,0.1)' }}>
                <h3 style={{ margin: '0 0 1rem 0', color: '#fbbf24', fontSize: '1.2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                  <Trophy size={18} /> {t("全域排行榜", "Global Leaderboard")}
                </h3>

                {!playerName ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center' }}>
                    <p style={{ margin: 0, fontSize: '0.95rem', color: '#e2e8f0', textAlign: 'center' }}>{t("想要將神聖高分刻在群組榜單上嗎？", "Want to carve your high score on the leaderboard?")}</p>
                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                      {[
                        { id: 'brave', label: t('勇敢', 'Brave'), Icon: Crown },
                        { id: 'joy', label: t('喜樂', 'Joy'), Icon: Star },
                        { id: 'quick', label: t('快手', 'Quick'), Icon: Zap },
                        { id: 'love', label: t('愛心', 'Love'), Icon: Heart },
                        { id: 'rain', label: t('雨滴', 'Rain'), Icon: CloudRain }
                      ].map(({ id, label, Icon }) => (
                        <button key={id} type="button" onClick={() => {
                          const input = document.getElementById('playerNameInput');
                          if (input) {
                            input.value = label;
                            input.focus();
                          }
                        }} style={{ cursor: 'pointer', padding: '0.45rem', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.16)', borderRadius: '8px', transition: 'background 0.2s', color: '#f8fafc', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                          <Icon size={18} />
                          <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>{label}</span>
                        </button>
                      ))}
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', width: '100%' }}>
                      <input
                        type="text"
                        placeholder={t("你的雷雨暱稱", "Your Nickname")}
                        id="playerNameInput"
                        style={{ flex: 1, padding: '0.8rem', borderRadius: '8px', border: 'none', outline: 'none', fontSize: '1rem' }}
                      />
                      <button
                        className="primary-button"
                        style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '0 1.5rem', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
                        onClick={() => {
                          const name = document.getElementById('playerNameInput').value.trim();
                          if (!name) return;
                          setPlayerName(name);
                          localStorage.setItem('verserain_player_name', name);
                          setIsSubmittingScore(true);
                          const actualModeName = distractionLevel > 0 ? `${playMode}-dx${distractionLevel}` : playMode;
                          submitScoreToServer({ name: name, score: score, verseRef: activeVerse.reference, mode: actualModeName }).then(() => fetch(`/api/get-scores?verseRef=${encodeURIComponent(activeVerse.reference)}`))
                            .then(res => res.json())
                            .then(data => setLeaderboard(data && Array.isArray(data.alltime) ? data : { alltime: Array.isArray(data) ? data : [], monthly: [], daily: [] }))
                            .catch(e => console.log(e))
                            .finally(() => setIsSubmittingScore(false));
                        }}
                      >
                        {t("送出", "Submit")}
                      </button>
                    </div>
                    <div style={{ marginTop: '0.5rem', fontSize: '0.82rem', color: '#cbd5e1', textAlign: 'left' }}>
                      {t('這只是排行榜暱稱；登入後，成績和園子才會存進你的帳號。', 'This is just a leaderboard nickname — log in to save your scores and garden to an account.')}{' '}
                      <a href="#" onClick={(e) => { e.preventDefault(); setShowLoginModal('login'); }} style={{ color: '#93c5fd', fontWeight: 'bold' }}>{t('登入', 'Log in')}</a>
                    </div>
                  </div>
                ) : (
                  <div style={{ fontSize: '0.9rem', textAlign: 'left', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.1)', marginBottom: '0.5rem' }}>
                      {[{ id: 'daily', label: t('今天', 'Today') }, { id: 'monthly', label: t('30天 (本月)', '30 days (Month)') }, { id: 'alltime', label: t('歷史', 'All-Time') }].map(tab => (
                        <button
                          key={tab.id}
                          onClick={() => setLeaderboardTab(tab.id)}
                          style={{ flex: 1, padding: '0.4rem 0', background: leaderboardTab === tab.id ? 'rgba(59, 130, 246, 0.2)' : 'transparent', border: 'none', borderBottom: leaderboardTab === tab.id ? '2px solid #3b82f6' : '2px solid transparent', color: leaderboardTab === tab.id ? '#60a5fa' : '#94a3b8', fontWeight: leaderboardTab === tab.id ? 'bold' : 'normal', cursor: 'pointer', fontSize: '0.85rem', transition: 'all 0.2s' }}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>
                    <div style={{ maxHeight: '130px', overflowY: 'auto', paddingRight: '0.2rem' }}>
                      {isSubmittingScore ? (
                        <div style={{ color: '#94a3b8', textAlign: 'center', padding: '1rem 0' }}>{t("上傳分數中...", "Submitting...")}</div>
                      ) : leaderboard && Array.isArray(leaderboard[leaderboardTab]) && leaderboard[leaderboardTab].length > 0 ? (
                        leaderboard[leaderboardTab].map((entry, i) => (
                          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.35rem 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                            <span style={{ color: i === 0 ? '#fbbf24' : i === 1 ? '#e2e8f0' : i === 2 ? '#b45309' : '#94a3b8', fontWeight: i < 3 ? 'bold' : 'normal', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                              <span style={{ width: '16px', textAlign: 'right' }}>{i + 1}.</span>
                              <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                <span>{entry.name}</span>
                                <span style={{ fontSize: '0.65rem', padding: '0.1rem 0.3rem', background: entry.mode === 'square' ? 'rgba(139, 92, 246, 0.4)' : 'rgba(59, 130, 246, 0.4)', borderRadius: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{entry.mode || 'rain'}</span>
                              </span>
                            </span>
                            <span style={{ color: '#cbd5e1', fontWeight: 'bold' }}>{entry.score}</span>
                          </div>
                        ))
                      ) : (
                        <div style={{ color: '#94a3b8', textAlign: 'center', padding: '1rem 0' }}>{t("尚無排行紀錄，您是第一位！", "No records yet. Be the first!")}</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
