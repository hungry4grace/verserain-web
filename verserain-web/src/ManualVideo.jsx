// Moved out of App.jsx unchanged (UI/UX 第 4 階段).
import React from 'react';

// UI languages the app can render directions in. Used to validate ?lang= on
// incoming share links so a junk value can't strand someone in a half-locale.
// 操作手冊教學影片：進入視窗才播放、離開就暫停，避免手冊頁一次載入多支影片。
export function ManualVideo({ src, poster, caption }) {
  const ref = React.useRef(null);
  React.useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) el.play().catch(() => {});
      else el.pause();
    }, { threshold: 0.35 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <figure style={{ margin: '0.5rem 0 2.5rem' }}>
      <video ref={ref} src={src} poster={poster} muted loop playsInline controls preload="metadata"
        style={{ width: '100%', display: 'block', borderRadius: '10px', boxShadow: '0 6px 16px rgba(15,23,42,0.18)', background: '#0f172a' }} />
      {caption && <figcaption style={{ fontSize: '0.88rem', color: '#64748b', textAlign: 'center', marginTop: '0.5rem', lineHeight: 1.5 }}>{caption}</figcaption>}
    </figure>
  );
}
