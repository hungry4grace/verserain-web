import { useState, useMemo, useRef, useEffect } from 'react';
import { Apple, Sprout, TreePine, ChevronLeft, ChevronRight, LayoutGrid, List, Search, X, Play, Smartphone } from 'lucide-react';
import {
  CELLS_PER_FIELD, APPLE_POSITIONS, buildFields, clampFieldIndex, fieldOfRef, fieldOfGridIndex,
  findGardenCell, filterGardenEntries, sortGardenEntries, stageLabelPair, stageBg, timeOfDayTheme, swipeDirection, isBlankRef,
} from './lib/gardenView.js';

// The garden, shared by 我的園子 and a friend's garden overlay.
//
// One 10×10 field at a time (tabs / ‹ › / swipe), cells sized to the container
// so nothing needs zooming; a single tap opens the verse card (bottom sheet on
// phones) whose 「挑戰這節經文」 button starts the game; double-click stays as a
// desktop shortcut. A list mode (search / sort / filter) and a "find & jump"
// box cover big gardens. All game/verse logic stays in App: `resolveVerse`
// looks the text up, `onChallenge` starts the game.

const VIEW_MODE_KEY = 'verseRain_gardenViewMode';
const LIST_PAGE = 200;
// What to print for a reference: the reference itself, or a placeholder when
// the planted key has no visible text (a custom verse saved without 出處).
const refLabel = (ref, t) => (isBlankRef(ref) ? t('（未標出處）', '(no reference)') : ref);
const LANG_BADGE = { kjv: 'KJV 🇬🇧', ko: '한국어 🇰🇷', ja: '日本語 🇯🇵', fa: 'فارسی 🇮🇷', he: 'עברית 🇮🇱' };

const treeImg = (src, alt, shadow) => (
  <img src={src} alt={alt} draggable={false} style={{ width: '150%', height: '150%', flexShrink: 0, objectFit: 'contain', transform: 'translateY(-15%)', filter: `drop-shadow(${shadow})`, pointerEvents: 'none' }} />
);

// A tree at a given growth stage; up to nine apples once it bears fruit.
// Everything is sized relative to the cell so it scales with the field.
export function GardenSprite({ stage, fruits }) {
  if (stage <= 0) return null;
  if (stage <= 3) return treeImg('/assets/garden/tree-seedling.png', 'seedling', '0 10px 10px rgba(0,0,0,0.2)');
  if (stage <= 6) return treeImg('/assets/garden/tree-sapling.png', 'sapling', '0 15px 15px rgba(0,0,0,0.2)');
  if (stage <= 9 || !(fruits > 0)) return treeImg('/assets/garden/tree-mature.png', 'mature tree', '0 20px 20px rgba(0,0,0,0.3)');
  const apples = Math.min(fruits, 9);
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ position: 'absolute', width: '150%', height: '150%', transform: 'translateY(-15%)' }}>
        <img src="/assets/garden/tree-mature.png" alt="mature tree" draggable={false} style={{ width: '100%', height: '100%', objectFit: 'contain', filter: 'drop-shadow(0 20px 20px rgba(0,0,0,0.3))', pointerEvents: 'none' }} />
        {APPLE_POSITIONS.slice(0, apples).map((pos, idx) => (
          <div key={idx} style={{ position: 'absolute', top: pos.top, left: pos.left, width: '22%', height: '22%', transform: 'translate(-50%, -50%)', filter: 'drop-shadow(0 2px 2px rgba(0,0,0,0.4))', zIndex: 2, pointerEvents: 'none' }}>
            <Apple style={{ width: '100%', height: '100%' }} fill="#dc2626" color="#b91c1c" />
          </div>
        ))}
      </div>
      {fruits > 9 && (
        <span style={{ position: 'absolute', top: '-18%', right: '-18%', fontSize: 'clamp(8px, 2.2vw, 12px)', fontWeight: 'bold', color: '#b91c1c', background: 'rgba(255,255,255,0.9)', borderRadius: '6px', padding: '0 0.3em', zIndex: 3, boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>
          +{fruits - 9}
        </span>
      )}
    </div>
  );
}

