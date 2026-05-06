import React from 'react';
import { BookOpen, CheckCircle2, CloudRain, Crown, Dices, Map, Play, RotateCcw, Sparkles, Star, Trophy, Wand2, X, Zap } from 'lucide-react';

const routeThemes = [
  {
    test: /約翰福音|John|Juan|Johannes/i,
    routeTitle: '生命光森林',
    icon: '🌲',
    badge: '耶穌是光',
    grade: '中低年級',
    recommendedMode: '拼圖優先',
    description: '跟著約翰福音找到生命、光、道路與真理。',
    color: '#0ea5e9',
    bg: 'linear-gradient(135deg, #e0f2fe, #dcfce7)'
  },
  {
    test: /嘉義|兒童|主日學|Sunday|Children/i,
    routeTitle: '勇氣小鎮',
    icon: '🏘️',
    badge: '主日學任務',
    grade: '低年級',
    recommendedMode: '拼圖 + 挑戰',
    description: '用短句拼圖先認識經文，再一步一步完成背誦。',
    color: '#f97316',
    bg: 'linear-gradient(135deg, #fff7ed, #fef9c3)'
  },
  {
    test: /箴言|Proverbs|Proverbios/i,
    routeTitle: '智慧礦坑',
    icon: '⛏️',
    badge: '智慧選擇',
    grade: '中高年級',
    recommendedMode: '方塊路',
    description: '挖出智慧寶石，練習說話、選擇與敬畏神。',
    color: '#8b5cf6',
    bg: 'linear-gradient(135deg, #ede9fe, #ecfeff)'
  },
  {
    test: /互惠|經濟|Mutual|Econom/i,
    routeTitle: '愛心市場',
    icon: '🤝',
    badge: '彼此幫助',
    grade: '中高年級',
    recommendedMode: '經文雨',
    description: '學習慷慨、分享、工作與祝福人的道路。',
    color: '#16a34a',
    bg: 'linear-gradient(135deg, #dcfce7, #fef3c7)'
  },
  {
    test: /價值|value|Worth/i,
    routeTitle: '寶貝山谷',
    icon: '💎',
    badge: '我是寶貴',
    grade: '低年級',
    recommendedMode: '拼圖優先',
    description: '讓孩子知道自己被神愛、被神看為寶貴。',
    color: '#db2777',
    bg: 'linear-gradient(135deg, #fce7f3, #e0f2fe)'
  },
  {
    test: /療癒|醫治|Healing|Sanidad/i,
    routeTitle: '平安泉水',
    icon: '💧',
    badge: '安慰與醫治',
    grade: '中低年級',
    recommendedMode: '聽一聽',
    description: '在神的應許裡領受平安、盼望與安慰。',
    color: '#0891b2',
    bg: 'linear-gradient(135deg, #cffafe, #dcfce7)'
  }
];

