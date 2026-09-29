// SearchPicker — pick one item from a long list by typing (a combobox), for
// lists too long for a <select> (e.g. every verse set). Every word typed must
// appear in the item's text; ↑↓ move, Enter picks, Esc closes. Once an item is
// picked it shows as a card with a 「更換」 button.
//
//   items: [{ value, label, hint?, search? }]   search defaults to label + hint
//   value / onChange(value)                      '' means nothing picked
//   labels: { placeholder, empty, change, more } more is '… {n} …'
import { useId, useMemo, useRef, useState } from 'react';
import { Search } from 'lucide-react';
import Button from './Button.jsx';

const norm = (s) => String(s || '').toLowerCase().replace(/\s+/g, '');

export default function SearchPicker({ items, value, onChange, labels = {}, limit = 40, testId }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef(null);
  const listId = useId();
  const selected = value ? items.find((it) => it.value === value) : null;

  const matches = useMemo(() => {
    const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean).map(norm);
    if (!words.length) return items;
    return items.filter((it) => {
      const hay = norm(it.search ?? `${it.label} ${it.hint || ''}`);
      return words.every((w) => hay.includes(w));
    });
  }, [items, query]);
  const shown = matches.slice(0, limit);

  const pick = (it) => {
    onChange(it.value);
    setQuery('');
    setOpen(false);
  };
  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setActive((i) => Math.min(i + 1, shown.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter' && open && shown[active]) { e.preventDefault(); pick(shown[active]); }
    else if (e.key === 'Escape') { setOpen(false); }
  };

  if (selected) {
    return (
      <div className="ui-search-picker__picked" data-testid={testId}>
        <span className="ui-search-picker__text">
          <span className="ui-search-picker__label">{selected.label}</span>
          {selected.hint && <span className="ui-search-picker__hint">{selected.hint}</span>}
        </span>
        <Button variant="secondary" size="sm" onClick={() => { onChange(''); setTimeout(() => inputRef.current?.focus(), 0); }} data-testid={testId && `${testId}-change`}>
          {labels.change || 'Change'}
        </Button>
      </div>
    );
  }

  return (
    <div className="ui-search-picker" data-testid={testId}>
      <div className="ui-search-picker__field">
        <Search size={18} aria-hidden="true" className="ui-search-picker__icon" />
        <input
          ref={inputRef}
          type="search"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={open && shown[active] ? `${listId}-${active}` : undefined}
          placeholder={labels.placeholder}
          value={query}
          onChange={(e) => { setQuery(e.target.value); setActive(0); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          onKeyDown={onKeyDown}
          data-testid={testId && `${testId}-input`}
        />
      </div>
      {open && (
        <ul className="ui-search-picker__list" id={listId} role="listbox">
          {shown.length === 0 && <li className="ui-search-picker__empty">{labels.empty}</li>}
          {shown.map((it, i) => (
            <li
              key={it.value}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              className="ui-search-picker__option"
              onMouseDown={(e) => { e.preventDefault(); pick(it); }}
              onMouseEnter={() => setActive(i)}
            >
              <span className="ui-search-picker__label">{it.label}</span>
              {it.hint && <span className="ui-search-picker__hint">{it.hint}</span>}
            </li>
          ))}
          {matches.length > shown.length && labels.more && (
            <li className="ui-search-picker__empty">{labels.more.replace('{n}', String(matches.length - shown.length))}</li>
          )}
        </ul>
      )}
    </div>
  );
}
