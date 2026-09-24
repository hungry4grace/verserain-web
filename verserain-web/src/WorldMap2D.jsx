import { useEffect, useMemo, useRef, useState } from 'react';
import { loadLeafletAndCluster } from './leafletLoader';
import { getSetAssetDataUrl } from './setVoiceApi';

// Same deterministic room color as in App.jsx
const ROOM_COLORS = ['#ef4444','#f97316','#eab308','#22c55e','#14b8a6','#0ea5e9','#8b5cf6','#ec4899','#06b6d4','#84cc16'];
function getRoomColor(roomId) {
  if (!roomId) return null;
  let hash = 0;
  for (const c of roomId) hash = (hash * 31 + c.charCodeAt(0)) % ROOM_COLORS.length;
  return ROOM_COLORS[hash];
}

// 「地上的光點」：點的大小 = 園子塊地數，亮度/顏色 = 近 7 天活躍度。
// 大小：中等 + 封頂(~28px)，讓大園子明顯但世界視角不擠爆。
function sizeForSquares(sq) {
  return Math.min(28, 6 + (sq || 1) * 5); // 1→11, 2→16, 3→21, 4→26, 5+→28
}
// Ember → Starlight 暖色帶：沉睡=暗琥珀微光 … 火熱=白熱＋青白光暈。
// 光暈強度隨活躍度加大 → 活躍玩家聚集區自然更亮。
// 門檻依真實活躍分布校準(活躍玩家 p50≈2700、p90≈20000):
// 分數來源約 login=100/日、聆聽=+100、新節=+1000、完成=+500。
function emberRamp(a) {
  const v = a || 0;
  if (v <= 0)      return { color: '#7c5230', glow: '0 0 6px rgba(150,100,60,0.45)',  opacity: 0.7,  tierKey: 'dormant' };
  if (v < 1000)    return { color: '#f59e0b', glow: '0 0 10px rgba(245,158,11,0.7)',  opacity: 0.92, tierKey: 'ember' };
  if (v < 5000)    return { color: '#fbbf24', glow: '0 0 13px rgba(251,191,36,0.85)', opacity: 0.95, tierKey: 'warm' };
  if (v < 20000)   return { color: '#fef3c7', glow: '0 0 18px rgba(253,224,71,0.95)', opacity: 0.97, tierKey: 'bright' };
  return { color: '#ffffff', glow: '0 0 10px #ffffff, 0 0 24px rgba(191,219,254,1)', opacity: 1, tierKey: 'starlight' };
}

// 即時脈動漣漪:每種動作是一種「樂器」的音波。加大加厚、加發光衝擊波(blast)
// 與中心白閃(flash),讓深色地圖上的波更明顯有戲劇性(與 3D 一致,尺寸略小)。
const PULSE_STYLES = {
  listen: { c: '56,189,248',  max: 110, rings: 2, dur: 1900 }, // 聆聽 — 青色衝擊波(輕)
  play:   { c: '245,158,11',  max: 150, rings: 2, dur: 2000 }, // 開始挑戰 — 琥珀衝擊波(中)
  done:   { c: '253,224,71',  max: 210, rings: 3, dur: 2300 }, // 完成 — 金色大衝擊波(高潮)
  fruit:  { c: '252,211,77',  max: 260, rings: 4, dur: 2500 }, // 創新高得新果子 — 最盛大的金色衝擊波
};
// 防洪/防塞:同時最多 40 個漣漪;超過時只保留 done(高潮),丟棄 listen/play。
let activePulseCount = 0;
const lastPulseAt = {}; // name+action → ts,600ms 內去重
function buildPulseHtml(action) {
  const cfg = PULSE_STYLES[action] || PULSE_STYLES.listen;
  const { c, dur, max } = cfg;
  let html = `<span class="vr-pulse-blast" style="--vr-rgb:${c}; --vr-dur:${dur}ms; width:${max}px; height:${max}px;"></span>`;
  for (let i = 0; i < cfg.rings; i++) {
    html += `<span class="vr-pulse-ring" style="--vr-rgb:${c}; --vr-max:${max}px; --vr-dur:${dur}ms; animation-delay:${i * 180}ms;"></span>`;
  }
  html += `<span class="vr-pulse-flash" style="--vr-rgb:${c};"></span>`;
  return { html, life: dur + (cfg.rings - 1) * 180 + 200 };
}

const LAND_GEOJSON_URL = 'https://cdn.jsdelivr.net/gh/johan/world.geo.json@master/countries.geo.json';
const LABEL_TILE_URL = 'https://{s}.basemaps.cartocdn.com/rastertiles/dark_only_labels/{z}/{x}/{y}{r}.png';

// Map places (merchants / churches / organisations) — icon per kind.
const PLACE_STYLE = {
  merchant: { bg: '#e11d48', border: '#fecdd3', emoji: '🏪' }, // 玫紅：和黃色玩家光點分開
  church:   { bg: '#7c3aed', border: '#ddd6fe', emoji: '⛪' },
  org:      { bg: '#0d9488', border: '#99f6e4', emoji: '🏢' },
};
const escapeHtml = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const TEAMS_HOST = 'https://verserain-party.hungry4grace.partykit.dev/parties/main/global-auth-db';

