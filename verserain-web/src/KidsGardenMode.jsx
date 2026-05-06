import React from 'react';
import { Home, Play, RotateCcw, Sparkles, Trophy } from 'lucide-react';

const DECORATIONS = [
  { id: 'river', name: '小河', icon: '💧', cost: 1, color: '#38bdf8' },
  { id: 'path', name: '石板路', icon: '▫️', cost: 2, color: '#94a3b8' },
  { id: 'flowers', name: '花田', icon: '🌼', cost: 3, color: '#f472b6' },
  { id: 'bridge', name: '小橋', icon: '🌉', cost: 5, color: '#b45309' },
  { id: 'lamp', name: '路燈', icon: '🏮', cost: 8, color: '#f59e0b' },
  { id: 'cottage', name: '小屋', icon: '🏡', cost: 12, color: '#16a34a' },
];

const DECOR_LAYOUT = [
  { id: 'river', cells: [3, 4, 12, 21, 30, 39, 48, 57, 66, 75] },
  { id: 'bridge', cells: [39] },
  { id: 'path', cells: [52, 53, 54, 55, 56, 64, 74, 84] },
  { id: 'flowers', cells: [9, 18, 27, 70, 71, 80, 81] },
  { id: 'lamp', cells: [51, 57, 73] },
  { id: 'cottage', cells: [86] },
];

const TILE_COUNT = 90;

