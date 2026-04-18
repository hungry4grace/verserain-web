import React, { useEffect, useRef, useState, useMemo } from 'react';
import Globe from 'react-globe.gl';

// Same deterministic room color as in App.jsx
const ROOM_COLORS = ['#ef4444','#f97316','#eab308','#22c55e','#14b8a6','#0ea5e9','#8b5cf6','#ec4899','#06b6d4','#84cc16'];
function getRoomColor(roomId) {
  if (!roomId) return null;
  let hash = 0;
  for (const c of roomId) hash = (hash * 31 + c.charCodeAt(0)) % ROOM_COLORS.length;
  return ROOM_COLORS[hash];
}

export default function WorldMap3D({ t, playerName, onJoinRoom, onToggleMode, currentMode }) {
  const globeEl = useRef(null);
  const containerRef = useRef(null);
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 520 });
  const [altitude, setAltitude] = useState(2.5);

  // Handle container resize
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: 520
        });
      }
    };
    window.addEventListener('resize', updateSize);
    updateSize(); // initial set
    
    // Sometimes it takes a moment for layout to settle
    setTimeout(updateSize, 100);
    setTimeout(updateSize, 500);
    
    return () => window.removeEventListener('resize', updateSize);
  }, []);

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

  // Add initial setting and set controls after mount
  const initialFlyDone = useRef(false);
  useEffect(() => {
    if (globeEl.current && !loading) {
      globeEl.current.controls().autoRotate = false; // Stopped auto rotation per user request
      
      // Auto move view to current player on first load
      if (!initialFlyDone.current && players.length > 0) {
        const myPlayer = players.find(p => p.name === playerName);
        if (myPlayer) {
          setTimeout(() => {
            if (globeEl.current) {
              globeEl.current.pointOfView({ lat: myPlayer.lat, lng: myPlayer.lng, altitude: 1.5 }, 2000);
            }
          }, 500);
        }
        initialFlyDone.current = true;
      }
    }
  }, [loading, players, playerName]);

  const mapData = useMemo(() => {
    // Dynamic grid size based on altitude to break apart clusters when zooming in
    // At default altitude (2.5), grid size is ~7.5 degrees
    // Below 0.2 (zoomed in completely), clustering stops
    const gridSize = altitude > 0.3 ? altitude * 3 : 0; 
    
    // 1. Group into clusters
    const clusters = [];
    players.forEach(p => {
      if (gridSize === 0) {
        clusters.push({ lat: p.lat, lng: p.lng, players: [p] });
        return;
      }
      
      const gridLat = Math.round(p.lat / gridSize) * gridSize;
      const gridLng = Math.round(p.lng / gridSize) * gridSize;
      
      const existing = clusters.find(c => c.gridLat === gridLat && c.gridLng === gridLng);
      if (existing) {
        existing.players.push(p);
      } else {
        clusters.push({ lat: p.lat, lng: p.lng, gridLat, gridLng, players: [p] });
      }
    });

    // 2. Format output
    return clusters.map(cluster => {
      // If it's a single player, render standard marker
      if (cluster.players.length === 1) {
        const p = cluster.players[0];
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
             bgColor = '#475569';
             borderColor = '#334155';
          }
        }

        return {
          isCluster: false,
          lat: p.lat,
          lng: p.lng,
          name: p.name,
          roomId: p.roomId,
          bgColor,
          borderColor,
          opacity,
          filter,
          glowStyle,
          isCurrentUser,
          roomColor,
          locationStr: `📍 ${p.city ? p.city + ', ' : ''}${p.country || 'Unknown'}`,
          lastOnline: p.updatedAt ? new Date(p.updatedAt).toLocaleString() : 'Unknown',
        };
      }
      
      // If it's a cluster, render numbered cluster marker
      const avgLat = cluster.players.reduce((sum, p) => sum + p.lat, 0) / cluster.players.length;
      const avgLng = cluster.players.reduce((sum, p) => sum + p.lng, 0) / cluster.players.length;
      const isCurrentUserInCluster = cluster.players.some(p => p.name === playerName);
      
      let opacity = 1.0;
      let filter = 'none';
      let bgColor = '#1e293b';
      let borderColor = '#334155';
      let glowStyle = 'box-shadow: 0 4px 10px rgba(0,0,0,0.4);';

      if (selectedRoom) {
        const hasSelected = cluster.players.some(p => p.roomId === selectedRoom);
        if (hasSelected) {
          bgColor = getRoomColor(selectedRoom);
          borderColor = bgColor;
          glowStyle = `box-shadow: 0 0 0 3px ${bgColor}55, 0 0 12px ${bgColor}88;`;
        } else {
          opacity = 0.3;
          filter = 'grayscale(100%)';
          glowStyle = 'none';
        }
      } else if (isCurrentUserInCluster) {
         borderColor = '#fbbf24';
      }

      return {
        isCluster: true,
        lat: avgLat,
        lng: avgLng,
        count: cluster.players.length,
        players: cluster.players,
        bgColor,
        borderColor,
        opacity,
        filter,
        glowStyle
      };
    });
  }, [players, playerName, selectedRoom, altitude]);

  const htmlElement = (d) => {
    const el = document.createElement('div');
    
    if (d.isCluster) {
      el.innerHTML = `<div style="
          background-color: ${d.bgColor};
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
          border: 2px solid ${d.borderColor};
          opacity: ${d.opacity};
          filter: ${d.filter};
          ${d.glowStyle}
          transition: transform 0.2s;
          cursor: pointer;
          pointer-events: auto;
        " onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'">${d.count}</div>`;
        
      const tooltipNames = d.players.slice(0, 10).map(p => p.name).join(', ') + (d.players.length > 10 ? '...' : '');
      el.title = `${d.count} ${t('名玩家', 'players')}\n${tooltipNames}`;
        
      el.onclick = () => {
        if (globeEl.current) {
          globeEl.current.controls().autoRotate = false;
          // Zoom in smoothly, but prevent zooming too close to avoid blurry texture 
          // Altitude goes from ~2.5 (far) to 0.6 (continent/country level)
          const targetAltitude = Math.max(0.6, altitude * 0.5); 
          globeEl.current.pointOfView({ lat: d.lat, lng: d.lng, altitude: targetAltitude }, 1000);
        }
      };
    } else {
      el.innerHTML = `<div style="
          display:flex; align-items:center; justify-content:center;
          background:${d.bgColor};
          border:2px solid ${d.borderColor};
          border-radius:20px;
          padding: 4px 10px;
          color:white; font-weight:bold; font-size:12px;
          opacity: ${d.opacity};
          filter: ${d.filter};
          ${d.glowStyle}
          cursor:pointer;
          white-space: nowrap;
          pointer-events: auto;
        ">${d.name} ${d.isCurrentUser ? '★' : ''}</div>`;
        
      el.title = `${d.name}\n${d.locationStr}\n${d.roomId ? '⚔️ ' + t('房間', 'Room') + ' ' + d.roomId + '\n' : ''}🕒 ${t('最後上線', 'Last Online')}: ${d.lastOnline}`;
        
      el.onclick = () => {
        if (globeEl.current) {
          globeEl.current.controls().autoRotate = false;
          // Zoom in to the single marker, but stop at 0.6 altitude
          const targetAltitude = Math.max(0.6, altitude * 0.5);
          globeEl.current.pointOfView({ lat: d.lat, lng: d.lng, altitude: targetAltitude }, 1000);
        }
      };
    }
    
    return el;
  };

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
                      if (roomPlayers.length > 0 && globeEl.current) {
                        const lats = roomPlayers.map(p => p.lat);
                        const lngs = roomPlayers.map(p => p.lng);
                        const midLat = (Math.min(...lats) + Math.max(...lats)) / 2;
                        const midLng = (Math.min(...lngs) + Math.max(...lngs)) / 2;
                        globeEl.current.controls().autoRotate = false;
                        globeEl.current.pointOfView({ lat: midLat, lng: midLng, altitude: 0.8 }, 1500);
                      }
                    } else if (globeEl.current) {
                        globeEl.current.controls().autoRotate = false;
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
      <div ref={containerRef} style={{ width: '100%', height: '520px', background: '#e0f2fe', cursor: 'grab' }} onMouseDown={(e) => e.currentTarget.style.cursor='grabbing'} onMouseUp={(e) => e.currentTarget.style.cursor='grab'}>
        {loading ? (
          <div style={{ height: '520px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '1.1rem' }}>
            ⏳ {t('載入地球中...', 'Loading globe...')}
          </div>
        ) : error ? (
          <div style={{ height: '520px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444' }}>
            ⚠️ {error}
          </div>
        ) : (
          <div style={{ position: 'relative' }}>
            <Globe
              ref={globeEl}
              width={dimensions.width}
              height={dimensions.height}
              globeImageUrl="//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
              bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
              backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"
              htmlElementsData={mapData}
              htmlElement={htmlElement}
              onZoom={({ altitude: newAltitude }) => setAltitude(newAltitude)}
              htmlAltitude={0.05}
              htmlTransitionDuration={100}
            />
            {players.length === 0 && (
              <div style={{ position: 'absolute', top: '1rem', left: '50%', transform: 'translateX(-50%)', textAlign: 'center', color: '#fff', textShadow: '0 2px 4px rgba(0,0,0,0.5)', pointerEvents: 'none', fontSize: '1rem', background: 'rgba(0,0,0,0.5)', padding: '0.5rem 1rem', borderRadius: '20px' }}>
                {t('還沒有玩家資料，完成一局遊戲後你的位置就會出現！', 'No players yet — complete a game to appear on the map!')}
              </div>
            )}
            
            {/* Compass / Reset view hint */}
            <div 
              style={{ position: 'absolute', bottom: '20px', left: '20px', background: 'rgba(255,255,255,0.8)', padding: '5px 10px', borderRadius: '8px', fontSize: '0.8rem', color: '#475569', boxShadow: '0 2px 5px rgba(0,0,0,0.2)', cursor: 'pointer', fontWeight: 'bold' }}
              onClick={() => {
                const myPlayer = players.find(p => p.name === playerName);
                if (globeEl.current) {
                    globeEl.current.pointOfView({ 
                      lat: myPlayer ? myPlayer.lat : 20, 
                      lng: myPlayer ? myPlayer.lng : 105, 
                      altitude: 2.5 
                    }, 1000);
                }
                setSelectedRoom(null);
              }}
            >
              🔄 {t('還原視角', 'Reset View')}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
