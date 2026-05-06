import React from 'react';
import { CloudRain, Crown, Dices, Map, Play, Sparkles, Star, Trophy, Zap } from 'lucide-react';

const pathColors = ['#ef4444', '#0ea5e9', '#16a34a', '#f59e0b', '#8b5cf6', '#db2777'];

export default function KidsAdventureMode({
  t,
  verseSets,
  currentSet,
  gardenData,
  viewCounts,
  playMode,
  onSelectSet,
  onSetPlayMode,
  onChallengeVerse,
  onOpenGarden,
  onOpenMultiplayer,
}) {
  const [selectedSetId, setSelectedSetId] = React.useState(currentSet?.id || verseSets[0]?.id);
  const selectedSet = React.useMemo(
    () => verseSets.find(set => set.id === selectedSetId) || currentSet || verseSets[0],
    [currentSet, selectedSetId, verseSets]
  );

  React.useEffect(() => {
    if (currentSet?.id) setSelectedSetId(currentSet.id);
  }, [currentSet?.id]);

  const featuredSets = React.useMemo(() => {
    const sets = [...verseSets];
    sets.sort((a, b) => {
      const aKid = /兒童|孩子|主日學|比賽|核心/.test(`${a.title || ''} ${a.description || ''}`) ? 1 : 0;
      const bKid = /兒童|孩子|主日學|比賽|核心/.test(`${b.title || ''} ${b.description || ''}`) ? 1 : 0;
      if (aKid !== bKid) return bKid - aKid;
      return (viewCounts[b.id] || 0) - (viewCounts[a.id] || 0);
    });
    return sets.slice(0, 6);
  }, [verseSets, viewCounts]);

  const verses = selectedSet?.verses || [];
  const completedCount = React.useMemo(() => {
    return verses.filter(v => (gardenData?.[v.reference]?.stage || 0) >= 10).length;
  }, [gardenData, verses]);
  const fruitCount = React.useMemo(() => {
    return verses.reduce((sum, v) => sum + (gardenData?.[v.reference]?.fruits || 0), 0);
  }, [gardenData, verses]);
  const progressPct = verses.length > 0 ? Math.round((completedCount / verses.length) * 100) : 0;

  const startVerse = (verse) => {
    if (!verse || !selectedSet) return;
    onSelectSet(selectedSet.id);
    onChallengeVerse(verse, selectedSet);
  };

  const randomVerse = () => {
    if (verses.length === 0) return;
    startVerse(verses[Math.floor(Math.random() * verses.length)]);
  };

  return (
    <div style={{ padding: '1rem 0 3rem', color: '#123047' }}>
      <div style={{
        position: 'relative',
        overflow: 'hidden',
        borderRadius: '18px',
        border: '2px solid #bae6fd',
        background: 'linear-gradient(135deg, #ecfeff 0%, #fef9c3 46%, #dcfce7 100%)',
        boxShadow: '0 18px 50px rgba(14, 116, 144, 0.16)',
        padding: '1.2rem',
        marginBottom: '1rem'
      }}>
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.24, backgroundImage: 'radial-gradient(circle at 12% 22%, #ffffff 0 18px, transparent 19px), radial-gradient(circle at 84% 18%, #ffffff 0 24px, transparent 25px), linear-gradient(90deg, transparent 0 11px, rgba(14, 116, 144, .18) 12px, transparent 13px), linear-gradient(0deg, transparent 0 11px, rgba(14, 116, 144, .12) 12px, transparent 13px)', backgroundSize: 'auto, auto, 42px 42px, 42px 42px' }} />
        <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: 'minmax(0, 1.1fr) minmax(280px, .9fr)', gap: '1rem', alignItems: 'stretch' }}>
          <section style={{ padding: '1rem', minWidth: 0 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: '#0369a1', fontWeight: 900, marginBottom: '0.55rem' }}>
              <Map size={19} /> {t('兒童冒險', 'Kids Adventure')}
            </div>
            <h1 style={{ margin: 0, color: '#0f172a', fontSize: 'clamp(2rem, 5vw, 3.2rem)', lineHeight: 1.03, letterSpacing: 0 }}>
              {t('經文探險島', 'Verse Adventure Island')}
            </h1>
            <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', marginTop: '1rem' }}>
              <button onClick={randomVerse} style={primaryButton('#f97316', '#facc15')}>
                <Dices size={18} /> {t('抽一關', 'Pick a Quest')}
              </button>
              <button onClick={() => verses[0] && startVerse(verses[0])} style={primaryButton('#10b981', '#38bdf8')}>
                <Play size={18} fill="white" /> {t('開始冒險', 'Start')}
              </button>
              <button onClick={onOpenMultiplayer} style={secondaryButton('#7c3aed')}>
                <Crown size={18} /> {t('全班一起玩', 'Class Play')}
              </button>
            </div>
          </section>

          <section style={{ background: 'rgba(255,255,255,0.76)', border: '1px solid rgba(14, 116, 144, 0.16)', borderRadius: '14px', padding: '1rem', display: 'grid', gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.8rem' }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ color: '#64748b', fontSize: '0.8rem', fontWeight: 900 }}>{t('目前路線', 'Current Path')}</div>
                <div style={{ color: '#0f172a', fontSize: '1.1rem', fontWeight: 900, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selectedSet?.title}</div>
              </div>
              <button onClick={onOpenGarden} style={{ ...secondaryButton('#059669'), padding: '0.55rem 0.75rem' }}>
                <Sparkles size={17} /> {fruitCount}
              </button>
            </div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569', fontWeight: 800, fontSize: '0.86rem', marginBottom: '0.4rem' }}>
                <span>{completedCount}/{verses.length}</span>
                <span>{progressPct}%</span>
              </div>
              <div style={{ height: '14px', background: '#e0f2fe', borderRadius: '999px', overflow: 'hidden', border: '1px solid #bae6fd' }}>
                <div style={{ width: `${progressPct}%`, minWidth: progressPct > 0 ? '14px' : 0, height: '100%', background: 'linear-gradient(90deg, #22c55e, #facc15)', borderRadius: '999px', transition: 'width .25s ease' }} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              <button onClick={() => onSetPlayMode('square_solo')} style={modeButton(playMode === 'square_solo')}>{t('方塊路', 'Blocks')}</button>
              <button onClick={() => onSetPlayMode('rain_solo')} style={modeButton(playMode === 'rain_solo')}>{t('經文雨', 'Rain')}</button>
            </div>
          </section>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '260px minmax(0, 1fr)', gap: '1rem' }}>
        <aside style={{ background: '#ffffff', border: '1px solid #dbeafe', borderRadius: '14px', padding: '0.9rem', boxShadow: '0 8px 24px rgba(15, 23, 42, 0.06)', alignSelf: 'start' }}>
          <div style={{ color: '#0f172a', fontWeight: 900, marginBottom: '0.7rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <CloudRain size={18} color="#0ea5e9" /> {t('探險路線', 'Paths')}
          </div>
          <div style={{ display: 'grid', gap: '0.55rem' }}>
            {featuredSets.map((set, idx) => {
              const active = set.id === selectedSet?.id;
              return (
                <button
                  key={set.id}
                  onClick={() => {
                    setSelectedSetId(set.id);
                    onSelectSet(set.id);
                  }}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '28px minmax(0, 1fr)',
                    gap: '0.55rem',
                    alignItems: 'center',
                    width: '100%',
                    textAlign: 'left',
                    border: active ? `2px solid ${pathColors[idx % pathColors.length]}` : '1px solid #e2e8f0',
                    background: active ? '#f0f9ff' : '#ffffff',
                    borderRadius: '10px',
                    padding: '0.55rem',
                    cursor: 'pointer'
                  }}
                >
                  <span style={{ width: 28, height: 28, borderRadius: '8px', display: 'grid', placeItems: 'center', color: '#fff', fontWeight: 900, background: pathColors[idx % pathColors.length] }}>{idx + 1}</span>
                  <span style={{ minWidth: 0 }}>
                    <span style={{ display: 'block', color: '#0f172a', fontWeight: 900, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{set.title}</span>
                    <span style={{ display: 'block', color: '#64748b', fontSize: '0.76rem' }}>{set.verses?.length || 0} {t('關', 'quests')}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </aside>

        <section style={{ background: '#ffffff', border: '1px solid #dbeafe', borderRadius: '14px', padding: '1rem', boxShadow: '0 8px 24px rgba(15, 23, 42, 0.06)', minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'center', marginBottom: '1rem' }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ color: '#64748b', fontWeight: 900, fontSize: '0.82rem' }}>{t('關卡地圖', 'Quest Map')}</div>
              <h2 style={{ margin: 0, color: '#0f172a', fontSize: '1.35rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selectedSet?.title}</h2>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: '#b45309', fontWeight: 900 }}>
              <Trophy size={18} /> {viewCounts[selectedSet?.id] || 0}
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(145px, 1fr))', gap: '0.75rem' }}>
            {verses.map((verse, idx) => {
              const entry = gardenData?.[verse.reference] || {};
              const done = (entry.stage || 0) >= 10;
              const fruits = entry.fruits || 0;
              return (
                <button
                  key={verse.id || verse.reference}
                  onClick={() => startVerse(verse)}
                  style={{
                    position: 'relative',
                    minHeight: '118px',
                    border: done ? '2px solid #22c55e' : '1px solid #cbd5e1',
                    borderRadius: '14px',
                    background: done ? 'linear-gradient(180deg, #f0fdf4, #dcfce7)' : 'linear-gradient(180deg, #ffffff, #f8fafc)',
                    color: '#0f172a',
                    padding: '0.8rem',
                    cursor: 'pointer',
                    textAlign: 'left',
                    overflow: 'hidden',
                    boxShadow: '0 5px 0 rgba(15, 23, 42, 0.08)'
                  }}
                  onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; }}
                  onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
                >
                  <span style={{ position: 'absolute', top: 8, right: 10, color: done ? '#16a34a' : '#94a3b8', fontWeight: 900 }}>{String(idx + 1).padStart(2, '0')}</span>
                  <span style={{ display: 'grid', placeItems: 'center', width: 36, height: 36, borderRadius: '10px', background: done ? '#22c55e' : '#e0f2fe', color: done ? '#fff' : '#0369a1', marginBottom: '0.65rem' }}>
                    {done ? <Star size={19} fill="white" /> : <Zap size={18} />}
                  </span>
                  <span style={{ display: 'block', fontWeight: 900, lineHeight: 1.25, paddingRight: '1.6rem' }}>{verse.reference}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.55rem', color: '#64748b', fontSize: '0.78rem', fontWeight: 800 }}>
                    <Sparkles size={14} color="#f59e0b" /> {fruits}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}

function primaryButton(from, to) {
  return {
    border: 'none',
    borderRadius: '12px',
    padding: '0.78rem 1rem',
    color: '#ffffff',
    background: `linear-gradient(135deg, ${from}, ${to})`,
    cursor: 'pointer',
    fontWeight: 900,
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.45rem',
    boxShadow: '0 8px 18px rgba(15, 23, 42, 0.16)'
  };
}

function secondaryButton(color) {
  return {
    border: `1px solid ${color}`,
    borderRadius: '12px',
    padding: '0.78rem 1rem',
    color,
    background: '#ffffff',
    cursor: 'pointer',
    fontWeight: 900,
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.45rem'
  };
}

function modeButton(active) {
  return {
    border: active ? '2px solid #0ea5e9' : '1px solid #cbd5e1',
    background: active ? '#e0f2fe' : '#ffffff',
    color: active ? '#0369a1' : '#475569',
    borderRadius: '10px',
    padding: '0.55rem',
    cursor: 'pointer',
    fontWeight: 900
  };
}
