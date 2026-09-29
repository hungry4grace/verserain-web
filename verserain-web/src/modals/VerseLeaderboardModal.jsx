// One verse's leaderboard — moved out of App.jsx unchanged (UI/UX 第 4 階段).
import { Trophy, XCircle } from 'lucide-react';

export default function VerseLeaderboardModal({ t, isFetchingLeaderboard, leaderboardModalData, leaderboardModalTab, leaderboardModalVerse, setLeaderboardModalTab, setLeaderboardModalVerse }) {
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', backdropFilter: 'blur(5px)' }} onClick={() => setLeaderboardModalVerse(null)}>
      <div className="hud-glass" style={{ width: '100%', maxWidth: '500px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', background: 'rgba(15, 23, 42, 0.95)', border: '1px solid rgba(59, 130, 246, 0.3)' }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h2 style={{ fontSize: '1.5rem', color: '#93c5fd', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Trophy size={20} /> {t("排行榜", "Leaderboard")}</h2>
            <div style={{ color: '#cbd5e1' }}>{leaderboardModalVerse.reference}</div>
          </div>
          <button onClick={() => setLeaderboardModalVerse(null)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '0.25rem' }}><XCircle size={24} /></button>
        </div>

        <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.2)' }}>
          {[{ id: 'daily', label: t('今天', 'Today') }, { id: 'monthly', label: t('30天 (本月)', '30 days (Month)') }, { id: 'alltime', label: t('歷史', 'All-Time') }].map(tab => (
            <button
              key={tab.id}
              onClick={() => setLeaderboardModalTab(tab.id)}
              style={{ flex: 1, padding: '1rem 0', background: leaderboardModalTab === tab.id ? 'rgba(59, 130, 246, 0.2)' : 'transparent', border: 'none', borderBottom: leaderboardModalTab === tab.id ? '2px solid #3b82f6' : '2px solid transparent', color: leaderboardModalTab === tab.id ? '#60a5fa' : '#94a3b8', fontWeight: leaderboardModalTab === tab.id ? 'bold' : 'normal', cursor: 'pointer', transition: 'all 0.2s', fontSize: '1rem' }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1, minHeight: '300px' }}>
          {isFetchingLeaderboard ? (
            <div style={{ color: '#94a3b8', textAlign: 'center', margin: '2rem 0' }}>{t("載入排行榜中...", "Loading Leaderboard...")}</div>
          ) : leaderboardModalData && Array.isArray(leaderboardModalData[leaderboardModalTab]) && leaderboardModalData[leaderboardModalTab].length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {leaderboardModalData[leaderboardModalTab].map((entry, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <span style={{ fontSize: '1.2rem', fontWeight: 'bold', width: '24px', textAlign: 'center', color: i === 0 ? '#fbbf24' : i === 1 ? '#e2e8f0' : i === 2 ? '#b45309' : '#94a3b8' }}>{i + 1}</span>
                    <span style={{ color: '#fff', fontSize: '1.1rem', fontWeight: i < 3 ? 'bold' : 'normal', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span>{entry.name}</span>
                      <span style={{ fontSize: '0.7rem', padding: '0.1rem 0.4rem', background: entry.mode === 'square' ? 'rgba(139, 92, 246, 0.4)' : 'rgba(59, 130, 246, 0.4)', borderRadius: '4px', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#93c5fd' }}>{entry.mode || 'rain'}</span>
                    </span>
                  </div>
                  <span style={{ color: '#3b82f6', fontWeight: 'bold', fontSize: '1.1rem' }}>{entry.score}</span>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ color: '#94a3b8', textAlign: 'center', margin: '2rem 0' }}>{t("尚無排行紀錄，趕緊成為第一位吧！", "No records yet. Be the first!")}</div>
          )}
        </div>
      </div>
    </div>
  );
}
