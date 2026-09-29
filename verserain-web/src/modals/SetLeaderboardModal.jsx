// A verse set's leaderboard — moved out of App.jsx unchanged (UI/UX 第 4 階段).
import { Trophy, X } from 'lucide-react';

export default function SetLeaderboardModal({ t, isLoadingLeaderboard, leaderboardData, leaderboardPage, leaderboardTotal, setLeaderboardPage, setLeaderboardSetId, setShowSetLeaderboard }) {
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999, padding: '1rem' }}>
      <div style={{ background: 'white', padding: '2rem', borderRadius: '12px', width: '100%', maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto', position: 'relative', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' }}>
        <button onClick={() => { setShowSetLeaderboard(false); setLeaderboardPage(0); setLeaderboardSetId(null); }} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#94a3b8' }}><X size={24} /></button>
        <h2 style={{ color: '#1e293b', marginTop: 0, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '10px' }}><Trophy color="#f59e0b" /> {t("經文組通關紀錄", "Verse Set Records")}</h2>

        {isLoadingLeaderboard ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>{t('載入中...', 'Loading...')}</div>
        ) : leaderboardData.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>{t('目前還沒有通關紀錄', 'No records found yet')}</div>
        ) : (
          <>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', marginBottom: '1rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', color: '#475569', fontSize: '0.9rem' }}>
                  <th style={{ padding: '1rem', borderBottom: '2px solid #e2e8f0' }}>{t("排行", "Rank")}</th>
                  <th style={{ padding: '1rem', borderBottom: '2px solid #e2e8f0' }}>{t("玩家", "Player")}</th>
                  <th style={{ padding: '1rem', borderBottom: '2px solid #e2e8f0' }}>{t("總分", "Total Score")}</th>
                  <th style={{ padding: '1rem', borderBottom: '2px solid #e2e8f0' }}>{t("通過經文數", "Passed")}</th>
                  <th style={{ padding: '1rem', borderBottom: '2px solid #e2e8f0' }}>{t("模式", "Mode")}</th>
                  <th style={{ padding: '1rem', borderBottom: '2px solid #e2e8f0' }}>{t("日期", "Date")}</th>
                </tr>
              </thead>
              <tbody>
                {leaderboardData.map((record, index) => {
                  const formatModeName = (modeString) => {
                    if (!modeString || modeString.includes('未知')) return t('未知', 'Unknown');
                    let result = modeString;
                    result = result.replace(/square_solo/i, t('九宮格', 'Square'));
                    result = result.replace(/VerseRain/i, t('經文雨', 'VerseRain'));
                    result = result.replace(/rain/i, t('經文雨', 'VerseRain'));
                    result = result.replace(/VoiceMode/i, t('語音模式', 'Voice Mode'));
                    result = result.replace(/-dx(\d+)/i, (match, p1) => ` ${t('難度', 'Difficulty')} ${p1}`);
                    return result;
                  };
                  return (
                  <tr key={index} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '1rem', fontWeight: 'bold', color: index === 0 ? '#fbbf24' : index === 1 ? '#94a3b8' : index === 2 ? '#b45309' : '#64748b' }}>#{leaderboardPage * 10 + index + 1}</td>
                    <td style={{ padding: '1rem', fontWeight: 'bold', color: '#334155' }}>{record.name}</td>
                    <td style={{ padding: '1rem', color: '#f59e0b', fontWeight: 'bold' }}>{record.score}</td>
                    <td style={{ padding: '1rem', color: '#64748b' }}>{record.passedCount} / {record.totalCount}</td>
                    <td style={{ padding: '1rem', color: '#64748b' }}>{formatModeName(record.mode)}</td>
                    <td style={{ padding: '1rem', color: '#64748b', fontSize: '0.85rem' }}>{record.date ? new Date(record.date).toLocaleDateString() : ''}</td>
                  </tr>
                  );
                })}
              </tbody>
            </table>

            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem' }}>
              <button 
                disabled={leaderboardPage === 0}
                onClick={() => setLeaderboardPage(p => p - 1)}
                style={{ padding: '0.5rem 1rem', borderRadius: '6px', border: '1px solid #cbd5e1', background: leaderboardPage === 0 ? '#f1f5f9' : '#ffffff', color: leaderboardPage === 0 ? '#94a3b8' : '#334155', cursor: leaderboardPage === 0 ? 'not-allowed' : 'pointer' }}
              >
                {t("上一頁", "Prev")}
              </button>
              <span style={{ color: '#64748b', fontSize: '0.9rem' }}>{t("第", "Page")} {leaderboardPage + 1} {t("頁", " ")} / {t("共", "Total")} {Math.ceil(leaderboardTotal / 10)} {t("頁", "Pages")}</span>
              <button 
                disabled={(leaderboardPage + 1) * 10 >= leaderboardTotal}
                onClick={() => setLeaderboardPage(p => p + 1)}
                style={{ padding: '0.5rem 1rem', borderRadius: '6px', border: '1px solid #cbd5e1', background: (leaderboardPage + 1) * 10 >= leaderboardTotal ? '#f1f5f9' : '#ffffff', color: (leaderboardPage + 1) * 10 >= leaderboardTotal ? '#94a3b8' : '#334155', cursor: (leaderboardPage + 1) * 10 >= leaderboardTotal ? 'not-allowed' : 'pointer' }}
              >
                {t("下一頁", "Next")}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
