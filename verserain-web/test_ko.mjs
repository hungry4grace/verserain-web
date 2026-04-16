import { VERSE_SETS_KO } from './src/verses_ko.js'; console.log(VERSE_SETS_KO.map((s,i) => i + ': ' + (s ? s.id : 'UNDEFINED') + ' (' + (s?s.verses.length:0) + ')').join(', '));
