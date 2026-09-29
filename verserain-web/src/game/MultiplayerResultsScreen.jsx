// Multiplayer results — moved out of App.jsx unchanged (UI/UX 第 4 階段).
import { Trophy } from 'lucide-react';
import { getTeamResultsFromState } from '../lib/rooms.js';

export default function MultiplayerResultsScreen({ t, multiplayerSoloActiveRef, multiplayerState, myClientId, setGameState, setMultiplayerRoomId, setMultiplayerRoomMode, setMultiplayerRoomRole, socketRef }) {
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '1rem', flexDirection: 'column' }}>
      <div className="hud-glass" style={{ background: 'rgba(15, 23, 42, 0.95)', borderRadius: '12px', padding: '3rem 2rem', width: '100%', maxWidth: '800px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem', textAlign: 'center', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
        <h2 style={{ fontSize: '2.5rem', fontWeight: 'bold', margin: 0, color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: '12px' }}><Trophy size={40} color="#fbbf24" fill="#fbbf24" /> {multiplayerState.matchType === 'team' ? t("多人遊戲結束！", "Multiplayer Complete!") : multiplayerState.campaignResults?.length > 1 ? t("連戰結束！", "Marathon Completed!") : t("對局結束！", "Game Over!")}</h2>
        <div style={{ display: 'flex', gap: '1rem', width: '100%', flexWrap: 'wrap' }}>
          <button
            onClick={() => {
              multiplayerSoloActiveRef.current = false;
              setGameState('menu');
              setMultiplayerRoomMode(null);
              setMultiplayerRoomRole('player');
              setMultiplayerRoomId(null);
              if (socketRef.current) socketRef.current.close();
            }}
            style={{ flex: '1 1 180px', padding: '1rem', background: 'rgba(255,255,255,0.1)', color: '#cbd5e1', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', fontSize: '1.1rem', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s' }}
          >
            {t("離開對戰", "Leave Match")}
          </button>

          {multiplayerState?.host === myClientId && (
            <button
              onClick={() => {
                multiplayerSoloActiveRef.current = false;
                socketRef.current.send(JSON.stringify({ type: 'RESTART_GAME' }));
                setGameState('menu');
              }}
              style={{ flex: '1 1 180px', padding: '1rem', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', fontSize: '1.1rem', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s' }}
            >
              {t("回到大廳", "Return to Lobby")}
            </button>
          )}
        </div>

        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '1.5rem', margin: '1.5rem 0', maxHeight: '60vh', overflowY: 'auto', paddingRight: '0.5rem' }}>

          <h3 style={{ margin: 0, textAlign: 'left', color: '#94a3b8', borderBottom: '2px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}>{multiplayerState.matchType === 'team' ? t("隊伍排名", "Team Standings") : t("總排名", "Final Standings")}</h3>
          {multiplayerState.matchType === 'team' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {getTeamResultsFromState(multiplayerState).map((team, idx) => (
                <div key={team.id} style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', alignItems: 'center', gap: '1rem', padding: '1.2rem', backgroundColor: idx === 0 ? 'rgba(251, 191, 36, 0.12)' : 'rgba(255,255,255,0.03)', border: `1px solid ${idx === 0 ? '#fbbf24' : `${team.color}66`}`, borderRadius: '10px' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: idx === 0 ? '#fbbf24' : '#64748b' }}>#{idx + 1}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem', minWidth: 0 }}>
                    <span style={{ width: '14px', height: '14px', borderRadius: '50%', background: team.color, flex: '0 0 auto' }} />
                    <div style={{ textAlign: 'left', minWidth: 0 }}>
                      <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#e2e8f0' }}>{t(team.name, team.enName || team.name)}</div>
                      <div style={{ color: '#94a3b8', fontSize: '0.9rem', marginTop: '0.2rem' }}>{team.playerCount} {t("人", "players")} · {t("計分", "Scoring")} {team.scoringCount || 0} · {t("總分", "Total")} {team.totalScore}</div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '2rem', fontWeight: 'bold', color: team.color, fontFamily: 'monospace' }}>{team.averageScore}</div>
                    <div style={{ color: '#94a3b8', fontSize: '0.8rem', fontWeight: 'bold' }}>{t("平均分", "AVG")}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {Object.values(multiplayerState.players)
                .map(p => {
                  const totalScore = multiplayerState.campaignResults?.reduce((acc, round) => acc + Math.max(0, round.scores[p.id] || 0), 0) || p.score;
                  return { ...p, totalScore };
                })
                .sort((a, b) => b.totalScore - a.totalScore)
                .map((p, idx) => (
                  <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.2rem', backgroundColor: idx === 0 ? 'rgba(251, 191, 36, 0.1)' : 'rgba(255,255,255,0.03)', border: `1px solid ${idx === 0 ? '#fbbf24' : 'rgba(255,255,255,0.1)'}`, borderRadius: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: idx === 0 ? '#fbbf24' : '#64748b' }}>#{idx + 1}</div>
                      <div style={{ width: '16px', height: '16px', borderRadius: '50%', backgroundColor: p.color, boxShadow: '0 0 0 2px rgba(255,255,255,0.2)' }}></div>
                      <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#e2e8f0' }}>{p.name} {p.id === myClientId ? '(You)' : ''}</div>
                    </div>
                    <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#3b82f6', fontFamily: 'monospace' }}>{p.totalScore}</div>
                  </div>
                ))}
            </div>
          )}

          {multiplayerState.matchType !== 'team' && multiplayerState.campaignResults?.length > 1 && (
            <>
              <h3 style={{ margin: '1rem 0 0 0', textAlign: 'left', color: '#94a3b8', borderBottom: '2px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}>{t("回合紀錄", "Round History")}</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                {multiplayerState.campaignResults.map((round, rIdx) => (
                  <div key={rIdx} style={{ display: 'flex', flexDirection: 'column', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '6px', padding: '1rem' }}>
                    <div style={{ color: '#93c5fd', fontWeight: 'bold', textAlign: 'left', marginBottom: '0.5rem' }}>{t("回合", "Round")} {rIdx + 1}: {round.verseRef}</div>
                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                      {Object.keys(round.scores)
                        .sort((a, b) => round.scores[b] - round.scores[a])
                        .map((pid, rank) => {
                          const player = multiplayerState.players[pid];
                          if (!player) return null;
                          return (
                            <div key={pid} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', color: '#cbd5e1', background: rank === 0 ? 'rgba(16, 185, 129, 0.2)' : 'transparent', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                              {rank === 0 && <span style={{ color: '#10b981' }}>★</span>}
                              {player.name}: <span style={{ fontWeight: 'bold', fontFamily: 'monospace' }}>{Math.max(0, round.scores[pid])}</span>
                            </div>
                          )
                        })
                      }
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

      </div>
    </div>
  );
}
