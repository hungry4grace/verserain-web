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

  const markersGroupRef = useRef(null);

  // Init Leaflet map and markers
  useEffect(() => {
    if (loading || !mapRef.current) return;

    injectLeafletCSS();

    // Dynamic import of Leaflet
    import('https://unpkg.com/leaflet@1.9.4/dist/leaflet-src.esm.js')
      .then(L => {
        let map = leafletMapRef.current;
        
        // Only create the map once
        if (!map) {
          map = L.map(mapRef.current, {
            center: [20, 105],
            zoom: 3,
            minZoom: 2,
            maxZoom: 19,
            zoomControl: true,
            attributionControl: true,
          });

          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
            maxZoom: 19
          }).addTo(map);

          markersGroupRef.current = L.layerGroup().addTo(map);
          leafletMapRef.current = map;
        }

        // Clear existing markers for this update
        markersGroupRef.current.clearLayers();

        // Object to track identical locations to jitter overlapping markers
        const locationOffsets = {};

        players.forEach(p => {
          // Identify locations that are too close, using a grid string
          const key = `${p.lat.toFixed(2)},${p.lng.toFixed(2)}`;
          if (!locationOffsets[key]) locationOffsets[key] = 0;
          const offsetFactor = locationOffsets[key];
          locationOffsets[key]++;

          // Generate a small jitter to separate overlapping points visually
          const spiralAngle = offsetFactor * (Math.PI * 2.3); 
          const spiralRadius = offsetFactor > 0 ? (0.015 * Math.ceil(offsetFactor / 2)) : 0;
          const finalLat = p.lat + spiralRadius * Math.cos(spiralAngle);
          const finalLng = p.lng + spiralRadius * Math.sin(spiralAngle);

          const isCurrentUser = p.name === playerName;
          const roomColor = getRoomColor(p.roomId);
          
          const bgColor = roomColor || (isCurrentUser ? '#f59e0b' : '#1e293b');
          const borderColor = roomColor ? roomColor : (isCurrentUser ? '#fbbf24' : '#475569');
          const glowStyle = roomColor ? `box-shadow: 0 0 0 3px ${roomColor}55, 0 0 12px ${roomColor}88;` : 'box-shadow: 0 2px 6px rgba(0,0,0,0.3);';

          // Directly show the player's name as a pill-shaped marker
          const icon = L.divIcon({
            className: '',
            html: `<div style="
              display:flex; align-items:center; justify-content:center;
              background:${bgColor};
              border:2px solid ${borderColor};
              border-radius:20px;
              padding: 4px 10px;
              color:white; font-weight:bold; font-size:12px;
              ${glowStyle}
              cursor:pointer;
              white-space: nowrap;
            ">${p.name} ${isCurrentUser ? '★' : ''}</div>`,
            iconSize: null // Allows it to size itself based on contents
          });

          const marker = L.marker([finalLat, finalLng], { icon });

          // Simple popup without the scoreboard
          const roomBadge = p.roomId
            ? `<div style="margin-top:6px; font-size:0.8rem; font-weight:bold; background:${roomColor}22; color:${roomColor}; border-radius:12px; padding:2px 8px; display:inline-block;">⚔️ 房間 ${p.roomId}</div>`
            : '';

          const lastOnline = p.updatedAt ? new Date(p.updatedAt).toLocaleString() : 'Unknown';

          const popup = L.popup({ maxWidth: 220, className: 'verse-map-popup' }).setContent(`
            <div style="font-family: system-ui, sans-serif; text-align:center; min-width: 120px;">
              <div style="font-weight:bold; font-size:1.1rem; color:#1e293b; margin-bottom:4px;">${p.name}</div>
              <div style="font-size:0.85rem; color:#64748b;">📍 ${p.city ? p.city + ', ' : ''}${p.country || 'Unknown'}</div>
              ${roomBadge}
              <div style="margin-top:8px; font-size:0.75rem; color:#94a3b8;">🕒 ${t('最後上線', 'Last Online')}: ${lastOnline}</div>
            </div>
          `);

          marker.bindPopup(popup);

          // Click to zoom in by 3 levels
          marker.on('click', function () {
            const currentZoom = map.getZoom();
            const targetZoom = Math.min(currentZoom + 3, map.getMaxZoom());
            map.flyTo([finalLat, finalLng], targetZoom);
          });
          
          marker.addTo(markersGroupRef.current);
        });

      }).catch(err => {
        console.error('Leaflet load failed', err);
        setError('Map library failed to load');
      });

    return () => {
      // Don't remove the map instance on unmount/re-render to preserve view
      // We only clear markers when data updates, handled above
      // if (leafletMapRef.current) {
      //   leafletMapRef.current.remove();
      //   leafletMapRef.current = null;
      // }
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