export default function WorldMap2D({ t, playerName, userEmail, onJoinRoom, onViewGarden, onToggleMode, currentMode, focusLocation, playTone, playWelcome, onEnableAudio, fruitMode = false, fruitTree = null, fruitLoading = false, onToggleFruit, selfLocation = null, places = [], placesMode = false, onTogglePlaces, onRedeem }) {
  // 我的果子: name → 1 (I invited them) | 2 (they were invited by someone I invited)
  const fruitLevel = useMemo(() => {
    const m = new Map();
    if (fruitTree) {
      (fruitTree.level1 || []).forEach(n => m.set(n, 1));
      (fruitTree.level2 || []).forEach(x => { if (x?.name && !m.has(x.name)) m.set(x.name, 2); });
    }
    return m;
  }, [fruitTree]);
  const fruitLinesRef = useRef(null);
  const fruitMarkersRef = useRef(null);
  const mapRef = useRef(null);
  const leafletMapRef = useRef(null);
  const markersByNameRef = useRef({}); // name → Leaflet marker,供即時脈動查座標
  // 地圖交響音效:預設關,🔊 開啟(首次點按同時解鎖 iOS 音訊)。
  const [soundOn, setSoundOn] = useState(() => {
    try { return localStorage.getItem('verseRain_mapSound') === '1'; } catch { return false; }
  });
  const soundOnRef = useRef(soundOn);
  const playToneRef = useRef(playTone);
  const playWelcomeRef = useRef(playWelcome);
  const prevPlayerNamesRef = useRef(null); // 上一輪玩家名字集合(null=尚未初始化)
  useEffect(() => { soundOnRef.current = soundOn; }, [soundOn]);
  useEffect(() => { playToneRef.current = playTone; }, [playTone]);
  useEffect(() => { playWelcomeRef.current = playWelcome; }, [playWelcome]);
  const [players, setPlayers] = useState([]);
  // 有新朋友加入地圖(名字上一輪沒出現過)→ 播放歡迎小號(需已開啟 🔊)。
  // 首次載入不觸發(否則整批都算「新」);之後每次輪詢比對差集。
  useEffect(() => {
    const names = new Set(players.map(p => p && p.name).filter(Boolean));
    const prev = prevPlayerNamesRef.current;
    // 等到第一次「真的有玩家」才建立基準(players 會先是空陣列,不能把空清單當基準,
    // 否則第一批載入的人全被當成「新加入」)。在此之前都不觸發。
    if (prev === null) {
      if (names.size > 0) prevPlayerNamesRef.current = names;
      return;
    }
    prevPlayerNamesRef.current = names;
    let hasNew = false;
    for (const n of names) { if (!prev.has(n)) { hasNew = true; break; } }
    if (hasNew && soundOnRef.current) {
      try { playWelcomeRef.current?.(); } catch {}
    }
  }, [players]);
  // 每位玩家的園子統計(來自 /all-gardens)：{ name: { plants, squares, activity7d } }
  const [statsByName, setStatsByName] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [error, setError] = useState(null);
  const [selectedRoom, setSelectedRoom] = useState(null);
  // 雲端家人:此使用者的所有團 + 每團成員 playerName 集合。
  // 結構:{ id, name, memberNames: Set<string> }[]
  const [myTeams, setMyTeams] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState(null); // teamId or null
  const selectedRoomRef = useRef(selectedRoom);

  useEffect(() => {
    selectedRoomRef.current = selectedRoom;
  }, [selectedRoom]);

  // Fetch my teams + their members. Translate emails → playerName via
  // each /teams/get response's displayNames. We only need names (not
  // location) because we'll match against the existing players array.
  useEffect(() => {
    if (!userEmail) { setMyTeams([]); return; }
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch(`${TEAMS_HOST}/my-teams?email=${encodeURIComponent(userEmail)}`);
        if (!r.ok) return;
        const data = await r.json();
        const teams = data.teams || [];
        const detailed = await Promise.all(teams.map(async (tm) => {
          try {
            const d = await fetch(`${TEAMS_HOST}/teams/get?id=${encodeURIComponent(tm.id)}&email=${encodeURIComponent(userEmail)}`);
            if (!d.ok) return null;
            const dd = await d.json();
            const dn = dd.displayNames || {};
            const members = (dd.team?.members || []);
            // Filter out members whose displayName is just the email
            // local-part — those haven't completed onboarding and won't
            // have a corresponding map marker either.
            const memberNames = new Set();
            for (const e of members) {
              const name = dn[e];
              if (name && name !== e.split('@')[0]) memberNames.add(name);
              else if (name) memberNames.add(name);
            }
            return { id: tm.id, name: tm.name, memberNames };
          } catch { return null; }
        }));
        if (!cancelled) setMyTeams(detailed.filter(Boolean));
      } catch { /* fail quietly */ }
    })();
    return () => { cancelled = true; };
  }, [userEmail]);

  // Fetch player map data + auto-refresh every 30s。園子統計(塊地/活躍)變動慢且
  // 在大量玩家時是重負載(整包 statsMap),所以只在首次 + 每 ~2 分鐘拉一次,不跟每次輪詢。
  useEffect(() => {
    let n = 0;
    const loadPositions = () => {
      fetch('/api/get-player-map')
        .then(r => r.json())
        .then(data => { if (Array.isArray(data)) setPlayers(data); else setPlayers([]); setLoading(false); })
        .catch(() => { setError('Failed to load map data'); setLoading(false); });
    };
    const loadStats = () => {
      fetch(`${TEAMS_HOST}/all-gardens`)
        .then(r => r.ok ? r.json() : { statsMap: {} })
        .then(d => setStatsByName(d.statsMap || {}))
        .catch(() => {});
    };
    loadPositions();
    loadStats();
    const interval = setInterval(() => {
      loadPositions();
      n += 1;
      if (n % 4 === 0) loadStats(); // 每 4 次輪詢(~2 分鐘)才刷新統計
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const markersGroupRef = useRef(null);
  // Places layer: separate from the player markers so it is neither clustered
  // nor rebuilt every 30 s; refs keep the big marker effect's deps unchanged.
  const placeMarkersRef = useRef(null);
  const placesRef = useRef(places);
  const onRedeemRef = useRef(onRedeem);
  const openedPlaceRef = useRef(null);
  const [mapReady, setMapReady] = useState(false);
  useEffect(() => { placesRef.current = places; }, [places]);
  useEffect(() => { onRedeemRef.current = onRedeem; }, [onRedeem]);

  // Init Leaflet map and markers
  const initialFlyDone = useRef(false);
  useEffect(() => {
    if (loading || !mapRef.current) return;

    loadLeafletAndCluster()
      .then(L => {
        let map = leafletMapRef.current;
        
        // Ensure the DOM node exists and map isn't already created
        if (!map && mapRef.current) {
          // Fix for "Map container is already initialized" if React rapidly re-mounted
          if (mapRef.current._leaflet_id) {
             mapRef.current._leaflet_id = null;
          }
          
          map = L.map(mapRef.current, {
            center: [20, 0],
            zoom: 2,
            minZoom: 2,
            maxZoom: 19,
            zoomControl: true,
            attributionControl: true,
            doubleClickZoom: false
          });

          map.createPane('landPane');
          map.getPane('landPane').style.zIndex = 250;
          map.createPane('labelPane');
          map.getPane('labelPane').style.zIndex = 360;

          fetch(LAND_GEOJSON_URL)
            .then(response => response.json())
            .then(geojson => {
              L.geoJSON(geojson, {
                pane: 'landPane',
                style: {
                  color: '#2f7a4a',
                  weight: 0.55,
                  opacity: 0.8,
                  fillColor: '#174a2f',
                  fillOpacity: 0.94
                }
              }).addTo(map);
            })
            .catch(() => {
              L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png', {
                className: 'verse-map-fallback-tiles',
                attribution: '© OpenStreetMap contributors © CARTO',
                subdomains: 'abcd',
                maxZoom: 20
              }).addTo(map);
            });

          L.tileLayer(LABEL_TILE_URL, {
            className: 'verse-map-labels',
            pane: 'labelPane',
            attribution: '© OpenStreetMap contributors © CARTO',
            subdomains: 'abcd',
            maxZoom: 20
          }).addTo(map);

          // 用 MarkerCluster 群組:只渲染畫面內/聚合後的標記,可撐到 10K+ 玩家不卡。
          // 聚合泡泡做成「發光金色光團」,呼應「地上的光點」主題;數字越大泡泡越大越亮。
          markersGroupRef.current = (L.markerClusterGroup
            ? L.markerClusterGroup({
                chunkedLoading: true,
                showCoverageOnHover: false,
                spiderfyOnMaxZoom: true,
                removeOutsideVisibleBounds: true,
                maxClusterRadius: 46,
                iconCreateFunction: (cluster) => {
                  const n = cluster.getChildCount();
                  const size = Math.round(Math.min(56, 26 + Math.log2(n + 1) * 5.5));
                  const glow = Math.min(26, 12 + Math.log2(n + 1) * 2.5);
                  return L.divIcon({
                    className: '',
                    html: `<div style="width:${size}px;height:${size}px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;color:#231400;background:radial-gradient(circle at 35% 30%, #fff3c4, #fbbf24 55%, #f59e0b);border:1px solid rgba(255,255,255,0.9);box-shadow:0 0 0 2px rgba(2,8,23,0.55), 0 0 ${glow}px rgba(251,191,36,0.95);font-size:${n > 999 ? '0.72rem' : '0.86rem'};">${n >= 1000 ? (n / 1000).toFixed(n >= 10000 ? 0 : 1) + 'k' : n}</div>`,
                    iconSize: [size, size],
                  });
                },
              })
            : L.layerGroup()).addTo(map);

          leafletMapRef.current = map;
          setMapReady(true);
        }

        // Clear existing markers for this update
        markersGroupRef.current.clearLayers();
        if (!fruitMarkersRef.current) fruitMarkersRef.current = L.layerGroup().addTo(leafletMapRef.current);
        fruitMarkersRef.current.clearLayers();
        markersByNameRef.current = {}; // 重建 name→marker 對照(供即時脈動)

        const playerMarkers = [];

        players.forEach(p => {
          if (p.lat == null || p.lng == null || isNaN(p.lat) || isNaN(p.lng)) return;

          const finalLat = p.lat;
          const finalLng = p.lng;

          const isCurrentUser = p.name === playerName;
          const roomColor = getRoomColor(p.roomId);

          // 「地上的光點」：大小 = 塊地數,亮度/顏色 = 近 7 天活躍度。
          const stats = statsByName[p.name] || { plants: 0, squares: 1, activity7d: 0 };
          const ramp = emberRamp(stats.activity7d);

          // 現場多人遊戲的玩家保留房間色跳出來,其餘走活躍度色帶。
          let bgColor = roomColor || ramp.color;
          let glowStyle = roomColor
            ? `border: 1px solid rgba(255,255,255,0.9); box-shadow: 0 0 0 3px ${roomColor}66, 0 0 18px ${roomColor}dd;`
            : `border: 1px solid rgba(255,255,255,0.9); box-shadow: 0 0 0 2px rgba(2,8,23,0.85), ${ramp.glow};`;
          let opacity = roomColor ? 0.95 : ramp.opacity;
          let filter = 'none';

          if (selectedRoom) {
            if (p.roomId !== selectedRoom) {
               bgColor = '#0f2d3b';
               opacity = 0.28;
               filter = 'grayscale(100%)';
               glowStyle = 'none';
            }
          }

          // 雲端家人 highlight:選定團時,團員白亮、非團員暗化。覆蓋
          // 在 selectedRoom 之後,讓 team filter 取代 room filter 的視覺。
          const activeTeam = myTeams.find(tm => tm.id === selectedTeam);
          if (activeTeam) {
            const isTeammate = activeTeam.memberNames.has(p.name);
            if (isTeammate) {
              bgColor = '#ffffff';
              glowStyle = 'border: 2px solid #fb923c; box-shadow: 0 0 0 4px rgba(249,115,22,0.85), 0 0 24px #ffffff;';
              opacity = 1;
              filter = 'none';
            } else {
              bgColor = '#0f2d3b';
              opacity = 0.18;
              filter = 'grayscale(100%)';
              glowStyle = 'none';
            }
          }

          // 我的果子:我推薦的人金環、他們推薦的人細金環,其他人暗化。
          const fruitLvl = fruitMode && fruitTree ? (fruitLevel.get(p.name) || 0) : 0;
          if (fruitMode && fruitTree) {
            if (fruitLvl === 1) {
              bgColor = '#fde68a';
              glowStyle = 'border: 2px solid #f59e0b; box-shadow: 0 0 0 4px rgba(245,158,11,0.9), 0 0 22px #fbbf24;';
              opacity = 1; filter = 'none';
            } else if (fruitLvl === 2) {
              bgColor = '#fef3c7';
              glowStyle = 'border: 1.5px solid #fbbf24; box-shadow: 0 0 0 2px rgba(251,191,36,0.7), 0 0 14px rgba(251,191,36,0.8);';
              opacity = 0.95; filter = 'none';
            } else if (!isCurrentUser) {
              bgColor = '#0f2d3b'; opacity = 0.18; filter = 'grayscale(100%)'; glowStyle = 'none';
            }
          }

          // 大小 = 塊地數(封頂);高亮情境仍確保最小可視尺寸。
          let size = sizeForSquares(stats.squares);
          if (fruitLvl === 1) size = Math.max(size, 14);
          if (fruitLvl === 2) size = Math.max(size, 11);

          if (isCurrentUser) {
            bgColor = '#fde047'; // Yellow
            glowStyle = 'border: 2px solid white; box-shadow: 0 0 0 4px rgba(8,47,63,0.95), 0 0 22px #fde047;';
            opacity = 1;
            filter = 'none';
            size = Math.max(size, 14); // 保證自己看得見
          }

          // Bump team members up a notch so the highlight reads even
          // on a crowded global view.
          {
            const at = myTeams.find(tm => tm.id === selectedTeam);
            if (at && at.memberNames.has(p.name) && !isCurrentUser) size = Math.max(size, 13);
          }

          const icon = L.divIcon({
            className: '',
            html: `<div style="
              width: ${size}px; height: ${size}px;
              background:${bgColor};
              border-radius: 50%;
              opacity: ${opacity};
              filter: ${filter};
              ${glowStyle}
              cursor:pointer;
            "></div>`,
            iconSize: [size, size]
          });

          const marker = L.marker([finalLat, finalLng], { icon, myRoomId: p.roomId });

          const roomBadge = p.roomId
            ? `<div style="margin-top:6px; font-size:0.8rem; font-weight:bold; background:${roomColor}22; color:${roomColor}; border-radius:12px; padding:2px 8px; display:inline-block;">⚔️ ${t('房間 {id}', 'Room {id}').replace('{id}', String(p.roomId))}</div>`
            : '';

          const lastOnline = p.updatedAt ? new Date(p.updatedAt).toLocaleString() : 'Unknown';

          const activityLabels = {
            dormant:   t('安靜', 'Quiet'),
            ember:     t('微亮', 'A spark'),
            warm:      t('活躍', 'Active'),
            bright:    t('很活躍', 'Very active'),
            starlight: t('火熱', 'On fire'),
          };
          const activityLabel = activityLabels[ramp.tierKey];

          const popup = L.popup({ maxWidth: 220, className: 'verse-map-popup' }).setContent(`
            <div style="font-family: system-ui, sans-serif; text-align:center; min-width: 120px;">
              <div style="font-weight:bold; font-size:1.1rem; color:#1e293b; margin-bottom:4px; display:flex; flex-direction:column; align-items:center; gap:5px;">
                <button class="map-garden-btn" data-name="${p.name}" style="font-size: 0.95rem; background-color: #f1f5f9; color: #2563eb; padding: 0.3rem 0.8rem; border-radius: 16px; border: 1px solid #bfdbfe; cursor: pointer; font-weight: bold; margin-top:2px; display:flex; align-items:center; gap:4px;">🌳 ${t('{name} 的園子', "{name}'s garden").replace('{name}', p.name)}</button>
              </div>
              <div style="font-size:0.85rem; color:#334155; margin-bottom:2px;">🟩 <b>${stats.squares}</b> ${t('塊地', stats.squares === 1 ? 'plot' : 'plots')} · ${stats.plants} ${t('棵植物', 'plants')}</div>
              <div style="font-size:0.85rem; color:#334155; margin-bottom:4px;">🔥 ${t('近7天', 'Last 7d')}: <b>${activityLabel}</b></div>
              <div style="font-size:0.85rem; color:#64748b;">📍 ${p.city ? p.city + ', ' : ''}${p.country || 'Unknown'}</div>
              ${roomBadge}
              <div style="margin-top:8px; font-size:0.75rem; color:#94a3b8;">🕒 ${t('最後上線', 'Last Online')}: ${lastOnline}</div>
            </div>
          `);

          marker.bindPopup(popup);

          // 果子(與我自己)不進叢集,線的端點才不會被泡泡吃掉。
          if (fruitMode && fruitTree && (fruitLvl || isCurrentUser) && fruitMarkersRef.current) marker.addTo(fruitMarkersRef.current);
          else marker.addTo(markersGroupRef.current);
          playerMarkers.push({ p, marker });
          markersByNameRef.current[p.name] = marker;
        });

        // Bind custom map interactions
        if (map) {
          map.off('click');
          map.off('dblclick');
          map.off('popupopen');

          map.on('popupopen', function(e) {
            if (e.popup && e.popup._contentNode) {
              const node = e.popup._contentNode;
              const btn = node.querySelector('.map-garden-btn');
              if (btn && onViewGarden) {
                btn.onclick = () => {
                  onViewGarden(btn.getAttribute('data-name'));
                };
              }
              // Place popups: voucher button + lazy photo (only fetched on open).
              const redeemBtn = node.querySelector('.map-redeem-btn');
              if (redeemBtn) redeemBtn.onclick = () => { const id = redeemBtn.getAttribute('data-place-id'); onRedeemRef.current?.((placesRef.current || []).find(pl => pl.id === id) || { id }); };
              const img = node.querySelector('.map-place-photo');
              if (img && img.getAttribute('data-asset') && !img.getAttribute('src')) {
                getSetAssetDataUrl(img.getAttribute('data-set'), img.getAttribute('data-asset'), img.getAttribute('data-mime') || 'image/webp')
                  .then((url) => {
                    img.src = url; img.style.display = 'block';
                    // Re-layout only. popup.update() would re-set innerHTML from
                    // the content string and wipe the button's onclick + the img.
                    try { e.popup._updateLayout(); e.popup._updatePosition(); e.popup._adjustPan(); } catch { /* noop */ }
                  })
                  .catch(() => {});
              }
            }
          });

          map.on('dblclick', function(e) {
            const currentZoom = map.getZoom();
            map.flyTo(e.latlng, Math.min(currentZoom + 3, map.getMaxZoom()), { animate: true, duration: 0.5 });
          });

          map.on('click', function(e) {
            const tgt = e.originalEvent && e.originalEvent.target;
            if (tgt && tgt.closest && tgt.closest('.vr-place-marker, .leaflet-popup')) return;
            let closestMarker = null;
            let minDistance = Infinity;
            
            playerMarkers.forEach(item => {
              const dist = map.distance(e.latlng, [item.p.lat, item.p.lng]);
              if (dist < minDistance) {
                minDistance = dist;
                closestMarker = item.marker;
              }
            });

            if (closestMarker) {
              closestMarker.openPopup();
            }
          });
        }

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
                  leafletMapRef.current.flyTo([myPlayer.lat, myPlayer.lng], 10, { animate: true, duration: 1.5 });
                }
              }, 500);
            }
          }
          initialFlyDone.current = true;
        }

      }).catch(err => {
        console.error('Leaflet load failed', err);
        setError('Map Error: ' + err.message);
      });

    return () => {
      // Don't remove the map instance on unmount/re-render to preserve view
    };
  }, [loading, players, statsByName, playerName, selectedRoom, selectedTeam, myTeams, fruitMode, fruitTree, fruitLevel]);

  // 我的果子:以我為中心的輻射線。level1 金實線、level2 淡虛線(從推薦他的人出發,
  // 找不到就從我出發)。獨立 layerGroup,不受標記重建影響。
  useEffect(() => {
    const map = leafletMapRef.current;
    const L = window.L;
    if (!map || !L) return;
    if (!map.getPane('fruitPane')) { map.createPane('fruitPane'); map.getPane('fruitPane').style.zIndex = 400; }
    if (!fruitLinesRef.current) fruitLinesRef.current = L.layerGroup().addTo(map);
    const layer = fruitLinesRef.current;
    layer.clearLayers();
    if (!fruitMode || !fruitTree) return;
    const byName = new Map();
    players.forEach(p => { if (p && p.name && p.lat != null && p.lng != null && !isNaN(p.lat) && !isNaN(p.lng)) byName.set(p.name, [p.lat, p.lng]); });
    const me = byName.get(playerName) || (selfLocation && Number.isFinite(selfLocation.lat) ? [selfLocation.lat, selfLocation.lng] : null);
    const pts = [];
    if (me) pts.push(me);
    (fruitTree.level1 || []).forEach(n => {
      const to = byName.get(n); if (!to) return;
      pts.push(to);
      if (me) L.polyline([me, to], { pane: 'fruitPane', color: '#fbbf24', weight: 2.5, opacity: 0.9 }).addTo(layer);
    });
    (fruitTree.level2 || []).forEach(x => {
      const to = byName.get(x?.name); if (!to) return;
      const from = (x.parent && byName.get(x.parent)) || me;
      pts.push(to);
      if (from) L.polyline([from, to], { pane: 'fruitPane', color: '#fde68a', weight: 1.5, opacity: 0.55, dashArray: '4 6' }).addTo(layer);
    });
    if (pts.length >= 2) {
      try { map.fitBounds(L.latLngBounds(pts).pad(0.25), { animate: true, maxZoom: 6 }); } catch { /* noop */ }
    } else if (me) {
      map.setView(me, Math.max(map.getZoom(), 4), { animate: true });
    }
  }, [fruitMode, fruitTree, players, playerName, selfLocation, loading]);

  // 商家／教會／機構標記:獨立圖層與 pane(在玩家點之上、popup 之下),
  // 不進叢集;圖片只在 popup 打開時才抓(見 popupopen)。
  useEffect(() => {
    const map = leafletMapRef.current;
    const L = window.L;
    if (!mapReady || !map || !L) return;
    if (!map.getPane('placePane')) { map.createPane('placePane'); map.getPane('placePane').style.zIndex = 610; }
    if (!placeMarkersRef.current) placeMarkersRef.current = L.layerGroup().addTo(map);
    const layer = placeMarkersRef.current;
    layer.clearLayers();
    if (!placesMode) return;
    const byId = new Map();
    (places || []).forEach((pl) => {
      if (!pl || !Number.isFinite(Number(pl.lat)) || !Number.isFinite(Number(pl.lng))) return;
      const st = PLACE_STYLE[pl.kind] || PLACE_STYLE.org;
      const pct = pl.kind === 'merchant' && pl.discountPct ? `<span style="position:absolute;right:-8px;bottom:-6px;background:#fff;color:#be123c;border:1px solid ${st.border};border-radius:999px;font-size:9px;font-weight:800;padding:0 4px;line-height:14px;">-${Number(pl.discountPct)}%</span>` : '';
      const icon = L.divIcon({
        className: 'vr-place-marker',
        html: `<div style="position:relative;width:30px;height:30px;border-radius:${pl.kind === 'church' ? '50%' : '9px'};background:${st.bg};border:2px solid #fff;box-shadow:0 0 0 2px ${st.border}55, 0 3px 10px rgba(0,0,0,0.45);display:flex;align-items:center;justify-content:center;font-size:16px;cursor:pointer;">${st.emoji}${pct}</div>`,
        iconSize: [30, 30], iconAnchor: [15, 15], popupAnchor: [0, -14],
      });
      const marker = L.marker([Number(pl.lat), Number(pl.lng)], { pane: 'placePane', icon, zIndexOffset: 1000 });
      const kindLabel = pl.kind === 'merchant' ? t('商家', 'Shop') : pl.kind === 'church' ? t('教會', 'Church') : t('機構', 'Organisation');
      const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${pl.lat},${pl.lng}`)}`;
      const photo = pl.photoAssetId ? `<img class="map-place-photo" data-set="place:${escapeHtml(pl.id)}" data-asset="${escapeHtml(pl.photoAssetId)}" data-mime="${escapeHtml(pl.photoMime || 'image/webp')}" alt="" style="display:none;width:100%;max-height:140px;object-fit:cover;border-radius:8px;margin-bottom:6px;" />` : '';
      const discount = pl.kind === 'merchant' && pl.discountPct ? `<div style="display:inline-block;background:#fef3c7;color:#92400e;border-radius:999px;padding:2px 10px;font-weight:800;font-size:0.85rem;margin-bottom:6px;">🎟️ ${t('點數折抵 {n}%', '{n}% off with points').replace('{n}', String(Number(pl.discountPct)))}</div>` : '';
      const text = pl.kind === 'merchant' ? pl.description : (pl.message || pl.description);
      const html = `
        <div style="font-family: system-ui, sans-serif; min-width: 180px; max-width: 240px; color:#1e293b;">
          ${photo}
          <div style="font-size:0.72rem;color:#64748b;margin-bottom:2px;">${st.emoji} ${escapeHtml(kindLabel)}</div>
          <div style="font-weight:800;font-size:1.05rem;margin-bottom:4px;">${escapeHtml(pl.name)}</div>
          ${discount}
          ${text ? `<div style="font-size:0.85rem;color:#334155;line-height:1.5;margin-bottom:6px;white-space:pre-wrap;">${escapeHtml(text)}</div>` : ''}
          <div style="font-size:0.8rem;color:#64748b;margin-bottom:2px;">📍 <a href="${mapsUrl}" target="_blank" rel="noopener noreferrer" style="color:#2563eb;">${escapeHtml(pl.address)}</a></div>
          ${pl.hours ? `<div style="font-size:0.8rem;color:#64748b;">🕒 ${escapeHtml(pl.hours)}</div>` : ''}
          ${pl.phone ? `<div style="font-size:0.8rem;color:#64748b;">☎️ ${escapeHtml(pl.phone)}</div>` : ''}
          ${pl.website ? `<div style="font-size:0.8rem;"><a href="${escapeHtml(pl.website)}" target="_blank" rel="noopener noreferrer" style="color:#2563eb;">🔗 ${escapeHtml(pl.website.replace(/^https?:\/\//, ''))}</a></div>` : ''}
          ${pl.kind === 'merchant' ? `<button class="map-redeem-btn" data-place-id="${escapeHtml(pl.id)}" style="margin-top:8px;width:100%;background:#f59e0b;color:#fff;border:none;border-radius:8px;padding:0.45rem 0.8rem;font-weight:800;cursor:pointer;">🎟️ ${escapeHtml(t('產生兌換券', 'Get a voucher'))}</button>` : ''}
        </div>`;
      marker.bindPopup(L.popup({ maxWidth: 260, className: 'verse-map-popup' }).setContent(html));
      marker.on('click', (ev) => { L.DomEvent.stopPropagation(ev); });
      marker.addTo(layer);
      byId.set(pl.id, marker);
    });
    // Arrived from the 3D globe with a place selected: open it once.
    const want = focusLocation && focusLocation.placeId;
    if (want && byId.has(want) && openedPlaceRef.current !== want) {
      openedPlaceRef.current = want;
      const m = byId.get(want);
      setTimeout(() => { try { map.setView(m.getLatLng(), Math.max(map.getZoom(), 14), { animate: false }); m.openPopup(); } catch { /* noop */ } }, 150);
    }
  }, [mapReady, places, placesMode, focusLocation, t]);

  // 即時脈動:訂閱 window 事件,從對應玩家的點盪出光波(imperative,不觸發 React
  // 重繪/重建標記)。只掛一次,靠 ref 讀取當前 map 與 name→marker 對照。
  useEffect(() => {
    const onPulse = (e) => {
      const map = leafletMapRef.current;
      const L = window.L;
      if (!map || !L) return;
      const { name, action } = (e && e.detail) || {};
      const marker = markersByNameRef.current[name];
      if (!marker) return; // 沒座標/尚未載入 → 略過

      // 同名 600ms 內去重
      const key = name + ':' + action;
      const now = Date.now();
      if (now - (lastPulseAt[key] || 0) < 600) return;
      lastPulseAt[key] = now;

      // 塞車保護:太多同時漣漪時,只保留 done(高潮)
      if (activePulseCount > 40 && action !== 'done' && action !== 'fruit') return;

      const { html, life } = buildPulseHtml(action);
      const icon = L.divIcon({ className: 'vr-pulse-icon', html, iconSize: [0, 0], iconAnchor: [0, 0] });
      let ripple;
      try {
        ripple = L.marker(marker.getLatLng(), { icon, interactive: false, keyboard: false, zIndexOffset: -1000 }).addTo(map);
      } catch { return; }
      activePulseCount++;
      setTimeout(() => {
        try { map.removeLayer(ripple); } catch {}
        activePulseCount = Math.max(0, activePulseCount - 1);
      }, life);

      // 交響音效(僅在使用者開啟聲音時)
      if (soundOnRef.current) { try { playToneRef.current?.(action); } catch {} }
    };
    window.addEventListener('verserain:pulse', onPulse);
    return () => window.removeEventListener('verserain:pulse', onPulse);
  }, []);

  return (
    <div>
      {/* Stats bar */}
      <div style={{ padding: '0.8rem 2rem', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', gap: '2rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ color: '#475569', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span>🌍 <strong style={{ color: '#0ea5e9' }}>{players.length}</strong> {t('位玩家遍佈全球', 'players worldwide')}</span>
          {myTeams.length > 0 && (
            <>
              <span style={{ color: '#94a3b8' }}>·</span>
              {myTeams.map(tm => {
                const isSelected = selectedTeam === tm.id;
                const visibleMembers = players.filter(p => tm.memberNames.has(p.name));
                return (
                  <button
                    key={tm.id}
                    title={t('{name} · 已上線 {n}/{total} 位', '{name} · {n}/{total} on the map')
                      .replace('{name}', tm.name)
                      .replace('{n}', String(visibleMembers.length))
                      .replace('{total}', String(tm.memberNames.size))}
                    onClick={() => {
                      if (isSelected) {
                        setSelectedTeam(null);
                        return;
                      }
                      setSelectedTeam(tm.id);
                      setSelectedRoom(null);
                      const inView = players.filter(p => tm.memberNames.has(p.name));
                      if (inView.length > 0 && leafletMapRef.current) {
                        const lats = inView.map(p => p.lat);
                        const lngs = inView.map(p => p.lng);
                        // When all members are in roughly the same spot
                        // (e.g. one city) flyToBounds becomes a no-op zoom;
                        // pad generously and cap zoom so we still feel a
                        // meaningful focus move.
                        leafletMapRef.current.flyToBounds([
                          [Math.min(...lats), Math.min(...lngs)],
                          [Math.max(...lats), Math.max(...lngs)]
                        ], { padding: [80, 80], maxZoom: 11, animate: true, duration: 1 });
                      }
                    }}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      background: isSelected ? '#f97316' : '#fff7ed',
                      color: isSelected ? '#fff' : '#9a3412',
                      border: `1px solid ${isSelected ? '#ea580c' : '#fed7aa'}`,
                      borderRadius: '99px', padding: '2px 10px',
                      fontSize: '0.78rem', fontWeight: 'bold', cursor: 'pointer',
                      transition: 'transform 0.15s, background 0.15s',
                    }}
                    onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                    onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                  >
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: isSelected ? '#fff' : '#f97316', display: 'inline-block' }} />
                    {tm.name} ({visibleMembers.length}/{tm.memberNames.size})
                  </button>
                );
              })}
            </>
          )}
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
                  {rid} {t('({n} 人)', '({n} people)').replace('{n}', String(players.filter(p => p.roomId === rid).length))}
                </button>
              ))}
            </div>
          ) : null;
        })()}

        <div style={{ marginLeft: 'auto', display: 'flex', gap: '10px' }}>
          <button
            title={soundOn ? t('關閉聲音', 'Mute') : t('開啟交響音效', 'Play the symphony')}
            onClick={() => {
              setSoundOn(v => {
                const n = !v;
                try { localStorage.setItem('verseRain_mapSound', n ? '1' : '0'); } catch {}
                if (n) { onEnableAudio?.(); playTone?.('play'); } // 手勢內解鎖 + 試響一聲
                return n;
              });
            }}
            style={{ background: soundOn ? '#0ea5e9' : '#e2e8f0', color: soundOn ? '#fff' : '#475569', border: 'none', padding: '0.3rem 0.7rem', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.8rem' }}
          >
            {soundOn ? '🔊' : '🔈'} {t('聲音', 'Sound')}
          </button>
          {playerName && onToggleFruit && (
            <button
              title={t('看看你推薦的人在哪裡', 'See where the people you invited are')}
              onClick={() => onToggleFruit()}
              style={{ background: fruitMode ? '#f59e0b' : '#fef3c7', color: fruitMode ? '#fff' : '#92400e', border: 'none', padding: '0.3rem 0.8rem', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.8rem' }}
            >
              🍎 {t('我的果子', 'My Fruit')}{fruitLoading ? ' …' : (fruitMode && fruitTree ? ` (${(fruitTree.level1 || []).length + (fruitTree.level2 || []).length})` : '')}
            </button>
          )}
          {onTogglePlaces && (
            <button
              title={t('顯示贊助的商家、教會與機構', 'Show sponsoring shops, churches and organisations')}
              onClick={() => onTogglePlaces()}
              style={{ background: placesMode ? '#d97706' : '#fef3c7', color: placesMode ? '#fff' : '#92400e', border: 'none', padding: '0.3rem 0.8rem', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.8rem' }}
            >
              🏪 {t('商家', 'Shops')}{places.length ? ` (${places.length})` : ''}
            </button>
          )}
          <button
            title={t('切換 2D / 3D 地球', 'Toggle 2D / 3D globe')}
            onClick={() => onToggleMode?.()}
            style={{ background: '#1e293b', color: '#fff', border: 'none', padding: '0.3rem 0.8rem', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.8rem' }}
          >
            🌐 {t('3D 地球', '3D Globe')}
          </button>
          <button
            onClick={() => {
              if (leafletMapRef.current) {
                leafletMapRef.current.setView([20, 0], 2, { animate: true });
                setSelectedRoom(null);
                setSelectedTeam(null);
              }
            }}
            style={{ background: '#fbbf24', color: '#78350f', border: 'none', padding: '0.3rem 0.8rem', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.8rem' }}
          >
            🌍 {t('全球', 'Global')}
          </button>
        </div>
      </div>

      {/* Map container */}
      {loading ? (
        <div style={{ height: '500px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '1.1rem', background: '#f8fafc' }}>
          ⏳ {t('載入地圖中...', 'Loading map...')}
        </div>
      ) : (
        <div dir="ltr" style={{ position: 'relative' }}>
          {error && (
            <div style={{ position: 'absolute', top: '10px', left: '50%', transform: 'translateX(-50%)', zIndex: 1000, background: '#ef4444', color: 'white', padding: '4px 12px', borderRadius: '20px', fontSize: '0.8rem', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>
              ⚠️ {error}
            </div>
          )}
          <div className="verse-map-frame" ref={mapRef} style={{ height: '520px', width: '100%', background: '#051936' }} />
          {/* 圖例:大小=塊地數 · 亮度=近7天活躍 */}
          <div style={{ position: 'absolute', top: '14px', right: '14px', zIndex: 1000, background: 'rgba(4,16,31,0.82)', border: '1px solid #14324f', borderRadius: '10px', padding: '9px 11px', color: '#e2e8f0', fontSize: '0.7rem', lineHeight: 1.5, pointerEvents: 'none', backdropFilter: 'blur(2px)', maxWidth: '190px' }}>
            <div style={{ fontWeight: 700, marginBottom: '5px', color: '#f8fafc' }}>{t('地上的光點', 'Lights on Earth')}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 }}>
              <span style={{ display: 'inline-flex', alignItems: 'flex-end', gap: 4 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#fbbf24', boxShadow: '0 0 8px rgba(251,191,36,0.8)' }} />
                <span style={{ width: 14, height: 14, borderRadius: '50%', background: '#fbbf24', boxShadow: '0 0 10px rgba(251,191,36,0.8)' }} />
              </span>
              <span>{t('大小 = 塊地數', 'size = plots')}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                <span style={{ width: 11, height: 11, borderRadius: '50%', background: '#7c5230', boxShadow: '0 0 5px rgba(150,100,60,0.45)' }} />
                <span style={{ width: 11, height: 11, borderRadius: '50%', background: '#fbbf24', boxShadow: '0 0 9px rgba(251,191,36,0.85)' }} />
                <span style={{ width: 11, height: 11, borderRadius: '50%', background: '#ffffff', boxShadow: '0 0 6px #fff, 0 0 12px rgba(191,219,254,1)' }} />
              </span>
              <span>{t('亮度 = 近7天活躍', 'glow = 7-day activity')}</span>
            </div>
            {placesMode && places.length > 0 && (
              <div style={{ marginTop: 6, paddingTop: 6, borderTop: '1px solid #14324f' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 3 }}>
                  <span style={{ width: 14, height: 14, borderRadius: 4, background: '#e11d48', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 9 }}>🏪</span>
                  <span>{t('商家 = 點數折抵', 'shop = points discount')}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                    <span style={{ width: 14, height: 14, borderRadius: '50%', background: '#7c3aed', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 9 }}>⛪</span>
                    <span style={{ width: 14, height: 14, borderRadius: 4, background: '#0d9488', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 9 }}>🏢</span>
                  </span>
                  <span>{t('教會、機構 = 贊助者', 'church / org = sponsor')}</span>
                </div>
              </div>
            )}
            {fruitMode && fruitTree && (
              <div style={{ marginTop: 6, paddingTop: 6, borderTop: '1px solid #14324f' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 3 }}>
                  <span style={{ width: 22, height: 0, borderTop: '2.5px solid #fbbf24' }} />
                  <span>{t('金線 = 我推薦的人', 'gold = people I invited')}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 3 }}>
                  <span style={{ width: 22, height: 0, borderTop: '1.5px dashed #fde68a' }} />
                  <span>{t('虛線 = 他們推薦的人', 'dashed = people they invited')}</span>
                </div>
                <div style={{ color: '#fcd34d', fontWeight: 700 }}>{t('第一層 {a} · 第二層 {b}', 'level 1: {a} · level 2: {b}').replace('{a}', String((fruitTree.level1 || []).length)).replace('{b}', String((fruitTree.level2 || []).length))}</div>
              </div>
            )}
          </div>
          {fruitMode && fruitTree && (fruitTree.level1 || []).length + (fruitTree.level2 || []).length === 0 && (
            <div style={{ position: 'absolute', bottom: '18px', left: '50%', transform: 'translateX(-50%)', zIndex: 1000, background: 'rgba(4,16,31,0.85)', color: '#fde68a', padding: '6px 14px', borderRadius: '20px', fontSize: '0.85rem', pointerEvents: 'none', whiteSpace: 'nowrap' }}>
              🍎 {t('還沒有果子——把邀請連結分享給朋友吧', 'No fruit yet — share your invite link with a friend')}
            </div>
          )}
          {fruitMode && fruitTree && (fruitTree.level1 || []).length + (fruitTree.level2 || []).length > 0 && !players.some(p => p.name === playerName) && !selfLocation && (
            <div style={{ position: 'absolute', bottom: '18px', left: '50%', transform: 'translateX(-50%)', zIndex: 1000, background: 'rgba(4,16,31,0.85)', color: '#fde68a', padding: '6px 14px', borderRadius: '20px', fontSize: '0.85rem', pointerEvents: 'none', whiteSpace: 'nowrap' }}>
              {t('找不到你的位置，只標出果子', 'Your location is unknown; fruit highlighted only')}
            </div>
          )}
          {players.length === 0 && !error && (
            <div style={{ position: 'relative', top: '-260px', textAlign: 'center', color: '#94a3b8', pointerEvents: 'none', fontSize: '1rem' }}>
              {t('還沒有玩家資料，完成一局遊戲後你的位置就會出現！', 'No players yet — complete a game to appear on the map!')}
            </div>
          )}
        </div>
      )}

      <style>{`
        /* 即時脈動漣漪(發光衝擊波) */
        .vr-pulse-icon { position: absolute; }
        .vr-pulse-blast {
          position: absolute; left: 0; top: 0; border-radius: 50%;
          transform: translate(-50%, -50%) scale(0);
          background: radial-gradient(circle, rgba(var(--vr-rgb),0.5) 0%, rgba(var(--vr-rgb),0.16) 42%, transparent 70%);
          animation: vr-blast var(--vr-dur) cubic-bezier(.2,.7,.3,1) forwards;
          pointer-events: none;
        }
        .vr-pulse-ring {
          position: absolute; left: 0; top: 0; border-radius: 50%;
          border: 4px solid rgba(var(--vr-rgb),0.95);
          box-shadow: 0 0 28px rgba(var(--vr-rgb),0.9), inset 0 0 14px rgba(var(--vr-rgb),0.8);
          transform: translate(-50%, -50%);
          animation: vr-ripple var(--vr-dur) cubic-bezier(.2,.7,.3,1) forwards;
          pointer-events: none; will-change: width, height, opacity;
        }
        .vr-pulse-flash {
          position: absolute; left: 0; top: 0; width: 20px; height: 20px;
          border-radius: 50%; background: #fff;
          box-shadow: 0 0 24px rgba(var(--vr-rgb),1), 0 0 38px rgba(255,255,255,0.7);
          transform: translate(-50%, -50%) scale(0.4);
          animation: vr-flash 700ms ease-out forwards;
          pointer-events: none;
        }
        @keyframes vr-ripple {
          from { width: 6px; height: 6px; opacity: 0.95; }
          15% { opacity: 0.9; }
          to { width: var(--vr-max); height: var(--vr-max); opacity: 0; }
        }
        @keyframes vr-blast {
          from { transform: translate(-50%,-50%) scale(0); opacity: 0.9; }
          to { transform: translate(-50%,-50%) scale(1); opacity: 0; }
        }
        @keyframes vr-flash {
          0% { transform: translate(-50%,-50%) scale(0.4); opacity: 1; }
          100% { transform: translate(-50%,-50%) scale(2.6); opacity: 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          .vr-pulse-ring, .vr-pulse-blast, .vr-pulse-flash { animation-duration: 700ms !important; }
        }
        .verse-map-frame {
          isolation: isolate;
          background:
            radial-gradient(circle at 22% 26%, rgba(29, 78, 216, 0.28), transparent 34%),
            radial-gradient(circle at 78% 72%, rgba(20, 83, 45, 0.18), transparent 35%),
            #051936 !important;
        }
        .verse-map-frame::after {
          content: '';
          position: absolute;
          inset: 0;
          z-index: 390;
          pointer-events: none;
          background:
            radial-gradient(circle at 48% 12%, rgba(14, 165, 233, 0.09), transparent 26%),
            linear-gradient(180deg, rgba(5, 25, 54, 0.04), rgba(5, 25, 54, 0.22));
        }
        .verse-map-frame .leaflet-tile-pane {
          background: #051936;
        }
        .verse-map-frame .verse-map-labels {
          opacity: 0.56;
          filter: saturate(0.35) brightness(1.45) contrast(0.9);
          mix-blend-mode: screen;
        }
        .verse-map-frame .verse-map-fallback-tiles {
          filter: sepia(0.52) saturate(2.7) hue-rotate(54deg) brightness(0.42) contrast(1.34);
        }
        .verse-map-frame .leaflet-marker-pane,
        .verse-map-frame .leaflet-popup-pane,
        .verse-map-frame .leaflet-control-container {
          position: relative;
          z-index: 500;
        }
        .verse-map-frame .leaflet-control-zoom a {
          background: rgba(236, 253, 245, 0.94);
          color: #0f3f4a;
          border-bottom-color: rgba(15, 63, 74, 0.18);
        }
        .verse-map-frame .leaflet-control-attribution {
          background: rgba(8, 47, 63, 0.72);
          color: rgba(224, 242, 254, 0.78);
        }
        .verse-map-frame .leaflet-control-attribution a {
          color: #bae6fd;
        }
        .verse-map-popup .leaflet-popup-content-wrapper {
          border-radius: 10px;
          box-shadow: 0 8px 24px rgba(0,0,0,0.2);
          border: 1px solid #e2e8f0;
        }
        .verse-map-popup .leaflet-popup-tip { background: white; }
        .vr-place-marker { background: transparent; border: none; }
      `}</style>
    </div>
  );
}
