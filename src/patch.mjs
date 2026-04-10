import fs from 'fs';
let orig = fs.readFileSync('verses.js', 'utf8');

let sidrothJson = fs.readFileSync('sidroth.json', 'utf8');

// Replace export const VERSES_DB = [ ... ]; with the new VERSE_SETS structure
let arrayContent = orig.substring(orig.indexOf('[') + 1, orig.lastIndexOf(']'));

let newContent = `
import { 
  PSALMS_1_41, 
  PSALMS_42_72, 
  PSALMS_73_89, 
  PSALMS_90_106, 
  PSALMS_107_150 
} from './verses_psalms';

export const VERSE_SETS = [
    {
        id: "mutualized-economics",
        title: "互惠經濟 重要經文",
        description: "關於上帝的形像與管家職分、禧年與重置機制等核心原則。",
        verses: [
            ${arrayContent.trim()}
        ]
    },
    {
        id: "sid-roth-healing",
        title: "醫治的默想經文",
        description: "Sid Roth：我發現醫治和信心對很多的基督徒來說就像奧秘一般。雖然有許多的書在討論這個主題，但它們仍然是教許多人困惑。我在40年前，開始我自己的研經。我發現最好的就是我自己研讀整本的聖經...",
        verses: ${sidrothJson}
    },
    PSALMS_1_41,
    PSALMS_42_72,
    PSALMS_73_89,
    PSALMS_90_106,
    PSALMS_107_150
];

// Fallback for backwards compatibility if needed somewhere
export const VERSES_DB = VERSE_SETS[0].verses;
`;

fs.writeFileSync('verses.js', newContent);
console.log('patched');