// The verse card: centred modal on desktop, bottom sheet on narrow screens.
export function GardenVerseCard({ card, t, version, isNarrow, onClose, onChallenge }) {
  if (!card) return null;
  const crossLang = !!card.detectedLang && card.detectedLang !== version;
  const canChallenge = !!card.verse && !card.loading;
  return (
    <div onClick={onClose} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 10000, display: 'flex', alignItems: isNarrow ? 'flex-end' : 'center', justifyContent: 'center', padding: isNarrow ? 0 : '1rem' }}>
      <div
        role="dialog"
        aria-label={refLabel(card.ref, t)}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: isNarrow ? '100%' : '400px', padding: '1.5rem',
          paddingBottom: isNarrow ? 'calc(1.5rem + env(safe-area-inset-bottom))' : '1.5rem',
          background: 'linear-gradient(135deg, #f0fdf4, #ecfdf5)', border: '3px solid #86efac',
          borderBottom: isNarrow ? 'none' : '3px solid #86efac',
          borderRadius: isNarrow ? '16px 16px 0 0' : '15px', boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
          position: 'relative', maxHeight: isNarrow ? '80vh' : '90vh', overflowY: 'auto', boxSizing: 'border-box',
          animation: 'flashSuccess 0.3s ease-out',
        }}
      >
        <button type="button" onClick={onClose} aria-label={t('關閉', 'Close')} style={{ position: 'absolute', top: '10px', right: '15px', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '1.4rem', fontWeight: 'bold' }}><X size={22} /></button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.8rem', flexWrap: 'wrap' }}>
          <div style={{ width: '60px', height: '60px', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: '100%', height: '100%', position: 'absolute', bottom: 0, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
              <GardenSprite stage={card.stage} fruits={card.fruits} />
            </div>
          </div>
          <span style={{ fontWeight: 'bold', color: isBlankRef(card.ref) ? '#94a3b8' : '#166534', fontSize: '1.2rem' }}>{refLabel(card.ref, t)}</span>
          <span style={{ fontSize: '0.85rem', color: '#166534', background: '#b2f5ea', padding: '3px 10px', borderRadius: '12px', fontWeight: 'bold' }}>{t(...stageLabelPair(card.stage))}</span>
          {crossLang && (
            <span style={{ fontSize: '0.75rem', color: '#1d4ed8', background: '#dbeafe', padding: '2px 8px', borderRadius: '10px', fontWeight: 'bold' }}>
              {LANG_BADGE[card.detectedLang] || '中文 🇹🇼'}
            </span>
          )}
        </div>
        {isBlankRef(card.ref) && (
          <p style={{ fontSize: '0.78rem', color: '#64748b', margin: '0 0 0.2rem' }}>
            {t('這節經文在經文集裡沒有填出處，所以園子只記得它的內容。', 'This verse was saved without a reference in its verse set, so the garden only knows its text.')}
          </p>
        )}
        <p style={{ color: '#334155', lineHeight: '1.6', fontSize: '1rem', margin: '1rem 0 0.8rem', fontStyle: 'italic', maxHeight: '30vh', overflowY: 'auto' }}>
          {card.loading ? t('載入中…', 'Loading…') : `"${card.text || t('(經文內容未找到)', '(Verse text not found)')}"`}
        </p>
        {crossLang && (
          <p style={{ fontSize: '0.78rem', color: '#64748b', margin: '0 0 1rem', textAlign: 'center' }}>
            {t('將暫時切換語言來挑戰，完成後自動恢復', 'Will temporarily switch language for this challenge, then restore')}
          </p>
        )}
        <button
          type="button"
          disabled={!canChallenge}
          onClick={() => { if (canChallenge) onChallenge(card); }}
          style={{ width: '100%', justifyContent: 'center', background: '#22c55e', color: 'white', border: 'none', padding: '0.8rem', borderRadius: '10px', fontWeight: 'bold', fontSize: '1.1rem', cursor: canChallenge ? 'pointer' : 'not-allowed', opacity: canChallenge ? 1 : 0.5, boxShadow: '0 4px 12px rgba(34,197,94,0.3)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <Play size={20} /> {t('挑戰這節經文', 'Challenge this verse')}
        </button>
      </div>
    </div>
  );
}

const chipStyle = (active, color = '#0f766e') => ({
  padding: '4px 10px', borderRadius: '999px', border: `1px solid ${active ? color : '#cbd5e1'}`,
  background: active ? color : '#fff', color: active ? '#fff' : '#475569', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold', whiteSpace: 'nowrap',
});

export default function GardenView({
  gardenData, t, version, refKey, resolveVerse, onChallenge,
  variant = 'own', isNarrow = false, focusRef = null, focusNonce = 0, onFocusConsumed,
  showStats = true, showLegend = true, idPrefix = 'garden', bleed = 0,
}) {
  const fields = useMemo(() => buildFields(gardenData), [gardenData]);

  // The component remounts whenever the garden tab is left (games unmount the
  // whole menu), so these initial values are how a "focus" request lands:
  // open on the field holding the verse and flash its cell.
  const [viewMode, setViewMode] = useState(() => {
    try { return localStorage.getItem(VIEW_MODE_KEY) === 'list' ? 'list' : 'field'; } catch { return 'field'; }
  });
  const [fieldIndex, setFieldIndex] = useState(() => {
    const f = focusRef ? fieldOfRef(fields.entries, focusRef, refKey) : -1;
    return f >= 0 ? f : fields.latestFieldIndex;
  });
  const [highlight, setHighlight] = useState(() => (focusRef && focusNonce ? { ref: focusRef, nonce: focusNonce } : null));
  const [query, setQuery] = useState('');
  const [searchMiss, setSearchMiss] = useState(false);
  const [sort, setSort] = useState('planted');
  const [filter, setFilter] = useState('all');
  const [listLimit, setListLimit] = useState(LIST_PAGE);
  const [card, setCard] = useState(null);
  const [theme] = useState(() => timeOfDayTheme(new Date().getHours()));

  const pointerTypeRef = useRef('mouse');
  const clickTimerRef = useRef(null);
  const touchStartRef = useRef(null);
  const swipedRef = useRef(false); // true briefly after a swipe: swallow the synthesised click
  const cardSeqRef = useRef(0);
  const jumpSeqRef = useRef(0); // nonce for search jumps (remounts the flashed cell)

  // Tell the owner the focus request was applied so it is not replayed on the
  // next visit. (Only calls a prop; no state is set inside the effect.)
  useEffect(() => {
    if (focusNonce && onFocusConsumed) onFocusConsumed(focusNonce);
  }, [focusNonce, onFocusConsumed]);

  const safeFieldIndex = clampFieldIndex(fieldIndex, fields.fieldCount);
  const listRows = useMemo(
    () => sortGardenEntries(filterGardenEntries(fields.entries, { query, filter, keyFn: refKey }), sort, refKey),
    [fields.entries, query, filter, sort, refKey],
  );

  const gotoField = (i) => { setFieldIndex(clampFieldIndex(i, fields.fieldCount)); setHighlight(null); };
  const switchView = (mode) => {
    if (mode !== viewMode) { setQuery(''); setSearchMiss(false); setListLimit(LIST_PAGE); } // the box means "jump" in one mode and "filter" in the other
    setViewMode(mode);
    try { localStorage.setItem(VIEW_MODE_KEY, mode); } catch { /* storage off */ }
  };

  const lookup = (ref) => Promise.resolve(resolveVerse ? resolveVerse(ref) : { verse: null, lang: version })
    .then((r) => ({ verse: r?.verse || null, lang: r?.lang || version }))
    .catch(() => ({ verse: null, lang: version }));

  const openCell = (entry) => {
    if (!entry) return;
    const seq = ++cardSeqRef.current;
    setHighlight(null);
    setCard({ ref: entry.ref, stage: entry.stage, fruits: entry.fruits, setId: entry.setId, verse: null, text: '', detectedLang: version, loading: true });
    lookup(entry.ref).then(({ verse, lang }) => {
      if (seq !== cardSeqRef.current) return; // a newer tap replaced this card
      setCard((c) => (c && c.ref === entry.ref ? { ...c, verse, text: verse?.text || '', detectedLang: lang, loading: false } : c));
    });
  };

  const challengeEntry = (entry) => {
    if (!entry || !onChallenge) return;
    cardSeqRef.current += 1;
    setCard(null);
    lookup(entry.ref).then(({ verse, lang }) => { if (verse) onChallenge({ ref: entry.ref, verse, lang, setId: entry.setId }); });
  };

  const jumpToQuery = () => {
    const e = findGardenCell(fields.entries, query, refKey);
    if (!e) { setSearchMiss(true); return; }
    setSearchMiss(false);
    switchView('field');
    setFieldIndex(fieldOfGridIndex(e.gridIndex));
    setHighlight({ ref: e.ref, nonce: `j${++jumpSeqRef.current}` });
  };

  // Cell taps: touch/pen open the card at once; a mouse click waits 250 ms so
  // a double-click can cancel it and jump straight to the challenge.
  const onCellClick = (entry) => {
    if (!entry) return;
    if (swipedRef.current) return; // click synthesised after a swipe
    if (pointerTypeRef.current === 'mouse') {
      if (clickTimerRef.current) { clearTimeout(clickTimerRef.current); clickTimerRef.current = null; return; }
      clickTimerRef.current = setTimeout(() => { clickTimerRef.current = null; openCell(entry); }, 250);
    } else {
      openCell(entry);
    }
  };
  const onCellDoubleClick = (entry) => {
    if (clickTimerRef.current) { clearTimeout(clickTimerRef.current); clickTimerRef.current = null; }
    if (entry && pointerTypeRef.current === 'mouse') challengeEntry(entry);
  };

  const onTouchStart = (e) => {
    const p = e.touches[0];
    touchStartRef.current = p ? { x: p.clientX, y: p.clientY, at: e.timeStamp } : null;
  };
  const onTouchEnd = (e) => {
    const s = touchStartRef.current;
    touchStartRef.current = null;
    const p = e.changedTouches[0];
    if (!s || !p || e.timeStamp - s.at > 800) return;
    const dir = swipeDirection(p.clientX - s.x, p.clientY - s.y);
    if (!dir) return;
    swipedRef.current = true;
    setTimeout(() => { swipedRef.current = false; }, 300);
    gotoField(safeFieldIndex + (dir === 'left' ? 1 : -1));
  };
  const onKeyDown = (e) => {
    if (e.key === 'ArrowLeft') { e.preventDefault(); gotoField(safeFieldIndex - 1); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); gotoField(safeFieldIndex + 1); }
  };

  const fieldLabel = (i) => `${t('田地', 'Field')} ${i + 1}`;
  const first = safeFieldIndex * CELLS_PER_FIELD;
  const isOwn = variant === 'own';

  return (
    <div id={`${idPrefix}-view`}>
      {showStats && (
        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
          <div style={{ padding: '0.5rem 1rem', background: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0', color: '#0f172a', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Sprout size={18} /> {t('種植', 'Planted')}: <strong>{fields.treeCount}</strong>
          </div>
          <div style={{ padding: '0.5rem 1rem', background: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0', color: '#4c1d95', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <TreePine size={18} /> {t('大樹', 'Full Trees')}: <strong>{fields.fullTreeCount}</strong>
          </div>
          <div style={{ padding: '0.5rem 1rem', background: '#fef3c7', borderRadius: '8px', border: '1px solid #fde68a', color: '#7f1d1d', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Apple size={18} /> {t('果子', 'Fruits')}: <strong>{fields.fruitCount}</strong>
          </div>
        </div>
      )}

      {/* Toolbar: view switch + search */}
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '0.8rem' }}>
        <div role="tablist" aria-label={t('檢視模式', 'View mode')} style={{ display: 'inline-flex', border: '1px solid #cbd5e1', borderRadius: '8px', overflow: 'hidden', background: '#fff' }}>
          <button type="button" role="tab" aria-selected={viewMode === 'field'} onClick={() => switchView('field')} style={{ padding: '6px 12px', border: 'none', background: viewMode === 'field' ? '#0f766e' : 'transparent', color: viewMode === 'field' ? '#fff' : '#475569', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <LayoutGrid size={15} /> {t('田地', 'Fields')}
          </button>
          <button type="button" role="tab" aria-selected={viewMode === 'list'} onClick={() => switchView('list')} style={{ padding: '6px 12px', border: 'none', background: viewMode === 'list' ? '#0f766e' : 'transparent', color: viewMode === 'list' ? '#fff' : '#475569', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <List size={15} /> {t('清單', 'List')}
          </button>
        </div>
        <form
          onSubmit={(e) => { e.preventDefault(); if (viewMode === 'field') jumpToQuery(); }}
          style={{ display: 'flex', gap: '6px', alignItems: 'center', flex: 1, minWidth: '200px' }}
        >
          <div style={{ position: 'relative', flex: 1, minWidth: 0 }}>
            <Search size={15} style={{ position: 'absolute', left: '9px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }} />
            <input
              type="search"
              value={query}
              onChange={(e) => { setQuery(e.target.value); setSearchMiss(false); setListLimit(LIST_PAGE); }}
              placeholder={viewMode === 'field' ? t('輸入出處，跳到那一格（例：約 3:16）', 'Jump to a verse (e.g. John 3:16)') : t('搜尋出處', 'Search reference')}
              aria-label={t('搜尋出處', 'Search reference')}
              style={{ width: '100%', boxSizing: 'border-box', padding: '7px 10px 7px 30px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.9rem', background: '#fff' }}
            />
          </div>
          {viewMode === 'field' && (
            <button type="submit" disabled={!query.trim()} style={{ padding: '7px 12px', borderRadius: '8px', border: 'none', background: query.trim() ? '#0f766e' : '#cbd5e1', color: '#fff', fontWeight: 'bold', cursor: query.trim() ? 'pointer' : 'default', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
              {t('跳到', 'Go')}
            </button>
          )}
        </form>
        {searchMiss && viewMode === 'field' && (
          <span style={{ fontSize: '0.8rem', color: '#dc2626', width: '100%' }}>{t('園子裡找不到這節經文', 'That verse is not in this garden')}</span>
        )}
      </div>

      {viewMode === 'field' ? (
        <>
          {/* Field tabs + arrows */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
            <button type="button" aria-label={t('上一塊田地', 'Previous field')} disabled={safeFieldIndex <= 0} onClick={() => gotoField(safeFieldIndex - 1)} style={{ width: '32px', height: '32px', flexShrink: 0, borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff', color: safeFieldIndex <= 0 ? '#cbd5e1' : '#334155', cursor: safeFieldIndex <= 0 ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ChevronLeft size={18} /></button>
            <div role="tablist" aria-label={t('田地', 'Fields')} style={{ display: 'flex', gap: '6px', overflowX: 'auto', flex: 1, padding: '2px', scrollbarWidth: 'thin' }}>
              {fields.perField.map((f) => (
                <button key={f.index} type="button" role="tab" aria-selected={f.index === safeFieldIndex} data-field={f.index} onClick={() => gotoField(f.index)} style={chipStyle(f.index === safeFieldIndex)}>
                  {fieldLabel(f.index)} <span style={{ opacity: 0.8, fontWeight: 'normal' }}>({f.trees})</span>
                </button>
              ))}
            </div>
            <button type="button" aria-label={t('下一塊田地', 'Next field')} disabled={safeFieldIndex >= fields.fieldCount - 1} onClick={() => gotoField(safeFieldIndex + 1)} style={{ width: '32px', height: '32px', flexShrink: 0, borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff', color: safeFieldIndex >= fields.fieldCount - 1 ? '#cbd5e1' : '#334155', cursor: safeFieldIndex >= fields.fieldCount - 1 ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ChevronRight size={18} /></button>
          </div>

          {/* One field */}
          <div
            id={`${idPrefix}-field`}
            tabIndex={0}
            onKeyDown={onKeyDown}
            onPointerDown={(e) => { pointerTypeRef.current = e.pointerType || 'mouse'; }}
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
            // On phones every pixel of width is a bigger cell: thinner frame, and
            // `bleed` lets the field spill over the owner's card padding.
            style={{ background: theme.envBg, borderRadius: '12px', border: `${isNarrow ? 3 : 4}px solid #334155`, padding: isNarrow ? '8px 6px' : '14px 10px', marginLeft: bleed ? `calc(-1 * ${bleed})` : 0, marginRight: bleed ? `calc(-1 * ${bleed})` : 0, boxShadow: 'inset 0 10px 30px rgba(0,0,0,0.1)', touchAction: 'pan-y', outline: 'none' }}
          >
            <div
              key={safeFieldIndex}
              className="garden-field-enter"
              style={{ display: 'grid', gridTemplateColumns: 'repeat(10, minmax(0, 1fr))', gap: '2px', width: '100%', maxWidth: '560px', margin: '0 auto', background: theme.fieldBg, border: '2px solid rgba(255,255,255,0.2)', borderRadius: '8px', padding: isNarrow ? '3px' : '4px', boxSizing: 'border-box' }}
            >
              {Array.from({ length: CELLS_PER_FIELD }).map((_, i) => {
                const gi = first + i;
                const entry = fields.gridMap[gi];
                const isFlash = !!(entry && highlight && highlight.ref === entry.ref);
                return (
                  <div
                    key={isFlash ? `${gi}:${highlight.nonce}` : gi}
                    className={'garden-cell' + (entry ? ' garden-cell--planted' : '') + (isFlash ? ' garden-cell--flash' : '')}
                    data-ref={entry ? entry.ref : undefined}
                    title={entry ? `${refLabel(entry.ref, t)} — ${t(...stageLabelPair(entry.stage))}${entry.fruits ? ` 🍎×${entry.fruits}` : ''}` : t('空地', 'Empty')}
                    onClick={() => onCellClick(entry)}
                    onDoubleClick={() => onCellDoubleClick(entry)}
                    style={{
                      aspectRatio: '1 / 1', minWidth: 0, position: 'relative', borderRadius: '4px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: entry ? stageBg(entry.stage) : '#5d4037',
                      border: entry ? '1px solid rgba(0,0,0,0.1)' : 'none',
                      cursor: entry ? 'pointer' : 'default', userSelect: 'none', WebkitTapHighlightColor: 'transparent',
                      transition: 'transform 0.1s, filter 0.2s',
                    }}
                  >
                    {entry && <GardenSprite stage={entry.stage} fruits={entry.fruits} />}
                  </div>
                );
              })}
            </div>
          </div>
          <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem', textAlign: 'center' }}>
            <Smartphone size={15} /> {isOwn
              ? t('點一下格子查看經文並挑戰；左右滑動或用箭頭切換田地', 'Tap a cell to read and challenge; swipe or use the arrows to change fields')
              : t('點一下格子查看經文並挑戰；左右滑動切換田地', 'Tap a cell to read and challenge; swipe to change fields')}
          </p>
        </>
      ) : (
        <>
          {/* List controls */}
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '8px' }}>
            {[['all', t('全部', 'All')], ['growing', t('未通過', 'Growing')], ['full', t('大樹', 'Full trees')], ['fruited', t('有果子', 'Fruited')]].map(([id, label]) => (
              <button key={id} type="button" onClick={() => { setFilter(id); setListLimit(LIST_PAGE); }} style={chipStyle(filter === id)}>{label}</button>
            ))}
            <label style={{ marginLeft: 'auto', fontSize: '0.8rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
              {t('排序', 'Sort')}
              <select value={sort} onChange={(e) => setSort(e.target.value)} style={{ padding: '4px 6px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8rem', background: '#fff' }}>
                <option value="planted">{t('種植順序', 'Planting order')}</option>
                <option value="ref">{t('出處', 'Reference')}</option>
                <option value="stage">{t('階段', 'Stage')}</option>
              </select>
            </label>
          </div>
          {listRows.length === 0 ? (
            <div style={{ padding: '1.5rem', background: '#fff', border: '1px dashed #cbd5e1', borderRadius: '8px', color: '#94a3b8', textAlign: 'center', fontSize: '0.9rem' }}>
              {fields.treeCount === 0 ? t('園子還是空的，去玩一節經文吧！', 'The garden is empty — go play a verse!') : t('沒有符合的經文', 'No matching verses')}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {listRows.slice(0, listLimit).map((entry) => (
                <button
                  key={entry.gridIndex}
                  type="button"
                  data-ref={entry.ref}
                  onClick={() => openCell(entry)}
                  style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', textAlign: 'left', padding: '8px 12px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', cursor: 'pointer', fontSize: '0.9rem', color: '#334155' }}
                >
                  <span style={{ width: '14px', height: '14px', borderRadius: '4px', background: stageBg(entry.stage), border: '1px solid rgba(0,0,0,0.1)', flexShrink: 0 }} />
                  <span style={{ fontWeight: 'bold', color: isBlankRef(entry.ref) ? '#94a3b8' : '#166534', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{refLabel(entry.ref, t)}</span>
                  <span style={{ fontSize: '0.75rem', color: '#166534', background: '#dcfce7', padding: '2px 8px', borderRadius: '10px', whiteSpace: 'nowrap' }}>{t(...stageLabelPair(entry.stage))}</span>
                  {entry.fruits > 0 && <span style={{ fontSize: '0.8rem', color: '#b91c1c', display: 'inline-flex', alignItems: 'center', gap: '2px', whiteSpace: 'nowrap' }}><Apple size={13} /> {entry.fruits}</span>}
                  <span style={{ fontSize: '0.72rem', color: '#94a3b8', whiteSpace: 'nowrap' }}>{fieldLabel(fieldOfGridIndex(entry.gridIndex))} · #{(entry.gridIndex % CELLS_PER_FIELD) + 1}</span>
                </button>
              ))}
              {listRows.length > listLimit && (
                <button type="button" onClick={() => setListLimit((n) => n + LIST_PAGE)} style={{ padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f8fafc', color: '#334155', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem' }}>
                  {t('顯示更多', 'Show more')} ({listRows.length - listLimit})
                </button>
              )}
            </div>
          )}
        </>
      )}

      {showLegend && (
        <div style={{ marginTop: '1.5rem', display: 'flex', flexWrap: 'wrap', gap: '1.5rem', fontSize: '0.9rem', color: '#475569', alignItems: 'center' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><img src="/assets/garden/tree-seedling.png" style={{ height: '28px', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))' }} alt="seedling" /> {t('幼苗 (練習中)', 'Sprout (practicing)')}</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><img src="/assets/garden/tree-sapling.png" style={{ height: '32px', filter: 'drop-shadow(0 3px 5px rgba(0,0,0,0.2))' }} alt="sapling" /> {t('小樹 (持續成長)', 'Sapling (growing)')}</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><img src="/assets/garden/tree-mature.png" style={{ height: '36px', filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.3))' }} alt="mature tree" /> {t('大樹 (通過!)', 'Full tree (cleared!)')}</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Apple size={18} /> {t('結果子 (創新高!)', 'Fruit (new record!)')}</span>
        </div>
      )}

      <GardenVerseCard
        card={card}
        t={t}
        version={version}
        isNarrow={isNarrow}
        onClose={() => { cardSeqRef.current += 1; setCard(null); }}
        onChallenge={(c) => { setCard(null); if (onChallenge && c.verse) onChallenge({ ref: c.ref, verse: c.verse, lang: c.detectedLang, setId: c.setId }); }}
      />
    </div>
  );
}
