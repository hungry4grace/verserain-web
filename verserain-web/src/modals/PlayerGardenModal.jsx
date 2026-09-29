// Someone else's garden — moved out of App.jsx unchanged (UI/UX 第 4 階段).
import { ActivityHeatmap } from '../garden/ActivityHeatmap.jsx';
import { Apple, Frown, Hourglass, Leaf, Sprout, X } from 'lucide-react';
import GardenView from '../GardenView.jsx';
import { verseRefKey } from '../lib/verseRef.js';

export default function PlayerGardenModal({ t, challengeGardenVerse, isNarrowEditor, resolveGardenVerse, setViewingPlayerGarden, version, viewingPlayerGarden }) {
  const vgData = viewingPlayerGarden.gardenData || {};
  const vgEntries = Object.entries(vgData).filter(([k]) => k !== '_activity');
  const vgTreeCount = vgEntries.length;
  const vgGameFruits = vgEntries.reduce((sum, [, d]) => sum + (d.fruits || 0), 0);
  const vgCreatorFruits = viewingPlayerGarden.creatorPoints || 0;
  const vgReferralFruits = viewingPlayerGarden.referralPoints || 0;
  const vgTotalFruits = vgGameFruits + vgCreatorFruits + vgReferralFruits;
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.75)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', backdropFilter: 'blur(4px)' }} onClick={() => setViewingPlayerGarden(null)}>
      <div style={{ background: '#fff', borderRadius: '16px', width: '100%', maxWidth: '800px', maxHeight: '92vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 25px 50px rgba(0,0,0,0.3)' }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ padding: '1.2rem 1.5rem', background: 'linear-gradient(135deg, #065f46, #047857)', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.3rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Leaf size={24} /> {viewingPlayerGarden.playerName} {t('的園地', "'s Garden")}
            </h3>
            <div style={{ fontSize: '0.85rem', opacity: 0.8, marginTop: '4px' }}>
              <div style={{ marginBottom: '4px' }}>
                {vgTreeCount} {t('棵植物', 'plants')} · {t('點一下格子查看經文並挑戰', 'Tap a cell to read and challenge')}
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Apple size={16} /> {t('總果子', 'Total Fruits')}: <strong>{vgTotalFruits}</strong></span>
                <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>
                  ( {t('經文', 'Verses')} {vgGameFruits} | {t('推薦', 'Referral')} {vgReferralFruits} | {t('經文組分享', 'Sets Shared')} {vgCreatorFruits} )
                </span>
              </div>
            </div>
          </div>
          <button onClick={() => setViewingPlayerGarden(null)} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', fontSize: '1.4rem', cursor: 'pointer', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={22} /></button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.2rem' }}>
          {viewingPlayerGarden.loading ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8', fontSize: '1.1rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}><Hourglass size={20} /> {t('載入中...', 'Loading...')}</div>
          ) : viewingPlayerGarden.error ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#f43f5e', fontSize: '1rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}><Frown size={20} /> {viewingPlayerGarden.error}</div>
          ) : vgTreeCount === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8', fontSize: '1rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}><Sprout size={20} /> {t('這個玩家的園地還是空的！', 'This player\'s garden is empty!')}</div>
          ) : (
            <>
              <GardenView
                idPrefix="guest-garden"
                variant="guest"
                showStats={false}
                gardenData={vgData}
                t={t}
                version={version}
                refKey={verseRefKey}
                resolveVerse={resolveGardenVerse}
                onChallenge={(p) => { setViewingPlayerGarden(null); challengeGardenVerse({ ...p, setId: null }); }}
                isNarrow={isNarrowEditor}
                bleed={isNarrowEditor ? '0.6rem' : 0}
              />
              <div style={{ marginTop: '1.5rem' }}>
                <ActivityHeatmap t={t} activityMap={vgData?._activity || {}} />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