const fallbackRoutes = [
  ['信心山谷', '⛰️', '信靠神', '中低年級', '拼圖 + 挑戰', '#0ea5e9', 'linear-gradient(135deg, #e0f2fe, #fef9c3)'],
  ['愛心小鎮', '💛', '彼此相愛', '低年級', '拼圖優先', '#f59e0b', 'linear-gradient(135deg, #fef3c7, #dcfce7)'],
  ['禱告海灣', '⛵', '禱告生活', '中低年級', '聽一聽', '#14b8a6', 'linear-gradient(135deg, #ccfbf1, #e0f2fe)'],
  ['品格徽章路', '🏅', '好品格', '中高年級', '方塊路', '#8b5cf6', 'linear-gradient(135deg, #ede9fe, #fce7f3)']
];

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
  const [showTeacherDesigner, setShowTeacherDesigner] = React.useState(false);
  const selectedSet = React.useMemo(
    () => verseSets.find(set => set.id === selectedSetId) || currentSet || verseSets[0],
    [currentSet, selectedSetId, verseSets]
  );

  React.useEffect(() => {
    if (currentSet?.id) setSelectedSetId(currentSet.id);
  }, [currentSet?.id]);

  const featuredRoutes = React.useMemo(() => {
    const sets = [...verseSets];
    sets.sort((a, b) => {
      const aKid = /兒童|孩子|主日學|比賽|核心/.test(`${a.title || ''} ${a.description || ''}`) ? 1 : 0;
      const bKid = /兒童|孩子|主日學|比賽|核心/.test(`${b.title || ''} ${b.description || ''}`) ? 1 : 0;
      if (aKid !== bKid) return bKid - aKid;
      return (viewCounts[b.id] || 0) - (viewCounts[a.id] || 0);
    });
    return sets.slice(0, 6).map((set, index) => buildAdventureRoute(set, index));
  }, [verseSets, viewCounts]);

  const selectedRoute = React.useMemo(
    () => featuredRoutes.find(route => route.set.id === selectedSet?.id) || buildAdventureRoute(selectedSet, 0),
    [featuredRoutes, selectedSet]
  );

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
        background: selectedRoute?.bg || 'linear-gradient(135deg, #ecfeff 0%, #fef9c3 46%, #dcfce7 100%)',
        boxShadow: '0 18px 50px rgba(14, 116, 144, 0.16)',
        padding: '1.2rem',
        marginBottom: '1rem'
      }}>
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.24, backgroundImage: 'radial-gradient(circle at 12% 22%, #ffffff 0 18px, transparent 19px), radial-gradient(circle at 84% 18%, #ffffff 0 24px, transparent 25px), linear-gradient(90deg, transparent 0 11px, rgba(14, 116, 144, .18) 12px, transparent 13px), linear-gradient(0deg, transparent 0 11px, rgba(14, 116, 144, .12) 12px, transparent 13px)', backgroundSize: 'auto, auto, 42px 42px, 42px 42px' }} />
        <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: 'minmax(0, 1.1fr) minmax(280px, .9fr)', gap: '1rem', alignItems: 'stretch' }}>
          <section style={{ padding: '1rem', minWidth: 0 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: '#0369a1', fontWeight: 900, marginBottom: '0.55rem' }}>
              <Map size={19} /> 兒童冒險 · {selectedRoute?.badge}
            </div>
            <h1 style={{ margin: 0, color: '#0f172a', fontSize: 'clamp(2rem, 5vw, 3.2rem)', lineHeight: 1.03, letterSpacing: 0 }}>
              {selectedRoute?.icon} {selectedRoute?.routeTitle || '經文探險島'}
            </h1>
            <p style={{ margin: '0.65rem 0 0', color: '#334155', fontWeight: 800, fontSize: '1.05rem', lineHeight: 1.55, maxWidth: '680px' }}>
              {selectedRoute?.description}
            </p>
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
              <button onClick={() => setShowTeacherDesigner(true)} style={secondaryButton('#0f766e')}>
                <Wand2 size={18} /> 老師設計路線
              </button>
            </div>
          </section>

          <section style={{ background: 'rgba(255,255,255,0.76)', border: '1px solid rgba(14, 116, 144, 0.16)', borderRadius: '14px', padding: '1rem', display: 'grid', gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.8rem' }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ color: '#64748b', fontSize: '0.8rem', fontWeight: 900 }}>目前路線</div>
                <div style={{ color: '#0f172a', fontSize: '1.1rem', fontWeight: 900, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selectedRoute?.routeTitle}</div>
                <div style={{ color: '#64748b', fontSize: '0.78rem', fontWeight: 800, marginTop: '0.2rem' }}>{selectedRoute?.grade} · {selectedRoute?.recommendedMode}</div>
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
            {featuredRoutes.map((route, idx) => {
              const active = route.set.id === selectedSet?.id;
              return (
                <button
                  key={route.set.id}
                  onClick={() => {
                    setSelectedSetId(route.set.id);
                    onSelectSet(route.set.id);
                  }}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '42px minmax(0, 1fr)',
                    gap: '0.55rem',
                    alignItems: 'center',
                    width: '100%',
                    textAlign: 'left',
                    border: active ? `2px solid ${route.color}` : '1px solid #e2e8f0',
                    background: active ? route.bg : '#ffffff',
                    borderRadius: '14px',
                    padding: '0.65rem',
                    cursor: 'pointer'
                  }}
                >
                  <span style={{ width: 42, height: 42, borderRadius: '13px', display: 'grid', placeItems: 'center', color: '#fff', fontWeight: 900, background: route.color, fontSize: '1.35rem' }}>{route.icon}</span>
                  <span style={{ minWidth: 0 }}>
                    <span style={{ display: 'block', color: '#0f172a', fontWeight: 900, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{route.routeTitle}</span>
                    <span style={{ display: 'block', color: '#475569', fontSize: '0.76rem', fontWeight: 800 }}>{route.grade} · {route.set.verses?.length || 0} 關</span>
                    <span style={{ display: 'block', color: route.color, fontSize: '0.72rem', fontWeight: 900, marginTop: '0.16rem' }}>{route.badge}</span>
                  </span>
                </button>
              );
            })}
            <button
              onClick={() => setShowTeacherDesigner(true)}
              style={{
                border: '1px dashed #14b8a6',
                background: '#f0fdfa',
                color: '#0f766e',
                borderRadius: '14px',
                padding: '0.75rem',
                cursor: 'pointer',
                fontWeight: 900,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.4rem'
              }}
            >
              <Wand2 size={17} /> 老師設計路線
            </button>
          </div>
        </aside>

        <section style={{ background: '#ffffff', border: '1px solid #dbeafe', borderRadius: '14px', padding: '1rem', boxShadow: '0 8px 24px rgba(15, 23, 42, 0.06)', minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'center', marginBottom: '1rem' }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ color: '#64748b', fontWeight: 900, fontSize: '0.82rem' }}>關卡地圖</div>
              <h2 style={{ margin: 0, color: '#0f172a', fontSize: '1.35rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selectedRoute?.routeTitle}</h2>
              <div style={{ marginTop: '0.25rem', color: '#64748b', fontWeight: 800, fontSize: '0.86rem' }}>
                原經文組：{selectedSet?.title}
              </div>
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
      {showTeacherDesigner && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(15, 23, 42, 0.58)', display: 'grid', placeItems: 'center', padding: '1rem' }}>
          <div style={{ width: 'min(760px, 100%)', background: '#ffffff', border: '2px solid #99f6e4', borderRadius: '18px', boxShadow: '0 26px 70px rgba(15, 23, 42, 0.28)', overflow: 'hidden' }}>
            <div style={{ background: 'linear-gradient(135deg, #ccfbf1, #fef9c3)', padding: '1rem 1.2rem', display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'flex-start' }}>
              <div>
                <div style={{ color: '#0f766e', fontWeight: 900, fontSize: '0.86rem' }}>老師路線設計器草稿</div>
                <h2 style={{ margin: '0.2rem 0 0', color: '#0f172a', fontSize: '1.45rem' }}>把經文組變成主日學探險路線</h2>
              </div>
              <button onClick={() => setShowTeacherDesigner(false)} style={{ width: 36, height: 36, borderRadius: '10px', border: '1px solid #5eead4', background: '#ffffff', color: '#0f766e', cursor: 'pointer', display: 'grid', placeItems: 'center' }}>
                <X size={20} />
              </button>
            </div>
            <div style={{ padding: '1.2rem', display: 'grid', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '0.75rem' }}>
                {[
                  ['1', '選經文組', '從現有題庫或老師自訂題庫開始。'],
                  ['2', '設定對象', '幼兒、低年級、中高年級或比賽班。'],
                  ['3', '安排玩法', '每關可指定拼圖、方塊路或經文雨。'],
                  ['4', '分享路線', '之後可產生連結或 QR code 給孩子。']
                ].map(([num, title, desc]) => (
                  <div key={num} style={{ border: '1px solid #ccfbf1', background: '#f8fafc', borderRadius: '14px', padding: '0.85rem' }}>
                    <div style={{ width: 32, height: 32, borderRadius: '10px', display: 'grid', placeItems: 'center', background: '#14b8a6', color: '#ffffff', fontWeight: 900 }}>{num}</div>
                    <div style={{ marginTop: '0.55rem', color: '#0f172a', fontWeight: 900 }}>{title}</div>
                    <div style={{ marginTop: '0.25rem', color: '#64748b', fontWeight: 800, fontSize: '0.86rem', lineHeight: 1.5 }}>{desc}</div>
                  </div>
                ))}
              </div>

              <div style={{ background: '#f0fdfa', border: '1px dashed #14b8a6', borderRadius: '14px', padding: '1rem', color: '#115e59', fontWeight: 800, lineHeight: 1.7 }}>
                這一版先把官方路線包裝好。下一步若要開放老師設計，我建議先做「本機草稿 + 分享連結」，等老師們真的開始使用後，再把路線存到雲端帳號。
              </div>

              <button onClick={() => setShowTeacherDesigner(false)} style={{ ...primaryButton('#14b8a6', '#22c55e'), justifyContent: 'center' }}>
                <BookOpen size={18} /> 先使用官方路線
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function buildAdventureRoute(set, index = 0) {
  const haystack = `${set?.title || ''} ${set?.description || ''} ${set?.authorName || ''}`;
  const matched = routeThemes.find(theme => theme.test.test(haystack));
  if (matched) return { ...matched, set };

  const fallback = fallbackRoutes[index % fallbackRoutes.length];
  return {
    set,
    routeTitle: fallback[0],
    icon: fallback[1],
    badge: fallback[2],
    grade: fallback[3],
    recommendedMode: fallback[4],
    color: fallback[5],
    bg: fallback[6],
    description: `${set?.title || '經文'}被整理成適合孩子闖關的探險路線。`
  };
}

function splitVerseForPuzzle(text) {
  const raw = String(text || '').trim();
  if (!raw) return [];

  const hasCjk = /[\u3400-\u9fff]/.test(raw);
  if (hasCjk) {
    const normalized = raw
      .replace(/([\u3400-\u9fff])\s+([\u3400-\u9fff])/g, '$1$2')
      .replace(/\s+/g, ' ');
    const clauses = (normalized.match(/[^，。；、：！？,.?!;:]+[，。；、：！？,.?!;:]?/g) || [])
      .map(item => item.trim())
      .filter(Boolean)
      .flatMap(item => splitLongChinesePhrase(item, 14));

    if (clauses.length <= 1) return normalized.split('').filter(Boolean);

    const targetCount = Math.min(8, Math.max(3, Math.ceil(normalized.replace(/\s/g, '').length / 10)));
    return mergePuzzleClauses(clauses, targetCount, 18);
  }

  const words = raw.split(/\s+/).map(item => item.trim()).filter(Boolean);
  if (words.length <= 7) return words.length >= 2 ? words : raw.split('').filter(Boolean);

  const chunks = [];
  for (let i = 0; i < words.length; i += 6) {
    chunks.push(words.slice(i, i + 6).join(' '));
  }
  return chunks;
}

function splitLongChinesePhrase(phrase, maxLength) {
  const clean = phrase.trim();
  if (clean.length <= maxLength) return [clean];
  const chunks = [];
  for (let i = 0; i < clean.length; i += maxLength) {
    chunks.push(clean.slice(i, i + maxLength));
  }
  return chunks;
}

function mergePuzzleClauses(clauses, targetCount, maxLength) {
  const merged = [...clauses];
  while (merged.length > targetCount) {
    let bestIndex = -1;
    let bestScore = Infinity;
    for (let i = 0; i < merged.length - 1; i += 1) {
      const combined = `${merged[i]}${merged[i + 1]}`;
      const overLimitPenalty = combined.length > maxLength ? 80 + combined.length : 0;
      const finalSentencePenalty = /[。！？.!?]$/.test(merged[i + 1]) ? 8 : 0;
      const score = Math.abs(combined.length - 12) + overLimitPenalty + finalSentencePenalty;
      if (score < bestScore) {
        bestScore = score;
        bestIndex = i;
      }
    }
    if (bestIndex < 0) break;
    merged.splice(bestIndex, 2, `${merged[bestIndex]}${merged[bestIndex + 1]}`);
  }
  return merged;
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
