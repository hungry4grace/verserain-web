import { useEffect, useRef, useState } from 'react';

// Same deterministic room color as in App.jsx
const ROOM_COLORS = ['#ef4444','#f97316','#eab308','#22c55e','#14b8a6','#0ea5e9','#8b5cf6','#ec4899','#06b6d4','#84cc16'];
function getRoomColor(roomId) {
  if (!roomId) return null;
  let hash = 0;
  for (const c of roomId) hash = (hash * 31 + c.charCodeAt(0)) % ROOM_COLORS.length;
  return ROOM_COLORS[hash];
}

// Load Leaflet and MarkerCluster Plugin dynamically
function loadLeafletAndCluster() {
  return new Promise((resolve, reject) => {
    if (window.L && window.L.markerClusterGroup) return resolve(window.L);
    
    if (!document.getElementById('leaflet-css')) {
      const css1 = document.createElement('link'); css1.id = 'leaflet-css'; css1.rel = 'stylesheet'; css1.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'; document.head.appendChild(css1);
      const css2 = document.createElement('link'); css2.id = 'leaflet-cluster-css'; css2.rel = 'stylesheet'; css2.href = 'https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css'; document.head.appendChild(css2);
    }

    const loadCluster = () => {
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js';
      script.onload = () => resolve(window.L);
      script.onerror = () => reject(new Error('Failed to load markercluster plugin'));
      document.head.appendChild(script);
    };

    if (!window.L) {
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.onload = () => loadCluster();
      script.onerror = () => reject(new Error('Failed to load Leaflet script'));
      document.head.appendChild(script);
    } else {
      loadCluster();
    }
  });
}

