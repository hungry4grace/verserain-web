// Which bottom-bar tab (BottomNav.jsx) each route / mainTab belongs to.
export const NAV_TABS = ['today', 'sets', 'garden', 'play', 'map', 'me'];

const TAB_OF_ROUTE = {
  lobby: 'today', daily_verse: 'today',
  versesets: 'sets', custom_verses: 'sets', search: 'sets',
  garden: 'garden',
  multiplayer: 'play', leaderboard: 'play', contests: 'play',
  map: 'map',
  advanced: 'me', manual: 'me', about: 'me', sponsors: 'me', donate: 'me', charity: 'me',
  sponsor: 'me', merchant: 'me', verify: 'me', rewards_admin: 'me', bilingual_rain: 'me', settings: 'me',
};

export function navTabOf(mainTab) {
  return TAB_OF_ROUTE[mainTab] || 'today';
}
