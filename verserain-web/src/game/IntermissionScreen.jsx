// Multiplayer intermission between verses — moved out of App.jsx unchanged (UI/UX 第 4 階段).

export default function IntermissionScreen({ t, intermissionCountdown, localCampaignListRef, localNextVerse, localVerseIndexRef, mpLocalRefFor, mpLocalTextFor, multiplayerRoomId, multiplayerState }) {
  const isSoloMP = multiplayerRoomId && multiplayerState.playMode?.endsWith('_solo');
  const nextVerseData = isSoloMP ? localNextVerse : multiplayerState.campaignQueue?.[0];
  // In *_solo, preview the next verse in the player's own language.
  const nextVerseText = (isSoloMP && nextVerseData) ? mpLocalTextFor(nextVerseData.reference, nextVerseData.text) : nextVerseData?.text;
  const nextVerseRef = (isSoloMP && nextVerseData) ? mpLocalRefFor(nextVerseData.reference) : nextVerseData?.reference;
  const remaining = isSoloMP
    ? localCampaignListRef.current.length - localVerseIndexRef.current
    : multiplayerState.campaignQueue?.length;
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '1rem', flexDirection: 'column' }}>
      <div className="hud-glass" style={{ background: 'rgba(15, 23, 42, 0.95)', borderRadius: '12px', padding: '4rem 2rem', width: '100%', maxWidth: '600px', boxShadow: '0 25px 50px -12px rgba(16, 185, 129, 0.3)', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', border: '1px solid rgba(16, 185, 129, 0.5)' }}>
        <h2 style={{ fontSize: '2.5rem', color: '#10b981', marginBottom: '1.5rem', fontWeight: 'bold' }}>{t("太棒了！準備下一回合", "Great job! Get ready...")}</h2>
        <p style={{ color: '#cbd5e1', fontSize: '1.5rem', marginBottom: '2.5rem' }}>
          {t("還剩", "Remaining:")} <strong style={{ color: '#fff' }}>{remaining}</strong> {t("節經文", "verses")}
        </p>
        <p style={{ color: '#93c5fd', fontSize: '1.8rem', fontWeight: 'bold', marginBottom: '1rem' }}>
          {t("接下來：", "Next Up:")} {nextVerseRef}
        </p>
        {nextVerseText && (
          <div style={{ color: '#e2e8f0', fontSize: '1.1rem', marginBottom: '2rem', padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', maxHeight: '150px', overflowY: 'auto' }}>
            {nextVerseText}
          </div>
        )}
        <div style={{ fontSize: '6rem', fontWeight: 'bold', color: '#fbbf24', animation: 'bounce 1s infinite' }}>
          {intermissionCountdown}
        </div>
      </div>
    </div>
  );
}
