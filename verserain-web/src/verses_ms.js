// Bahasa Melayu (Malay) built-in verse sets.
//
// IMPORTANT: No free public API exists for the most-used Malay Bible
// translations (AVB / TMV Alkitab Berita Baik). For now the secondary-
// language lookup and Topic: set conversion both reuse the Indonesian
// Terjemahan Baru (TB) text — Malay and Indonesian are ~80% mutually
// intelligible. When a Malay Bible API becomes available, swap the
// 'ms' entry in BOLLS_TRANSLATIONS and re-publish Topic sets.
//
// Topic: themed sets ("Covenant", "heal", "mercy", etc.) are published
// to PartyKit at runtime and loaded via publishedVerseSets — they are
// NOT stored in this file.
export const VERSE_SETS_MS = [];
