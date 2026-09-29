// Multiplayer: waiting for the other players to finish — moved out of App.jsx unchanged (UI/UX 第 4 階段).
import { Heart, Trophy } from 'lucide-react';
import { getTeamResultsFromState } from '../lib/rooms.js';

export default function WaitingScreen({ t, localCampaignListRef, multiplayerSoloActiveRef, multiplayerState, myClientId, restartTeamSoloRun, setGameState, setMultiplayerRoomId, setMultiplayerRoomMode, setMultiplayerRoomRole, setMultiplayerState, socketRef }) {
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '1rem', flexDirection: 'column' }}>
      <div className="hud-glass" style={{ background: 'rgba(15, 23, 42, 0.95)', borderRadius: '12px', padding: '3rem 2rem', width: '100%', maxWidth: '600px', border: '1px solid rgba(16, 185, 129, 0.4)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem', textAlign: 'center' }}>
        <h2 style={{ fontSize: '2rem', color: '#10b981', fontWeight: 'bold', margin: 0 }}>{multiplayerState.matchType === 'team' && multiplayerState.host === myClientId ? t("多人遊戲進行中", "Multiplayer in Progress") : t("你完成了所有經文！", "You finished all verses!")}</h2>
        <p style={{ color: '#94a3b8', fontSize: '1rem', margin: 0, animation: 'bounce 2s infinite' }}>{multiplayerState.matchType === 'team' && multiplayerState.host === myClientId ? t("可隨時結束比賽，結果會用隊伍平均分排名。", "You can end the match anytime. Teams are ranked by average score.") : multiplayerState.matchType === 'team' ? t("等待比賽結束，結果會用隊伍平均分排名。", "Waiting for the match to end. Teams are ranked by average score.") : t("等待其他玩家完成...", "Waiting for others to finish...")}</p>
        <div style={{ display: 'flex', gap: '1rem', width: '100%', justifyContent: 'center', flexWrap: 'wrap' }}>
          {multiplayerState?.host === myClientId && (
            <button
              onClick={() => {
                if (socketRef.current) socketRef.current.send(JSON.stringify({ type: 'FORCE_END_GAME' }));
              }}
              style={{ background: '#ef4444', color: 'white', border: 'none', padding: '0.75rem 2rem', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '1rem', transition: 'all 0.2s', boxShadow: '0 4px 6px -1px rgba(239, 68, 68, 0.5)' }}
            >
              {t("比賽結束", "End Match Now")}
            </button>
          )}
          {multiplayerState.matchType === 'team' && multiplayerState.host !== myClientId && multiplayerState.status === 'playing' && multiplayerState.playMode?.endsWith('_solo') && (
            <button
              onClick={restartTeamSoloRun}
              style={{ background: '#10b981', color: 'white', border: 'none', padding: '0.75rem 2rem', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '1rem', transition: 'all 0.2s', boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.5)' }}
            >
              {t("再挑戰一次", "Play Again")}
            </button>
          )}
          <button
            onClick={() => {
              if (socketRef.current) {
                socketRef.current.close();
                socketRef.current = null;
              }
              multiplayerSoloActiveRef.current = false;
              setGameState('menu');
              setMultiplayerRoomMode(null);
              setMultiplayerRoomRole('player');
              setMultiplayerRoomId(null);
              setMultiplayerState(null);
            }}
            style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)', padding: '0.75rem 2rem', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '1rem', transition: 'all 0.2s' }}
          >
            {t("離開遊戲", "Leave Game")}
          </button>
        </div>
        {multiplayerState.matchType === 'team' ? (
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '0.8rem', marginTop: '0.5rem' }}>
            {getTeamResultsFromState(multiplayerState).map((team, idx) => {
              const totalMembers = team.playerCount || 1;
              const completedPct = Math.min(100, ((team.completedCount || 0) / totalMembers) * 100);
              return (
                <div key={team.id} style={{ background: idx === 0 ? 'rgba(251,191,36,0.12)' : 'rgba(255,255,255,0.04)', border: `1px solid ${idx === 0 ? '#fbbf24' : `${team.color}66`}`, borderRadius: '10px', padding: '0.9rem 1.1rem', display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', minWidth: 0 }}>
                      <span style={{ color: idx === 0 ? '#fbbf24' : '#64748b', fontWeight: 'bold', fontSize: '1.1rem' }}>#{idx + 1}</span>
                      <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: team.color, flex: '0 0 auto' }} />
                      <strong style={{ color: '#e2e8f0', fontSize: '1.1rem' }}>{t(team.name, team.enName || team.name)}</strong>
                    </span>
                    <span style={{ color: team.color, fontWeight: 'bold', whiteSpace: 'nowrap' }}>{team.averageScore} avg</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8', fontSize: '0.9rem' }}>
                    <span>{team.playerCount} {t("人", "players")}</span>
                    <span>{t("完成", "Done")} {team.completedCount || 0} / {team.playerCount}</span>
                  </div>
                  <div style={{ width: '100%', height: '5px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ width: `${completedPct}%`, height: '100%', background: team.color, transition: 'width 0.5s' }} />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '0.8rem', marginTop: '0.5rem' }}>
            {Object.values(multiplayerState.players || {}).filter(p => p.connected).map(p => {
            const totalVerses = localCampaignListRef.current.length || 1;
            const versesCompleted = p.isFinished ? totalVerses : (p.versesCompleted || 0);
            const totalScore = Math.max(multiplayerState.campaignResults?.reduce((acc, round) => acc + Math.max(0, round.scores?.[p.id] || 0), 0) || 0, p.bestScore || 0);
            const isMe = p.id === myClientId;
            return (
              <div key={p.id} style={{ background: isMe ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.04)', border: `1px solid ${isMe ? 'rgba(16,185,129,0.4)' : 'rgba(255,255,255,0.1)'}`, borderRadius: '10px', padding: '0.8rem 1.2rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 'bold', color: isMe ? '#10b981' : '#e2e8f0', fontSize: '1rem' }}>{p.name}{isMe ? ` ${t("(你)", "(You)")}` : ''}</span>
                  <span style={{ color: p.isFinished ? '#10b981' : '#fbbf24', fontWeight: 'bold', fontSize: '0.9rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>{p.isFinished ? <><Trophy size={14} /> {t("完成！", "Done!")}</> : `${versesCompleted} / ${totalVerses}`}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontFamily: 'monospace', color: '#93c5fd', fontSize: '1rem' }}>{totalScore} pts</span>
                  <span style={{ display: 'flex', gap: '2px' }}>
                    {Array.from({ length: 3 }).map((_, i) => (
                      <Heart key={i} size={14} color={i < (p.health || 0) ? '#ef4444' : '#475569'} fill={i < (p.health || 0) ? '#ef4444' : 'none'} />
                    ))}
                  </span>
                </div>
                <div style={{ width: '100%', height: '5px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ width: `${(versesCompleted / totalVerses) * 100}%`, height: '100%', background: p.isFinished ? '#10b981' : '#3b82f6', transition: 'width 0.5s' }} />
                </div>
              </div>
            );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
