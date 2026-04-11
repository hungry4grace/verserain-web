import { VERSES_DB as VERSES_CUV } from './verses';
import { VERSES_DB_KJV as VERSES_KJV } from './verses_kjv';

export const getRandomFakePhrase = (version) => {
    const allVerses = version === 'kjv' ? VERSES_KJV : VERSES_CUV;
    const isEnglish = version === 'kjv';
    const regex = isEnglish ? /[,，。；：「」、;:\.\?!]/ : /[\s,，。；：「」、;:\.\?!！？『』《》]/;
    
    const randomVerse = allVerses[Math.floor(Math.random() * allVerses.length)];
    const phrases = randomVerse.text.split(regex).map(p => p.trim()).filter(Boolean);
    return phrases[Math.floor(Math.random() * phrases.length)] || "阿門";
};
