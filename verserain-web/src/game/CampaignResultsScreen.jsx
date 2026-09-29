// Results after a run of verses (continuous challenge) — moved out of App.jsx unchanged (UI/UX 第 4 階段).
import { Trophy } from 'lucide-react';

export default function CampaignResultsScreen({ t, campaignResults, setCampaignQueue, setGameState }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100dvh', width: '100vw', overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: 'calc(env(safe-area-inset-top) + 2rem) 1rem 4rem' }}>
      <div className="hud-glass" style={{ padding: 'clamp(1.5rem, 4vw, 3rem)', textAlign: 'center', width: '90%', maxWidth: '800px', display: 'flex', flexDirection: 'column', animation: 'flashSuccess 1s ease-out' }}>
        <Trophy size={48} color="#fbbf24" style={{ margin: '0 auto 1rem' }} />
        <h2 style={{ fontSize: 'clamp(2rem, 4vh, 2.5rem)', color: '#fff', marginBottom: '1.5rem' }}>{t("所有關卡完成！", "All Rounds Conquered!")}</h2>

        <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '16px', padding: '1.5rem', overflowY: 'auto', maxHeight: '50vh', marginBottom: '2rem' }}>
          {campaignResults.map((result, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', borderBottom: i < campaignResults.length - 1 ? '1px solid rgba(255,255,255,0.1)' : 'none' }}>
              <div style={{ textAlign: 'left' }}>
                <div style={{ color: '#93c5fd', fontWeight: 'bold', fontSize: '1.1rem' }}>{result.verse.reference}</div>
                <div style={{ color: result.health > 0 ? (result.flawless ? '#34d399' : '#93c5fd') : '#f87171', fontSize: '0.9rem' }}>
                  {result.health > 0 ? (result.flawless ? t('完美', 'Perfect') : t('過關', 'Cleared')) : t('錯失', 'Missed')}
                </div>
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: result.health > 0 ? '#fbbf24' : '#64748b' }}>{result.score}</div>
            </div>
          ))}
        </div>

        <div style={{ fontSize: '1.5rem', color: '#cbd5e1', marginBottom: '2rem' }}>
          {t("總計得分", "Total Score")}: <strong style={{ color: '#fbbf24', fontSize: '3rem', display: 'block', marginTop: '0.5rem' }}>{campaignResults.reduce((sum, r) => sum + r.score, 0)}</strong>
        </div>

        <button
          onClick={() => {
            setGameState('menu');
            setCampaignQueue(null);
          }}
          className="play-btn"
          style={{
            background: '#3b82f6', color: 'white', border: 'none', padding: '1rem',
            fontSize: '1.2rem', fontWeight: 'bold', borderRadius: '12px', cursor: 'pointer', margin: '0 auto', maxWidth: '300px', width: '100%'
          }}
        >{t("回到主頁", "Back to Home")}</button>
      </div>
    </div>
  );
}
