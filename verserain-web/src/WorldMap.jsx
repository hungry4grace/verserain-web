import { useEffect, useRef, useState } from 'react';

// Same deterministic room color as in App.jsx
const ROOM_COLORS = ['#ef4444','#f97316','#eab308','#22c55e','#14b8a6','#0ea5e9','#8b5cf6','#ec4899','#06b6d4','#84cc16'];
function getRoomColor(roomId) {
  if (!roomId) return null;
  let hash = 0;
  for (const c of roomId) hash = (hash * 31 + c.charCodeAt(0)) % ROOM_COLORS.length;
  return ROOM_COLORS[hash];
}

// Leaflet CSS injected dynamically
function injectLeafletCSS() {
  if (document.getElementById('leaflet-css')) return;
  const link = document.createElement('link');
  link.id = 'leaflet-css';
  link.rel = 'stylesheet';
  link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
  document.head.appendChild(link);
}

export default function WorldMap({ t, playerName }) {
  const mapRef = useRef(null);
  const leafletMapRef = useRef(null);
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [error, setError] = useState(null);

  // Fetch player map data + auto-refresh every 30s
  useEffect(() => {
    const load = () => {
      fetch('/api/get-player-map')
        .then(r => r.json())
        .then(data => { if (Array.isArray(data)) setPlayers(data); else setPlayers([]); setLoading(false); })
        .catch(() => { setError('Failed to load map data'); setLoading(false); });
    };
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, []);

  // Init Leaflet map
  useEffect(() => {
    if (loading || !mapRef.current) return;

    injectLeafletCSS();

    // Dynamic import of Leaflet
    import('https://unpkg.com/leaflet@1.9.4/dist/leaflet-src.esm.js')
      .then(L => {
        if (leafletMapRef.current) {
          leafletMapRef.current.remove();
        }

        const map = L.map(mapRef.current, {
          center: [20, 105],
          zoom: 3,
          minZoom: 2,
          maxZoom: 10,
          zoomControl: true,
          attributionControl: true,
        });

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
          maxZoom: 19
        }).addTo(map);

        leafletMapRef.current = map;

        // Group players by nearby location (simple clustering)
        const clusters = {};
        players.forEach(p => {
          const key = `${Math.round(p.lat * 2) / 2},${Math.round(p.lng * 2) / 2}`;
          if (!clusters[key]) clusters[key] = [];
          clusters[key].push(p);
        });

        Object.entries(clusters).forEach(([key, group]) => {
          const avgLat = group.reduce((s, p) => s + p.lat, 0) / group.length;
          const avgLng = group.reduce((s, p) => s + p.lng, 0) / group.length;
          const count = group.length;
          const isCurrentUser = group.some(p => p.name === playerName);

          // Determine dominant color: room color if any player in group is in a room, else dark
          // If current user is here + in a room, prioritize their room color
          const currentUserPlayer = group.find(p => p.name === playerName);
          const anyRoomId = currentUserPlayer?.roomId || group.find(p => p.roomId)?.roomId || null;
          const roomColor = getRoomColor(anyRoomId);

          const bgColor = roomColor || (isCurrentUser ? '#f59e0b' : '#1e293b');
          const borderColor = roomColor ? roomColor : (isCurrentUser ? '#fbbf24' : '#475569');
          const size = count === 1 ? 32 : Math.min(52, 32 + count * 3);
          const glowStyle = roomColor ? `box-shadow: 0 0 0 3px ${roomColor}55, 0 0 16px ${roomColor}88;` : 'box-shadow: 0 2px 8px rgba(0,0,0,0.4);';

          const icon = L.divIcon({
            className: '',
            html: `<div style="
              width:${size}px; height:${size}px;
              background:${bgColor};
              border:3px solid ${borderColor};
              border-radius:50%;
              display:flex; align-items:center; justify-content:center;
              color:white; font-weight:bold; font-size:${count > 9 ? '11px' : '13px'};
              ${glowStyle}
              cursor:pointer;
            ">${count > 1 ? count : (isCurrentUser ? '★' : '●')}</div>`,
            iconSize: [size, size],
            iconAnchor: [size / 2, size / 2],
          });

          const marker = L.marker([avgLat, avgLng], { icon });

          // Build popup HTML
          const sortedGroup = [...group].sort((a, b) => b.score - a.score);

          // Group by rooms within this cluster for display
          const roomGroups = {};
          sortedGroup.forEach(p => {
            const rid = p.roomId || '__solo__';
            if (!roomGroups[rid]) roomGroups[rid] = [];
            roomGroups[rid].push(p);
          });

          const roomBadge = anyRoomId
            ? `<div style="display:inline-block; background:${roomColor}22; color:${roomColor}; border:1px solid ${roomColor}; border-radius:99px; padding:2px 10px; font-size:0.78rem; font-weight:bold; margin-bottom:8px;">⚔️ 房間 ${anyRoomId}</div>`
            : '';

          const popup = L.popup({ maxWidth: 280, className: 'verse-map-popup' }).setContent(`
            <div style="font-family: system-ui, sans-serif; min-width: 210px;">
              <div style="font-weight:bold; color:#0f172a; margin-bottom:6px; font-size:0.95rem;">
                📍 ${group[0].city ? `${group[0].city}, ` : ''}${group[0].country || 'Unknown'}
              </div>
              ${roomBadge}
              <table style="width:100%; border-collapse:collapse; font-size:0.85rem;">
                <thead>
                  <tr style="border-bottom:1px solid #e2e8f0; color:#64748b;">
                    <th style="padding:4px 6px; text-align:left;">${t('玩家', 'Player')}</th>
                    <th style="padding:4px 6px; text-align:right;">${t('最高分', 'Best')}</th>
                  </tr>
                </thead>
                <tbody>
                  ${sortedGroup.slice(0, 8).map((p, i) => {
                    const pRoom = getRoomColor(p.roomId);
                    const dot = pRoom ? `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${pRoom};margin-right:4px;"></span>` : '';
                    return `<tr style="border-bottom:1px solid #f1f5f9; ${p.name === playerName ? 'background:#fef9c3;' : ''}">
                      <td style="padding:5px 6px; font-weight:${p.name === playerName ? 'bold' : 'normal'}; color:#1e293b;">
                        ${dot}${i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i+1}`} ${p.name}${p.name === playerName ? ' ★' : ''}
                      </td>
                      <td style="padding:5px 6px; text-align:right; font-weight:bold; color:${pRoom || '#3b82f6'};">
                        ${p.score.toLocaleString()}
                      </td>
                    </tr>`;
                  }).join('')}
                  ${sortedGroup.length > 8 ? `<tr><td colspan="2" style="padding:4px 6px; color:#94a3b8; font-size:0.8rem; text-align:center;">+${sortedGroup.length - 8} more</td></tr>` : ''}
                </tbody>
              </table>
            </div>
          `);

          marker.bindPopup(popup);
          marker.on('mouseover', function () { this.openPopup(); });
          marker.addTo(map);
        });

        // Show player count
      }).catch(err => {
        console.error('Leaflet load failed', err);
        setError('Map library failed to load');
      });

    return () => {
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
    };
  }, [loading, players, playerName]);

  return (
    <div>
      {/* Stats bar */}
      <div style={{ padding: '0.8rem 2rem', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', gap: '2rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ color: '#475569', fontSize: '0.9rem' }}>
          🌍 <strong style={{ color: '#0ea5e9' }}>{players.length}</strong> {t('位玩家遍佈全球', 'players worldwide')}
        </div>
        {(() => {
          const activeRooms = [...new Set(players.filter(p => p.roomId).map(p => p.roomId))];
          return activeRooms.length > 0 ? (
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ color: '#475569', fontSize: '0.9rem' }}>⚔️ <strong style={{ color: '#ef4444' }}>{activeRooms.length}</strong> {t('場比賽進行中', 'active rooms')}:</span>
              {activeRooms.map(rid => (
                <span key={rid} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: getRoomColor(rid) + '22', color: getRoomColor(rid), border: `1px solid ${getRoomColor(rid)}`, borderRadius: '99px', padding: '1px 8px', fontSize: '0.78rem', fontWeight: 'bold' }}>
                  <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: getRoomColor(rid), display: 'inline-block' }}></span>
                  {rid} ({players.filter(p => p.roomId === rid).length}人)
                </span>
              ))}
            </div>
          ) : null;
        })()}
        {players.length > 0 && (
          <div style={{ color: '#475569', fontSize: '0.9rem' }}>
            🏆 {t('最高分', 'Top score')}: <strong style={{ color: '#3b82f6' }}>
              {Math.max(...players.map(p => p.score)).toLocaleString()}
            </strong>
            {' '}({players.reduce((best, p) => p.score > (best?.score || 0) ? p : best, null)?.name})
          </div>
        )}
        <button
          onClick={() => {
            setLoading(true);
            fetch('/api/get-player-map').then(r => r.json()).then(data => {
              setPlayers(Array.isArray(data) ? data : []);
              setLoading(false);
            }).catch(() => setLoading(false));
          }}
          style={{ marginLeft: 'auto', background: '#0ea5e9', color: 'white', border: 'none', padding: '0.3rem 0.8rem', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.8rem' }}
        >
          🔄 {t('重新整理', 'Refresh')}
        </button>
      </div>

      {/* Map container */}
      {loading ? (
        <div style={{ height: '500px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '1.1rem', background: '#f8fafc' }}>
          ⏳ {t('載入地圖中...', 'Loading map...')}
        </div>
      ) : error ? (
        <div style={{ height: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444' }}>
          ⚠️ {error}
        </div>
      ) : (
        <div>
          <div ref={mapRef} style={{ height: '520px', width: '100%', background: '#e0f2fe' }} />
          {players.length === 0 && (
            <div style={{ position: 'relative', top: '-260px', textAlign: 'center', color: '#94a3b8', pointerEvents: 'none', fontSize: '1rem' }}>
              {t('還沒有玩家資料，完成一局遊戲後你的位置就會出現！', 'No players yet — complete a game to appear on the map!')}
            </div>
          )}
        </div>
      )}

      <style>{`
        .verse-map-popup .leaflet-popup-content-wrapper {
          border-radius: 10px;
          box-shadow: 0 8px 24px rgba(0,0,0,0.2);
          border: 1px solid #e2e8f0;
        }
        .verse-map-popup .leaflet-popup-tip { background: white; }
      `}</style>
    </div>
  );
}
