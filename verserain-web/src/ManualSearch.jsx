// ManualSearch — search box and contents list for the user guide (UI/UX 第 3
// 階段). It works on the guide as rendered: every <h2> starts a section and
// every <h3> a sub-section, so the guide itself stays plain JSX. Typing hides
// the sections (and, inside a long section, the sub-sections) that don't
// mention the words, and marks the matches where the browser supports
// CSS highlights.
import { useEffect, useState } from 'react';
import { Search, X } from 'lucide-react';

const HIDE = 'manual-hide';
const HIGHLIGHT = 'manual-search';

function readSections(body) {
  const sections = [];
  let sec = null;
  let sub = null;
  for (const el of body.children) {
    if (el.tagName === 'H2') { sec = { head: el, intro: [], subs: [] }; sections.push(sec); sub = null; continue; }
    if (!sec) continue;
    if (el.tagName === 'H3') { sub = { head: el, els: [] }; sec.subs.push(sub); continue; }
    (sub ? sub.els : sec.intro).push(el);
  }
  return sections;
}

const setShown = (el, shown) => el.classList.toggle(HIDE, !shown);

function highlight(body, q) {
  if (typeof CSS === 'undefined' || !CSS.highlights || typeof Highlight !== 'function') return;
  CSS.highlights.delete(HIGHLIGHT);
  if (!q) return;
  const ranges = [];
  const walker = document.createTreeWalker(body, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (node.parentElement?.closest(`.${HIDE}`)) continue;
    const text = node.data.toLowerCase();
    for (let i = text.indexOf(q); i !== -1; i = text.indexOf(q, i + q.length)) {
      const r = new Range();
      r.setStart(node, i);
      r.setEnd(node, i + q.length);
      ranges.push(r);
    }
  }
  if (ranges.length) CSS.highlights.set(HIGHLIGHT, new Highlight(...ranges));
}

export default function ManualSearch({ t, bodyRef, lang, onJump }) {
  const [query, setQuery] = useState('');
  const [toc, setToc] = useState([]);
  const [found, setFound] = useState(null);
  const q = query.trim().toLowerCase();

  useEffect(() => {
    const body = bodyRef.current;
    if (!body) return undefined;
    const sections = readSections(body);
    sections.forEach((s, i) => { if (!s.head.id) s.head.id = `manual-sec-${i + 1}`; });
    setToc(sections.map(s => ({ id: s.head.id, title: s.head.textContent.trim() })));

    let shownSections = 0;
    const has = (el) => el.textContent.toLowerCase().includes(q);
    for (const s of sections) {
      const all = [s.head, ...s.intro, ...s.subs.flatMap(x => [x.head, ...x.els])];
      if (!q || has(s.head)) {
        all.forEach(el => setShown(el, true));
        if (q) shownSections++;
        continue;
      }
      const introHit = s.intro.some(has);
      const subHits = s.subs.map(x => has(x.head) || x.els.some(has));
      const any = introHit || subHits.some(Boolean);
      setShown(s.head, any);
      s.intro.forEach(el => setShown(el, introHit));
      s.subs.forEach((x, i) => [x.head, ...x.els].forEach(el => setShown(el, subHits[i])));
      if (any) shownSections++;
    }
    setFound(q ? shownSections : null);
    highlight(body, q);
    return () => highlight(body, '');
  }, [q, lang, bodyRef]);

  return (
    <div data-testid="manual-search" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', marginBottom: 'var(--space-5)' }}>
      <div style={{ position: 'relative' }}>
        <Search size={20} aria-hidden="true" style={{ position: 'absolute', insetInlineStart: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-2)' }} />
        <input
          type="search"
          className="manual-search-input"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label={t('搜尋使用說明', 'Search the guide')}
          placeholder={t('搜尋，例如：點數、錄音、翻譯', 'Search, e.g. points, recording, translate')}
          data-testid="manual-search-input"
          style={{ width: '100%', minHeight: 'var(--tap-min)', padding: '0 44px', borderRadius: 'var(--radius-pill)', border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text)', fontSize: 'var(--fs-body)', boxSizing: 'border-box' }}
        />
        {query && (
          <button type="button" onClick={() => setQuery('')} aria-label={t('清除', 'Clear')} style={{ position: 'absolute', insetInlineEnd: 4, top: '50%', transform: 'translateY(-50%)', width: 40, height: 40, border: 'none', background: 'transparent', color: 'var(--color-text-2)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={20} />
          </button>
        )}
      </div>

      {found !== null ? (
        <p role="status" data-testid="manual-search-status" style={{ margin: 0, color: 'var(--color-text-2)', fontSize: 'var(--fs-small)' }}>
          {found > 0
            ? t('找到 {n} 段相關說明', 'Sections found: {n}').replace('{n}', String(found))
            : t('找不到「{q}」，換個字試試。', 'Nothing found for “{q}”. Try another word.').replace('{q}', query.trim())}
        </p>
      ) : toc.length > 0 && (
        <nav aria-label={t('目錄', 'Contents')} style={{ background: 'var(--color-surface-2)', borderRadius: 'var(--radius-md)', padding: 'var(--space-3) var(--space-4)' }}>
          <div style={{ fontWeight: 700, fontSize: 'var(--fs-small)', color: 'var(--color-text-2)', marginBottom: 'var(--space-1)' }}>{t('目錄', 'Contents')}</div>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 2 }}>
            {toc.map(item => (
              <li key={item.id}>
                <button type="button" onClick={() => onJump(document.getElementById(item.id))} style={{ width: '100%', minHeight: 40, textAlign: 'start', background: 'transparent', border: 'none', padding: '0 var(--space-1)', color: 'var(--color-primary-strong)', fontWeight: 600, fontSize: 'var(--fs-body)', cursor: 'pointer', fontFamily: 'inherit' }}>
                  {item.title}
                </button>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </div>
  );
}
