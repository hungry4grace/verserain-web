import React, { useState, useEffect, useMemo } from 'react';
import { X, Search, BookOpen } from 'lucide-react';

// SetPicker — admin picks an existing verse set for a schedule item.
// Combines two sources:
//   1) Bundled topic sets (passed in as `topicSets` from App.jsx)
//   2) Community shared sets (fetched from /custom-sets)
// Private sets are deliberately NOT exposed here — they live in one
// person's library and other team members can't load them.

const HOST = 'https://verserain-party.hungry4grace.partykit.dev/parties/main/global-auth-db';

const colors = {
  bg: '#0f172a', card: '#1e293b', cardSoft: '#334155',
  border: '#334155', text: '#f1f5f9', muted: '#94a3b8', accent: '#3b82f6',
};

export default function SetPicker({ topicSets = [], t, onPick, onCancel }) {
  const [sharedSets, setSharedSets] = useState([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${HOST}/custom-sets`)
      .then(r => r.ok ? r.json() : [])
      .then(data => {
        setSharedSets(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const allSets = useMemo(() => {
    const out = [];
    for (const s of topicSets || []) {
      const verses = Array.isArray(s.verses) ? s.verses : [];
      out.push({
        id: s.id,
        title: s.title || s.id,
        author: 'VerseRain',
        source: 'bundled',
        totalCount: verses.length,
        firstRef: verses[0] ? (verses[0].reference || verses[0].ref || '') : '',
        verses,
      });
    }
    for (const s of sharedSets || []) {
      if (out.some(x => x.id === s.id)) continue;
      const verses = Array.isArray(s.verses) ? s.verses : [];
      out.push({
        id: s.id,
        title: s.title || s.id,
        author: s.authorName || t('社群', 'Community'),
        source: 'shared',
        totalCount: verses.length,
        firstRef: verses[0] ? (verses[0].reference || verses[0].ref || '') : '',
        verses,
      });
    }
    return out.filter(s => s.totalCount > 0);
  }, [topicSets, sharedSets, t]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allSets;
    return allSets.filter(s =>
      s.title.toLowerCase().includes(q)
      || (s.firstRef && s.firstRef.toLowerCase().includes(q))
      || s.id.toLowerCase().includes(q)
    );
  }, [allSets, query]);

  return (
    <div
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
        zIndex: 10001, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
      }}
      onClick={onCancel}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: colors.card, border: `1px solid ${colors.border}`,
          borderRadius: 12, width: 'min(560px, 100%)', maxHeight: '85vh',
          overflow: 'hidden', display: 'flex', flexDirection: 'column',
        }}
      >
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0.75rem 1rem', borderBottom: `1px solid ${colors.border}`,
        }}>
          <h3 style={{ color: colors.text, margin: 0, fontSize: '1.05rem' }}>
            <BookOpen size={16} style={{ verticalAlign: 'middle', marginRight: 8 }} />
            {t('選擇經文組', 'Pick a verse set')}
          </h3>
          <button onClick={onCancel} style={{ background: 'none', border: 'none', color: colors.muted, cursor: 'pointer', padding: 4 }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: '0.75rem 1rem', borderBottom: `1px solid ${colors.border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: colors.bg, borderRadius: 8, padding: '0.4rem 0.6rem' }}>
            <Search size={16} style={{ color: colors.muted, flexShrink: 0 }} />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder={t('搜尋:詩篇、John 3、love…', 'Search: psalm, John 3, love…')}
              autoFocus
              style={{
                flex: 1, background: 'transparent', border: 'none',
                color: colors.text, fontSize: '0.9rem', outline: 'none', minWidth: 0,
              }}
            />
          </div>
          <div style={{ color: colors.muted, fontSize: '0.75rem', marginTop: 6 }}>
            {loading
              ? t('載入社群經文組中…', 'Loading community sets…')
              : t('共 {total} 組可選 · 顯示 {shown}', '{total} sets available · showing {shown}')
                  .replace('{total}', String(allSets.length))
                  .replace('{shown}', String(filtered.length))}
          </div>
        </div>

        <div style={{ overflow: 'auto', flex: 1 }}>
          {filtered.length === 0 && !loading && (
            <div style={{ color: colors.muted, textAlign: 'center', padding: '2rem 1rem' }}>
              {query
                ? t('沒有符合的經文組', 'No matching sets')
                : t('還沒有可用的經文組', 'No sets available yet')}
            </div>
          )}
          {filtered.map(s => (
            <div
              key={s.id}
              onClick={() => onPick({
                setId: s.id,
                title: s.title,
                totalCount: s.totalCount,
                source: s.source,
                // Snapshot trimmed to {reference, text} to keep schedule
                // items lean — the picker view doesn't need the rich
                // metadata (lang, authorName, etc.).
                verses: s.verses.map(v => ({
                  reference: v.reference || v.ref || '',
                  text: v.text || '',
                })),
              })}
              style={{
                padding: '0.7rem 1rem', borderBottom: `1px solid ${colors.border}`,
                cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12,
              }}
              onMouseEnter={e => e.currentTarget.style.background = colors.cardSoft}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: colors.text, fontSize: '0.95rem', fontWeight: 600 }}>{s.title}</div>
                <div style={{ color: colors.muted, fontSize: '0.78rem', marginTop: 2 }}>
                  {t('{n} 節', '{n} verses').replace('{n}', String(s.totalCount))}
                  {s.firstRef ? ` · ${s.firstRef}…` : ''}
                  {' · '}{s.author}
                </div>
              </div>
              <span style={{
                fontSize: '0.7rem',
                color: s.source === 'bundled' ? '#0ea5e9' : '#a855f7',
                border: `1px solid ${s.source === 'bundled' ? '#0ea5e9' : '#a855f7'}`,
                padding: '0.1rem 0.4rem', borderRadius: 4, whiteSpace: 'nowrap', flexShrink: 0,
              }}>
                {s.source === 'bundled' ? t('內建', 'Bundled') : t('社群', 'Community')}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
