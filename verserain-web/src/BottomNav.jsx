// BottomNav — the fixed tab bar (UI/UX 第 2 階段). Every screen of the
// app belongs to exactly one tab, so the bar never changes shape:
//   今日 · 經文組 · 園子 · 一起玩 · 地圖 · 我的
// Old routes (#lobby, #versesets, #map…) keep working — each one simply
// lights up the tab it lives under (navTabs.js).
import { Sun, Library, TreePine, Users, Map, UserRound } from 'lucide-react';

export default function BottomNav({ t, active, onSelect }) {
  const items = [
    { id: 'today', Icon: Sun, label: t('今日', 'Today') },
    { id: 'sets', Icon: Library, label: t('經文組', 'Sets') },
    { id: 'garden', Icon: TreePine, label: t('園子', 'Garden') },
    { id: 'play', Icon: Users, label: t('一起玩', 'Play') },
    { id: 'map', Icon: Map, label: t('地圖', 'Map') },
    { id: 'me', Icon: UserRound, label: t('我的', 'Me') },
  ];
  return (
    <nav className="app-bottom-nav" aria-label={t('主要分頁', 'Main tabs')} data-testid="bottom-nav">
      {items.map((item) => {
        const { id, label } = item;
        const Icon = item.Icon;
        const on = active === id;
        return (
          <button
            key={id}
            type="button"
            className="app-bottom-nav__tab"
            aria-current={on ? 'page' : undefined}
            data-tab={id}
            onClick={() => onSelect(id)}
          >
            <Icon size={24} strokeWidth={on ? 2.4 : 2} aria-hidden="true" />
            <span>{label}</span>
          </button>
        );
      })}
    </nav>
  );
}
