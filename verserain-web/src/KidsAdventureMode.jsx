import React from 'react';
import { CheckCircle2, CloudRain, Crown, Dices, Map, Play, RotateCcw, Sparkles, Star, Trophy, X, Zap } from 'lucide-react';

const pathColors = ['#ef4444', '#0ea5e9', '#16a34a', '#f59e0b', '#8b5cf6', '#db2777'];

export default function KidsAdventureMode({
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
  const [puzzleVerse, setPuzzleVerse] = React.useState(null);
  const [puzzlePieces, setPuzzlePieces] = React.useState([]);
  const [puzzleSlots, setPuzzleSlots] = React.useState([]);
  const [selectedPieceId, setSelectedPieceId] = React.useState(null);
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

  const openPuzzle = (verse) => {
    if (!verse || !selectedSet) return;
    onSelectSet(selectedSet.id);
    const phrases = splitVerseForPuzzle(verse.text);
    const pieces = phrases.map((text, order) => ({ id: `${verse.reference}-${order}-${text}`, text, order }));
    setPuzzleVerse(verse);
    setPuzzlePieces(shufflePieces(pieces));
    setPuzzleSlots(Array.from({ length: pieces.length }, () => null));
    setSelectedPieceId(null);
  };

  const resetPuzzle = () => {
    if (!puzzleVerse) return;
    const phrases = splitVerseForPuzzle(puzzleVerse.text);
    const pieces = phrases.map((text, order) => ({ id: `${puzzleVerse.reference}-${order}-${text}`, text, order }));
    setPuzzlePieces(shufflePieces(pieces));
    setPuzzleSlots(Array.from({ length: pieces.length }, () => null));
    setSelectedPieceId(null);
  };

  const placePuzzlePiece = (pieceId, slotIndex) => {
    if (!pieceId || slotIndex < 0) return;
    const piece = puzzlePieces.find(item => item.id === pieceId);
    if (!piece) return;
    const replaced = puzzleSlots[slotIndex];
    setPuzzleSlots(prev => {
      const next = [...prev];
      next[slotIndex] = piece;
      return next;
    });
    setPuzzlePieces(prev => {
      const remaining = prev.filter(item => item.id !== pieceId);
      return replaced ? [...remaining, replaced].sort((a, b) => a.order - b.order) : remaining;
    });
    setSelectedPieceId(null);
  };

  const removePuzzlePiece = (slotIndex) => {
    const removed = puzzleSlots[slotIndex];
    if (!removed) return;
    setPuzzleSlots(prev => {
      const next = [...prev];
      next[slotIndex] = null;
      return next;
    });
    setPuzzlePieces(prev => [...prev, removed].sort((a, b) => a.order - b.order));
  };

  const puzzleComplete = puzzleSlots.length > 0 && puzzleSlots.every((piece, index) => piece?.order === index);

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
              <Map size={19} /> 兒童冒險
            </div>
            <h1 style={{ margin: 0, color: '#0f172a', fontSize: 'clamp(2rem, 5vw, 3.2rem)', lineHeight: 1.03, letterSpacing: 0 }}>
              經文探險島
            </h1>
            <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', marginTop: '1rem' }}>
              <button onClick={randomVerse} style={primaryButton('#f97316', '#facc15')}>
                <Dices size={18} /> 抽一關
              </button>
              <button onClick={() => verses[0] && startVerse(verses[0])} style={primaryButton('#10b981', '#38bdf8')}>
                <Play size={18} fill="white" /> 開始冒險
              </button>
              <button onClick={onOpenMultiplayer} style={secondaryButton('#7c3aed')}>
                <Crown size={18} /> 全班一起玩
              </button>
            </div>
          </section>

          <section style={{ background: 'rgba(255,255,255,0.76)', border: '1px solid rgba(14, 116, 144, 0.16)', borderRadius: '14px', padding: '1rem', display: 'grid', gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.8rem' }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ color: '#64748b', fontSize: '0.8rem', fontWeight: 900 }}>目前路線</div>
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
              <button onClick={() => onSetPlayMode('square_solo')} style={modeButton(playMode === 'square_solo')}>方塊路</button>
              <button onClick={() => onSetPlayMode('rain_solo')} style={modeButton(playMode === 'rain_solo')}>經文雨</button>
            </div>
          </section>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '260px minmax(0, 1fr)', gap: '1rem' }}>
        <aside style={{ background: '#ffffff', border: '1px solid #dbeafe', borderRadius: '14px', padding: '0.9rem', boxShadow: '0 8px 24px rgba(15, 23, 42, 0.06)', alignSelf: 'start' }}>
          <div style={{ color: '#0f172a', fontWeight: 900, marginBottom: '0.7rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <CloudRain size={18} color="#0ea5e9" /> 探險路線
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
                    <span style={{ display: 'block', color: '#64748b', fontSize: '0.76rem' }}>{set.verses?.length || 0} 關</span>
                  </span>
                </button>
              );
            })}
          </div>
        </aside>

        <section style={{ background: '#ffffff', border: '1px solid #dbeafe', borderRadius: '14px', padding: '1rem', boxShadow: '0 8px 24px rgba(15, 23, 42, 0.06)', minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'center', marginBottom: '1rem' }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ color: '#64748b', fontWeight: 900, fontSize: '0.82rem' }}>關卡地圖</div>
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
                <div
                  key={verse.id || verse.reference}
                  style={{
                    position: 'relative',
                    minHeight: '118px',
                    border: done ? '2px solid #22c55e' : '1px solid #cbd5e1',
                    borderRadius: '14px',
                    background: done ? 'linear-gradient(180deg, #f0fdf4, #dcfce7)' : 'linear-gradient(180deg, #ffffff, #f8fafc)',
                    color: '#0f172a',
                    padding: '0.8rem',
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
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.45rem', marginTop: '0.65rem' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#64748b', fontSize: '0.78rem', fontWeight: 800 }}>
                      <Sparkles size={14} color="#f59e0b" /> {fruits}
                    </span>
                    <span style={{ display: 'inline-flex', gap: '0.35rem' }}>
                      <button onClick={() => openPuzzle(verse)} style={miniButton('#f97316', '#fff7ed')}>拼圖</button>
                      <button onClick={() => startVerse(verse)} style={miniButton('#0ea5e9', '#eff6ff')}>挑戰</button>
                    </span>
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      </div>
      {puzzleVerse && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(15, 23, 42, 0.58)', display: 'grid', placeItems: 'center', padding: '1rem' }}>
          <div style={{ width: 'min(880px, 100%)', maxHeight: '92vh', overflowY: 'auto', background: '#fffdf7', border: '2px solid #fde68a', borderRadius: '18px', boxShadow: '0 26px 70px rgba(15, 23, 42, 0.28)' }}>
            <div style={{ position: 'sticky', top: 0, zIndex: 2, background: 'linear-gradient(135deg, #fef3c7, #ecfeff)', borderBottom: '1px solid #fde68a', padding: '1rem 1.2rem', display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'flex-start' }}>
              <div>
                <div style={{ color: '#b45309', fontWeight: 900, fontSize: '0.85rem' }}>經文拼圖模式</div>
                <h2 style={{ margin: '0.2rem 0 0', color: '#0f172a', fontSize: '1.35rem' }}>{puzzleVerse.reference}</h2>
              </div>
              <button onClick={() => setPuzzleVerse(null)} style={{ width: 36, height: 36, borderRadius: '10px', border: '1px solid #fbbf24', background: '#ffffff', color: '#92400e', cursor: 'pointer', display: 'grid', placeItems: 'center' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: '1.2rem', display: 'grid', gap: '1rem' }}>
              <div style={{ background: '#ffffff', border: '1px dashed #f59e0b', borderRadius: '14px', padding: '0.85rem 1rem', color: '#475569', fontWeight: 800, lineHeight: 1.6 }}>
                把下面的短句拖到正確位置。也可以先點短句，再點空格。
              </div>

              <div style={{ display: 'grid', gap: '0.65rem' }}>
                {puzzleSlots.map((piece, index) => {
                  const correct = piece && piece.order === index;
                  return (
                    <div
                      key={index}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        placePuzzlePiece(e.dataTransfer.getData('text/plain'), index);
                      }}
                      onClick={() => {
                        if (piece) removePuzzlePiece(index);
                        else if (selectedPieceId) placePuzzlePiece(selectedPieceId, index);
                      }}
                      style={{
                        minHeight: '54px',
                        borderRadius: '12px',
                        border: piece ? (correct ? '2px solid #22c55e' : '2px solid #f97316') : '2px dashed #bae6fd',
                        background: piece ? (correct ? '#f0fdf4' : '#fff7ed') : '#f8fafc',
                        color: '#0f172a',
                        display: 'grid',
                        gridTemplateColumns: '34px minmax(0, 1fr)',
                        gap: '0.65rem',
                        alignItems: 'center',
                        padding: '0.6rem 0.75rem',
                        cursor: 'pointer'
                      }}
                    >
                      <span style={{ width: 30, height: 30, borderRadius: '9px', display: 'grid', placeItems: 'center', background: correct ? '#22c55e' : '#e0f2fe', color: correct ? '#fff' : '#0369a1', fontWeight: 900 }}>{index + 1}</span>
                      <span style={{ fontWeight: 900, lineHeight: 1.45 }}>{piece ? piece.text : '把短句放到這裡'}</span>
                    </div>
                  );
                })}
              </div>

              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '1rem' }}>
                <div style={{ color: '#475569', fontWeight: 900, marginBottom: '0.65rem' }}>短句積木</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.55rem' }}>
                  {puzzlePieces.length === 0 ? (
                    <span style={{ color: '#94a3b8', fontWeight: 800 }}>全部都放上去了！</span>
                  ) : puzzlePieces.map(piece => (
                    <button
                      key={piece.id}
                      draggable
                      onDragStart={(e) => e.dataTransfer.setData('text/plain', piece.id)}
                      onClick={() => setSelectedPieceId(piece.id)}
                      style={{
                        border: selectedPieceId === piece.id ? '2px solid #f97316' : '1px solid #fbbf24',
                        borderRadius: '12px',
                        background: selectedPieceId === piece.id ? '#ffedd5' : '#ffffff',
                        color: '#0f172a',
                        padding: '0.65rem 0.85rem',
                        cursor: 'grab',
                        fontWeight: 900,
                        boxShadow: '0 4px 0 rgba(146, 64, 14, 0.14)'
                      }}
                    >
                      {piece.text}
                    </button>
                  ))}
                </div>
              </div>

              {puzzleComplete && (
                <div style={{ background: 'linear-gradient(135deg, #dcfce7, #ecfeff)', border: '2px solid #86efac', borderRadius: '14px', padding: '1rem', display: 'flex', flexWrap: 'wrap', gap: '0.8rem', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ color: '#166534', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                    <CheckCircle2 size={22} /> 拼圖完成！現在可以進入挑戰。
                  </div>
                  <button onClick={() => startVerse(puzzleVerse)} style={primaryButton('#10b981', '#38bdf8')}>
                    <Play size={18} fill="white" /> 開始挑戰
                  </button>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.8rem', flexWrap: 'wrap' }}>
                <button onClick={resetPuzzle} style={secondaryButton('#b45309')}>
                  <RotateCcw size={17} /> 重新拼
                </button>
                <button onClick={() => startVerse(puzzleVerse)} style={secondaryButton('#0ea5e9')}>
                  <Zap size={17} /> 直接挑戰
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function splitVerseForPuzzle(text) {
  const spaced = String(text || '').split(/\s+/).map(item => item.trim()).filter(Boolean);
  if (spaced.length >= 2) return spaced;
  const punctuated = String(text || '').split(/[，。；、：！？,.?!;:]+/).map(item => item.trim()).filter(Boolean);
  if (punctuated.length >= 2) return punctuated;
  return String(text || '').split('').filter(Boolean);
}

function shufflePieces(pieces) {
  const shuffled = [...pieces];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
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

function miniButton(color, bg) {
  return {
    border: `1px solid ${color}`,
    background: bg,
    color,
    borderRadius: '8px',
    padding: '0.3rem 0.45rem',
    cursor: 'pointer',
    fontWeight: 900,
    fontSize: '0.78rem'
  };
}
