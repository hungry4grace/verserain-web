// Spread map icons that would overlap on screen (e.g. two places geocoded to
// the same address), so each one stays tappable at any zoom.
//
// Input: screen points [{ x, y }] in pixels. Icons are `size`-px squares, so
// two icons overlap when they are closer than `size` on BOTH axes. Points that
// would overlap are grouped and laid out around the group's centre:
//   2–6 icons → evenly on a circle
//   7+ icons  → sunflower spiral (keeps the radius small for big groups)
// If a spread-out group would now cover a neighbour, the two groups merge and
// are laid out again, until nothing overlaps.
// Returns, per input point, its display position and whether it moved, plus
// the groups (centre + members) so the caller can draw leader lines back to
// the real spot.
const DIAG = Math.SQRT2;

function layoutGroup(points, members, size) {
  const n = members.length;
  const cx = members.reduce((s, k) => s + points[k].x, 0) / n;
  const cy = members.reduce((s, k) => s + points[k].y, 0) / n;
  if (n === 1) return { cx, cy, pos: [{ x: points[members[0]].x, y: points[members[0]].y, moved: false }] };
  // Centres at least size·√2 apart can never overlap as squares, whatever
  // the angle between them; +4 px leaves a small visible gap.
  const gap = size * DIAG + 4;
  const pos = members.map((_, k) => {
    let r, a;
    if (n <= 6) {
      r = gap / (2 * Math.sin(Math.PI / n));
      // Two icons sit side by side; three or more start from the top.
      a = (n === 2 ? Math.PI : -Math.PI / 2) + (2 * Math.PI * k) / n;
    } else {
      r = gap * 0.62 * Math.sqrt(k + 1);
      a = (k + 1) * 137.508 * (Math.PI / 180);
    }
    return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a), moved: true };
  });
  return { cx, cy, pos };
}

const boxesOverlap = (a, b, size) => Math.abs(a.x - b.x) < size && Math.abs(a.y - b.y) < size;

export function spreadPoints(points, { size = 30 } = {}) {
  // Start with every point in its own group, then merge any groups whose laid
  // out icons overlap; repeat until stable (each pass merges at least two
  // groups, so this ends after at most points.length passes).
  let groups = points.map((_, i) => [i]);
  let laid;
  for (let pass = 0; pass <= points.length; pass++) {
    laid = groups.map(m => layoutGroup(points, m, size));
    let merge = null;
    outer:
    for (let g = 0; g < groups.length; g++) {
      for (let h = g + 1; h < groups.length; h++) {
        for (const a of laid[g].pos) for (const b of laid[h].pos) {
          if (boxesOverlap(a, b, size)) { merge = [g, h]; break outer; }
        }
      }
    }
    if (!merge) break;
    const [g, h] = merge;
    groups[g] = groups[g].concat(groups[h]).sort((x, y) => x - y);
    groups.splice(h, 1);
  }

  const positions = new Array(points.length);
  const multi = [];
  groups.forEach((members, g) => {
    members.forEach((idx, k) => { positions[idx] = laid[g].pos[k]; });
    if (members.length > 1) multi.push({ x: laid[g].cx, y: laid[g].cy, members });
  });
  return { positions, groups: multi };
}
