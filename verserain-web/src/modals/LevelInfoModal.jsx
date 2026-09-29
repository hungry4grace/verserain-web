// The reciprocity levels — moved out of App.jsx unchanged (UI/UX 第 4 階段).
import { Apple, Info, Trophy, Users, X } from 'lucide-react';
import { SKOOL_LEVELS } from '../lib/rooms.js';

export default function LevelInfoModal({ t, levelCounts, setShowLevelInfo, skoolLevel }) {
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }} onClick={() => setShowLevelInfo(false)}>
      <div style={{ background: '#fff', borderRadius: '16px', width: '100%', maxWidth: '600px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
          <h3 style={{ margin: 0, color: '#1e293b', fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Trophy size={24} /> {t("互惠階級說明", "Level System")}
          </h3>
          <button onClick={() => setShowLevelInfo(false)} style={{ background: 'transparent', border: 'none', fontSize: '1.5rem', color: '#94a3b8', cursor: 'pointer' }}><X size={24} /></button>
        </div>

        <div style={{ padding: '1.5rem', overflowY: 'auto' }}>
          <p style={{ color: '#475569', marginBottom: '1.5rem', lineHeight: '1.6' }}>
            {t("在園子裡持續照顧樹苗並結出果子，就能提升你的互惠階級！", "Bear fruits in your garden to level up!")}
            {t("（建立專屬經文組不需要階級 —— 登入就可以。）", " Creating custom verse sets needs no level — just sign in.")}
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
            {SKOOL_LEVELS.map(levelObj => {
              const isCurrent = skoolLevel.level === levelObj.level;
              const isUnlocked = skoolLevel.level >= levelObj.level;

              return (
                <div key={levelObj.level} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '1rem 1.5rem', borderRadius: '12px',
                  background: isCurrent ? 'linear-gradient(135deg, #f0fdf4, #dcfce7)' : (isUnlocked ? '#f8fafc' : '#ffffff'),
                  border: `2px solid ${isCurrent ? '#22c55e' : (isUnlocked ? '#e2e8f0' : '#f1f5f9')}`,
                  transition: 'transform 0.2s', transform: isCurrent ? 'scale(1.02)' : 'none',
                  boxShadow: isCurrent ? '0 4px 12px rgba(34, 197, 94, 0.15)' : 'none'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: isCurrent ? '#22c55e' : (isUnlocked ? '#64748b' : '#cbd5e1'), color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '1.2rem' }}>
                      {levelObj.level}
                    </div>
                    <div>
                      <div style={{ fontWeight: 'bold', color: isCurrent ? '#15803d' : (isUnlocked ? '#334155' : '#94a3b8'), fontSize: '1.1rem', display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
                        {t(levelObj.title, levelObj.enTitle)}

                        {levelCounts !== null && levelCounts._total > 0 && (
                          <span style={{ fontSize: '0.85rem', color: '#64748b', marginLeft: '12px', fontWeight: 'bold', background: '#f1f5f9', padding: '4px 10px', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                            <Users size={14} /> {levelCounts[levelObj.level] || 0} {t("人", "players")} ({levelCounts._total > 0 ? Math.round(((levelCounts[levelObj.level] || 0) / levelCounts._total) * 100) : 0}%)
                          </span>
                        )}

                        {isCurrent && <span style={{ fontSize: '0.9rem', color: '#059669', marginLeft: '8px', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}><Info size={14} /> {t("目前階級", "You are here")}</span>}
                      </div>
                    </div>
                  </div>
                  <div style={{ fontWeight: 'bold', color: isUnlocked ? '#d97706' : '#cbd5e1', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Apple size={18} /> {levelObj.points}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ padding: '1rem 1.5rem', background: '#f8fafc', borderTop: '1px solid #e2e8f0', textAlign: 'center' }}>
          <button onClick={() => setShowLevelInfo(false)} style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '0.8rem 2rem', borderRadius: '8px', fontWeight: 'bold', fontSize: '1rem', cursor: 'pointer' }}>
            {t("關閉", "Close")}
          </button>
        </div>
      </div>
    </div>
  );
}
