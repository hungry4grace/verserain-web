import { VERSE_SETS_JA } from './src/verses_ja.js'; console.log(VERSE_SETS_JA.map((s,i) => i + ': ' + (s ? s.id : 'UNDEFINED')).join(', '));
