// Raindrop layout and font levels for the rain players — moved out of App.jsx (UI/UX 第 4 階段).

export const DAILY_RAIN_DROPS = Array.from({ length: 58 }, (_, index) => {
  const wave = Math.sin((index + 3) * 12.9898) * 43758.5453;
  const rand = wave - Math.floor(wave);
  const wave2 = Math.sin((index + 11) * 78.233) * 24634.6345;
  const rand2 = wave2 - Math.floor(wave2);
  const depth = index % 7 === 0 ? 3 : index % 3 === 0 ? 2 : 1;
  const length = depth === 3 ? 18 + rand * 18 : depth === 2 ? 10 + rand * 10 : 5 + rand * 6;
  const width = depth === 3 ? 1.9 + rand2 * 1.2 : depth === 2 ? 1.2 + rand2 * 0.8 : 0.7 + rand2 * 0.5;
  const duration = depth === 3 ? 0.82 + rand * 0.34 : depth === 2 ? 1.18 + rand * 0.42 : 1.75 + rand * 0.9;
  return {
    left: `${(rand * 94 + (index * 7.3) % 6).toFixed(2)}%`,
    top: `${(-28 - rand2 * 95).toFixed(2)}%`,
    length: `${length.toFixed(1)}px`,
    width: `${width.toFixed(2)}px`,
    opacity: (depth === 3 ? 0.42 + rand * 0.28 : depth === 2 ? 0.28 + rand * 0.22 : 0.16 + rand * 0.18).toFixed(2),
    duration: `${duration.toFixed(2)}s`,
    delay: `${(-(rand * 2.8 + index * 0.035)).toFixed(2)}s`,
    drift: `${(depth === 3 ? 14 + rand2 * 18 : depth === 2 ? 8 + rand2 * 12 : 4 + rand2 * 8).toFixed(1)}px`,
    blur: `${(depth === 1 ? 0.4 + rand * 0.8 : depth === 2 ? 0.1 + rand * 0.35 : 0).toFixed(2)}px`,
    depth
  };
});

export const RAIN_FONT_LEVELS = ['small', 'normal', 'large', 'xlarge'];
