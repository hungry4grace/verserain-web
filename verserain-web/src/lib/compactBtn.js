// Moved out of App.jsx unchanged (UI/UX 第 4 階段).
// One compact action-button style for the dense admin / merchant / charity
// lists (it used to be copied 6 times with slightly different numbers).
// Colours stay per call; size, radius and tap height come from the tokens.
export const compactBtn = (bg, fg = '#fff', border = 'none', busy = false) => ({
  background: bg, color: fg, border,
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 4,
  minHeight: 'var(--tap-min)', padding: '0 var(--space-3)', borderRadius: 'var(--radius-sm)',
  fontSize: 'var(--fs-small)', fontWeight: 700, lineHeight: 1.2, whiteSpace: 'nowrap',
  cursor: busy ? 'wait' : 'pointer',
});