export default function KidsGardenMode({
  gardenData,
  verseSets,
  playerName,
  onBackToKids,
  onChallengeVerse,
}) {
  const [selectedDecor, setSelectedDecor] = React.useState(() => {
    try {
      return JSON.parse(localStorage.getItem('verseRain_kidsGardenDecor') || '["river","path","flowers"]');
    } catch {
      return ['river', 'path', 'flowers'];
    }
  });
  const [selectedCell, setSelectedCell] = React.useState(null);

  React.useEffect(() => {
    localStorage.setItem('verseRain_kidsGardenDecor', JSON.stringify(selectedDecor));
  }, [selectedDecor]);

  const entries = React.useMemo(() => {
    return Object.entries(gardenData || {})
      .filter(([key]) => key !== '_activity')
      .map(([ref, data]) => ({ ref, ...data }))
      .sort((a, b) => (a.gridIndex || 0) - (b.gridIndex || 0));
  }, [gardenData]);

  const verseLookup = React.useMemo(() => {
    const map = {};
    (verseSets || []).forEach(set => {
      (set.verses || []).forEach(verse => {
        map[verse.reference] = { verse, set };
      });
    });
    return map;
  }, [verseSets]);

  const totalFruits = entries.reduce((sum, entry) => sum + (entry.fruits || 0), 0);
  const fullTrees = entries.filter(entry => (entry.stage || 0) >= 10).length;
  const unlockedDecor = DECORATIONS.filter(item => totalFruits >= item.cost);
  const gridCells = buildWorldCells(entries, selectedDecor);

  const toggleDecor = (id) => {
    const item = DECORATIONS.find(decor => decor.id === id);
    if (!item || totalFruits < item.cost) return;
    setSelectedDecor(prev => prev.includes(id) ? prev.filter(itemId => itemId !== id) : [...prev, id]);
  };

  const challengeSelected = () => {
    if (!selectedCell?.ref) return;
    const found = verseLookup[selectedCell.ref];
    if (found) onChallengeVerse(found.verse, found.set);
  };

  return (
    <div style={{ padding: '1rem 0 3rem', color: '#143328' }}>
      <section style={{
        position: 'relative',
        overflow: 'hidden',
        borderRadius: '20px',
        border: '3px solid #bbf7d0',
        background: 'linear-gradient(135deg, #dcfce7 0%, #fef9c3 44%, #bae6fd 100%)',
        boxShadow: '0 20px 50px rgba(22, 101, 52, 0.16)',
        padding: '1.1rem',
        marginBottom: '1rem'
      }}>
        <div style={{ position: 'absolute', inset: 0, opacity: 0.25, pointerEvents: 'none', backgroundImage: 'linear-gradient(45deg, rgba(22,101,52,.18) 25%, transparent 25%), linear-gradient(-45deg, rgba(14,165,233,.16) 25%, transparent 25%)', backgroundSize: '34px 34px' }} />
        <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: '1rem', alignItems: 'center' }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', color: '#15803d', fontWeight: 900, marginBottom: '0.35rem' }}>
              <Sparkles size={18} /> 我的園子兒童版
            </div>
            <h1 style={{ margin: 0, color: '#0f172a', fontSize: 'clamp(2rem, 5vw, 3.1rem)', lineHeight: 1.03, letterSpacing: 0 }}>
              {playerName ? `${playerName} 的經文小島` : '經文小島'}
            </h1>
          </div>
          <button onClick={onBackToKids} style={topButton('#0ea5e9')}>
            <Home size={18} /> 回兒童冒險
          </button>
        </div>
      </section>

      <div style={{ display: 'grid', gridTemplateColumns: '260px minmax(0, 1fr)', gap: '1rem' }}>
        <aside style={{ display: 'grid', gap: '1rem', alignSelf: 'start' }}>
          <div style={panelStyle}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.55rem' }}>
              <Stat label="樹" value={entries.length} tone="#16a34a" />
              <Stat label="大樹" value={fullTrees} tone="#0ea5e9" />
              <Stat label="果子" value={totalFruits} tone="#f97316" />
              <Stat label="裝飾" value={unlockedDecor.length} tone="#db2777" />
            </div>
          </div>

          <div style={panelStyle}>
            <div style={{ color: '#0f172a', fontWeight: 900, marginBottom: '0.7rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Trophy size={18} color="#f59e0b" /> 果子裝飾
            </div>
            <div style={{ display: 'grid', gap: '0.5rem' }}>
              {DECORATIONS.map(item => {
                const unlocked = totalFruits >= item.cost;
                const active = selectedDecor.includes(item.id);
                return (
                  <button
                    key={item.id}
                    onClick={() => toggleDecor(item.id)}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '32px minmax(0, 1fr) auto',
                      gap: '0.55rem',
                      alignItems: 'center',
                      border: active ? `2px solid ${item.color}` : '1px solid #dbeafe',
                      background: active ? '#f0fdf4' : unlocked ? '#ffffff' : '#f8fafc',
                      color: unlocked ? '#0f172a' : '#94a3b8',
                      borderRadius: '10px',
                      padding: '0.55rem',
                      cursor: unlocked ? 'pointer' : 'not-allowed',
                      textAlign: 'left',
                      fontWeight: 900
                    }}
                  >
                    <span style={{ fontSize: '1.35rem' }}>{item.icon}</span>
                    <span>{item.name}</span>
                    <span style={{ fontSize: '0.78rem', color: unlocked ? '#b45309' : '#94a3b8' }}>{item.cost}🍎</span>
                  </button>
                );
              })}
            </div>
          </div>
        </aside>

        <section style={{ minWidth: 0 }}>
          <div style={{
            position: 'relative',
            overflow: 'auto',
            minHeight: '620px',
            borderRadius: '18px',
            border: '4px solid #365314',
            background: 'linear-gradient(180deg, #93c5fd 0 28%, #86efac 28% 100%)',
            boxShadow: 'inset 0 18px 40px rgba(15, 23, 42, 0.18), 0 16px 38px rgba(22, 101, 52, 0.18)'
          }}>
            <div style={{ position: 'absolute', top: 22, left: 28, right: 28, height: 90, background: 'rgba(255,255,255,0.65)', borderRadius: '60% 40% 55% 45%', filter: 'blur(1px)', opacity: 0.65 }} />
            <div style={{ position: 'relative', width: '920px', minHeight: '620px', margin: '0 auto', padding: '84px 20px 40px' }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(10, 74px)',
                gridAutoRows: '58px',
                gap: '2px',
                transform: 'rotateX(58deg) rotateZ(45deg)',
                transformOrigin: 'center top',
                margin: '10px auto 0',
                width: '760px'
              }}>
                {gridCells.map((cell, index) => (
                  <button
                    key={index}
                    onClick={() => cell.ref && setSelectedCell(cell)}
                    title={cell.ref || cell.decorName || '草地'}
                    style={{
                      position: 'relative',
                      height: '58px',
                      border: '1px solid rgba(21, 128, 61, 0.28)',
                      borderRadius: '7px',
                      background: tileBackground(cell),
                      cursor: cell.ref ? 'pointer' : 'default',
                      transformStyle: 'preserve-3d',
                      boxShadow: 'inset 0 -8px 0 rgba(22, 101, 52, 0.16)'
                    }}
                  >
                    {cell.decor && <TileIcon>{cell.decor}</TileIcon>}
                    {cell.ref && (
                      <TreeIcon stage={cell.stage || 1} fruits={cell.fruits || 0} />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {selectedCell && (
            <div style={{ marginTop: '1rem', background: '#ffffff', border: '2px solid #bbf7d0', borderRadius: '16px', padding: '1rem', boxShadow: '0 10px 28px rgba(15, 23, 42, 0.1)' }}>
              <div style={{ display: 'flex', gap: '0.9rem', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ color: '#15803d', fontWeight: 900, fontSize: '0.84rem' }}>經文樹</div>
                  <h2 style={{ margin: 0, color: '#0f172a', fontSize: '1.35rem' }}>{selectedCell.ref}</h2>
                  <div style={{ marginTop: '0.25rem', color: '#64748b', fontWeight: 800 }}>
                    成長 {selectedCell.stage || 1}/10 · 果子 {selectedCell.fruits || 0}
                  </div>
                </div>
                <button onClick={challengeSelected} disabled={!verseLookup[selectedCell.ref]} style={{ ...topButton('#16a34a'), opacity: verseLookup[selectedCell.ref] ? 1 : 0.55 }}>
                  <Play size={18} fill="white" /> 挑戰這棵樹
                </button>
              </div>
            </div>
          )}

          {entries.length === 0 && (
            <div style={{ marginTop: '1rem', background: '#fff7ed', border: '2px solid #fed7aa', borderRadius: '16px', padding: '1rem', color: '#9a3412', fontWeight: 900 }}>
              還沒有經文樹。先去兒童冒險挑戰一節經文，這裡就會長出第一棵樹。
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function buildWorldCells(entries, selectedDecor) {
  const cells = Array.from({ length: TILE_COUNT }, (_, index) => ({ index }));
  DECOR_LAYOUT.forEach(group => {
    if (!selectedDecor.includes(group.id)) return;
    const decor = DECORATIONS.find(item => item.id === group.id);
    group.cells.forEach(index => {
      if (cells[index]) {
        cells[index] = { ...cells[index], decor: decor.icon, decorName: decor.name, decorId: group.id };
      }
    });
  });
  entries.slice(0, 34).forEach((entry, idx) => {
    const preferred = treePositions[idx] ?? idx;
    cells[preferred] = { ...cells[preferred], ...entry };
  });
  return cells;
}

const treePositions = [14, 15, 24, 25, 33, 34, 35, 42, 43, 44, 45, 46, 58, 59, 60, 61, 62, 63, 67, 68, 69, 76, 77, 78, 79, 82, 83, 85, 87, 88, 31, 32, 40, 41];

function TreeIcon({ stage, fruits }) {
  let src = '/assets/garden/tree-seedling.png';
  if (stage > 6) src = '/assets/garden/tree-mature.png';
  else if (stage > 3) src = '/assets/garden/tree-sapling.png';

  return (
    <span style={{
      position: 'absolute',
      left: '50%',
      top: '50%',
      width: '68px',
      height: '78px',
      transform: 'translate(-50%, -82%) rotateZ(-45deg) rotateX(-58deg)',
      transformOrigin: 'center bottom',
      display: 'grid',
      placeItems: 'center',
      pointerEvents: 'none',
      filter: 'drop-shadow(0 12px 8px rgba(15, 23, 42, 0.28))'
    }}>
      <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
      {fruits > 0 && <span style={{ position: 'absolute', right: 2, top: 8, background: '#fff7ed', color: '#b45309', border: '1px solid #fed7aa', borderRadius: '999px', padding: '0 0.32rem', fontSize: '0.7rem', fontWeight: 900 }}>🍎{fruits}</span>}
    </span>
  );
}

function TileIcon({ children }) {
  return (
    <span style={{
      position: 'absolute',
      left: '50%',
      top: '50%',
      transform: 'translate(-50%, -58%) rotateZ(-45deg) rotateX(-58deg)',
      fontSize: '1.55rem',
      pointerEvents: 'none',
      filter: 'drop-shadow(0 6px 4px rgba(15,23,42,.22))'
    }}>
      {children}
    </span>
  );
}

function tileBackground(cell) {
  if (cell.decorId === 'river') return 'linear-gradient(135deg, #7dd3fc, #0ea5e9)';
  if (cell.decorId === 'path') return 'linear-gradient(135deg, #e2e8f0, #94a3b8)';
  if (cell.decorId === 'flowers') return 'linear-gradient(135deg, #bbf7d0, #fbcfe8)';
  if (cell.decorId === 'bridge') return 'linear-gradient(135deg, #92400e, #d97706)';
  if (cell.decorId === 'lamp') return 'linear-gradient(135deg, #fef3c7, #86efac)';
  if (cell.decorId === 'cottage') return 'linear-gradient(135deg, #fde68a, #86efac)';
  return 'linear-gradient(135deg, #86efac, #4ade80)';
}

function Stat({ label, value, tone }) {
  return (
    <div style={{ background: '#ffffff', border: `1px solid ${tone}`, borderRadius: '12px', padding: '0.65rem', textAlign: 'center' }}>
      <div style={{ color: tone, fontWeight: 900, fontSize: '1.4rem', lineHeight: 1 }}>{value}</div>
      <div style={{ color: '#64748b', fontWeight: 900, fontSize: '0.78rem', marginTop: '0.2rem' }}>{label}</div>
    </div>
  );
}

const panelStyle = {
  background: '#ffffff',
  border: '1px solid #dbeafe',
  borderRadius: '16px',
  padding: '0.9rem',
  boxShadow: '0 8px 24px rgba(15, 23, 42, 0.07)'
};

function topButton(color) {
  return {
    border: 'none',
    background: color,
    color: '#ffffff',
    borderRadius: '12px',
    padding: '0.72rem 0.95rem',
    cursor: 'pointer',
    fontWeight: 900,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.42rem',
    boxShadow: '0 8px 18px rgba(15, 23, 42, 0.16)'
  };
}
