export const loadLanguageSets = async (lang) => {
  switch (lang) {
    case 'cuv': {
      const [m, p] = await Promise.all([import('./verses'), import('./verses_proverbs')]);
      const sets = [...p.VERSE_SETS_PROVERBS_ZH, ...m.VERSE_SETS];
      return { sets, verses: sets.flatMap(s => s.verses) };
    }
    case 'kjv': {
      const [m, p] = await Promise.all([import('./verses_kjv'), import('./verses_proverbs')]);
      const sets = [...p.VERSE_SETS_PROVERBS_KJV, ...m.VERSE_SETS_KJV];
      return { sets, verses: sets.flatMap(s => s.verses) };
    }
    case 'ja': {
      const [m, p] = await Promise.all([import('./verses_ja'), import('./verses_proverbs')]);
      const sets = [...p.VERSE_SETS_PROVERBS_JA, ...m.VERSE_SETS_JA];
      return { sets, verses: sets.flatMap(s => s.verses) };
    }
    case 'ko': {
      const [m, p] = await Promise.all([import('./verses_ko'), import('./verses_proverbs')]);
      const sets = [...p.VERSE_SETS_PROVERBS_KO, ...m.VERSE_SETS_KO];
      return { sets, verses: sets.flatMap(s => s.verses) };
    }
    case 'fa': {
      const m = await import('./verses_fa');
      return { sets: m.VERSE_SETS_FA, verses: m.VERSE_SETS_FA.flatMap(s => s.verses) };
    }
    case 'he': {
      const m = await import('./verses_he');
      return { sets: m.VERSE_SETS_HE, verses: m.VERSE_SETS_HE.flatMap(s => s.verses) };
    }
    case 'es': {
      const m = await import('./verses_es');
      return { sets: m.VERSE_SETS_ES, verses: m.VERSE_SETS_ES.flatMap(s => s.verses) };
    }
    case 'tr': {
      const m = await import('./verses_tr');
      return { sets: m.VERSE_SETS_TR, verses: m.VERSE_SETS_TR.flatMap(s => s.verses) };
    }
    case 'de': {
      const m = await import('./verses_de');
      return { sets: m.VERSE_SETS_DE, verses: m.VERSE_SETS_DE.flatMap(s => s.verses) };
    }
    case 'cuvs': {
      const [m, p] = await Promise.all([import('./verses_cuvs'), import('./verses_proverbs_cuvs')]);
      const sets = [...p.VERSE_SETS_PROVERBS_CUVS, ...m.VERSE_SETS_CUVS];
      return { sets, verses: sets.flatMap(s => s.verses) };
    }
    case 'my': {
      const m = await import('./verses_my');
      return { sets: m.VERSE_SETS_MY, verses: m.VERSE_SETS_MY.flatMap(s => s.verses) };
    }
    default:
      return { sets: [], verses: [] };
  }
};
