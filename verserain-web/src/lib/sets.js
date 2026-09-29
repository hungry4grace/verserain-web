// Verse-set constants shared by App and the set player — moved out of App.jsx (UI/UX 第 4 階段).

// Loose verses (random / daily / search / shared single verse) have no
// originating set to file a personal recording under. They all share this one
// reserved per-user bucket — a private "single-verse collection" keyed by
// verse reference — so the 🎙️ record button is always available (once signed
// in) and a loose recording persists & replays wherever that verse reappears.
export const PERSONAL_LOOSE_SET_ID = '__personal_verses__';