export default function WorldMap2D({ t, playerName, onJoinRoom, onToggleMode, currentMode }) {
  const mapRef = useRef(null);
  const leafletMapRef = useRef(null);
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [error, setError] = useState(null);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const selectedRoomRef = useRef(selectedRoom);
  
  useEffect(() => {
    selectedRoomRef.current = selectedRoom;
  }, [selectedRoom]);

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
  const initialFlyDone = useRef(false);
  useEffect(() => {
    if (loading || !mapRef.current) return;

    loadLeafletAndCluster()
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

          // Use MarkerClusterGroup instead of regular layerGroup
          markersGroupRef.current = L.markerClusterGroup({
            maxClusterRadius: 40,
            spiderfyOnMaxZoom: true,
            showCoverageOnHover: false,
            zoomToBoundsOnClick: true,
            iconCreateFunction: function(cluster) {
              const sr = selectedRoomRef.current;
              let bgColor = '#1e293b';
              let borderColor = '#334155';
              let opacity = 1.0;
              let filter = 'none';

              if (sr) {
                const childMarkers = cluster.getAllChildMarkers();
                const hasSelected = childMarkers.some(m => m.options.myRoomId === sr);
                if (hasSelected) {
                  const rc = getRoomColor(sr);
                  bgColor = rc;
                  borderColor = rc;
                } else {
                  opacity = 0.3;
                  filter = 'grayscale(100%)';
                }
              }

              return L.divIcon({ 
                html: `<div class="custom-cluster" style="background-color: ${bgColor}; border-color: ${borderColor}; opacity: ${opacity}; filter: ${filter};">` + cluster.getChildCount() + '</div>', 
                className: 'custom-cluster-icon', 
                iconSize: [36, 36] 
              });
            }
          }).addTo(map);

          leafletMapRef.current = map;
        }

        // Clear existing markers for this update
        markersGroupRef.current.clearLayers();

        players.forEach(p => {
          const finalLat = p.lat;
          const finalLng = p.lng;

          const isCurrentUser = p.name === playerName;
          const roomColor = getRoomColor(p.roomId);
          
          let bgColor = roomColor || (isCurrentUser ? '#f59e0b' : '#1e293b');
          let borderColor = roomColor ? roomColor : (isCurrentUser ? '#fbbf24' : '#475569');
          let glowStyle = roomColor ? `box-shadow: 0 0 0 3px ${roomColor}55, 0 0 12px ${roomColor}88;` : 'box-shadow: 0 2px 6px rgba(0,0,0,0.3);';
          let opacity = 1.0;
          let filter = 'none';

          if (selectedRoom) {
            if (p.roomId !== selectedRoom) {
               opacity = 0.3;
               filter = 'grayscale(100%)';
               glowStyle = 'none';
            }
          }

          const icon = L.divIcon({
            className: '',
            html: `<div style="
              display:flex; align-items:center; justify-content:center;
              background:${bgColor};
              border:2px solid ${borderColor};
              border-radius:20px;
              padding: 4px 10px;
              color:white; font-weight:bold; font-size:12px;
              opacity: ${opacity};
              filter: ${filter};
              ${glowStyle}
              cursor:pointer;
              white-space: nowrap;
            ">${p.name} ${isCurrentUser ? '★' : ''}</div>`,
            iconSize: null // Allows it to size itself based on contents
          });

          const marker = L.marker([finalLat, finalLng], { icon, myRoomId: p.roomId });

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

          // Click to zoom in is handled automatically by cluster, but we can preserve it for unclustered individual markers
          marker.on('click', function () {
            const currentZoom = map.getZoom();
            const targetZoom = Math.min(currentZoom + 3, map.getMaxZoom());
            map.flyTo([finalLat, finalLng], targetZoom);
          });
          
          marker.addTo(markersGroupRef.current);
        });

        if (!initialFlyDone.current && players.length > 0) {
          if (focusLocation) {
            setTimeout(() => {
              if (leafletMapRef.current) {
                // Instantly teleport to the coordinate from 3D without animation to feel seamless
                leafletMapRef.current.setView([focusLocation.lat, focusLocation.lng], 7, { animate: false });
              }
            }, 100);
          } else {
            const myPlayer = players.find(p => p.name === playerName);
            if (myPlayer) {
              // Wait a small moment for map to settle
              setTimeout(() => {
                if (leafletMapRef.current) {
                  leafletMapRef.current.flyTo([myPlayer.lat, myPlayer.lng], 4, { animate: true, duration: 1.5 });
                }
              }, 500);
            }
          }
          initialFlyDone.current = true;
        }

      }).catch(err => {
        console.error('Leaflet load failed', err);
        setError('Map library failed to load');
      });

    return () => {
      // Don't remove the map instance on unmount/re-render to preserve view
    };
  }, [loading, players, playerName, selectedRoom]);

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
                <button 
                  key={rid} 
                  title={t('點擊縮放，雙擊加入房間', 'Click to zoom, double click to join')}
                  onClick={() => {
                    const isSelecting = selectedRoom !== rid;
                    setSelectedRoom(isSelecting ? rid : null);
                    if (isSelecting) {
                      const roomPlayers = players.filter(p => p.roomId === rid);
                      if (roomPlayers.length > 0 && leafletMapRef.current) {
                        const lats = roomPlayers.map(p => p.lat);
                        const lngs = roomPlayers.map(p => p.lng);
                        leafletMapRef.current.flyToBounds([
                          [Math.min(...lats), Math.min(...lngs)],
                          [Math.max(...lats), Math.max(...lngs)]
                        ], { padding: [60, 60], maxZoom: 7 });
                      }
                    }
                  }}
                  onDoubleClick={() => {
                    if (onJoinRoom) onJoinRoom(rid);
                  }}
                  onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                  onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                  style={{ 
                    display: 'inline-flex', alignItems: 'center', gap: '4px', background: selectedRoom === rid ? getRoomColor(rid) + '88' : getRoomColor(rid) + '22', 
                    color: selectedRoom === rid ? '#fff' : getRoomColor(rid), border: `1px solid ${getRoomColor(rid)}`, borderRadius: '99px', 
                    padding: '2px 10px', fontSize: '0.78rem', fontWeight: 'bold', cursor: 'pointer',
                    transition: 'transform 0.2s', outline: 'none'
                  }}>
                  <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: getRoomColor(rid), display: 'inline-block' }}></span>
                  {rid} ({players.filter(p => p.roomId === rid).length}人)
                </button>
              ))}
            </div>
          ) : null;
        })()}

        <div style={{ marginLeft: 'auto', display: 'flex', gap: '10px' }}>
          <button
            onClick={() => onToggleMode && onToggleMode()}
            style={{ background: '#e2e8f0', color: '#475569', border: '1px solid #cbd5e1', padding: '0.3rem 0.8rem', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.8rem' }}
          >
            {currentMode === '2d' ? '🌐 ' + t('切換至 3D 地球', 'Switch to 3D Globe') : '🗺️ ' + t('切換至 2D 地圖', 'Switch to 2D Map')}
          </button>
          <button
            onClick={() => {
              setLoading(true);
              fetch('/api/get-player-map').then(r => r.json()).then(data => {
                setPlayers(Array.isArray(data) ? data : []);
                setLoading(false);
              }).catch(() => setLoading(false));
            }}
            style={{ background: '#0ea5e9', color: 'white', border: 'none', padding: '0.3rem 0.8rem', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.8rem' }}
          >
            🔄 {t('重新整理', 'Refresh')}
          </button>
        </div>
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
        
        .custom-cluster-icon {
          display: flex !important;
          align-items: center;
          justify-content: center;
        }
        .custom-cluster {
          background-color: #1e293b;
          color: white;
          border-radius: 50%;
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          font-family: system-ui, sans-serif;
          font-size: 14px;
          box-shadow: 0 4px 10px rgba(0,0,0,0.4);
          border: 2px solid #334155;
          transition: transform 0.2s;
        }
        .custom-cluster:hover {
          transform: scale(1.1);
          background-color: #0f172a;
        }
      `}</style>
    </div>
  );
}
