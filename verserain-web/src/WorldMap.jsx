import React, { useCallback, useEffect, useState } from 'react';
import WorldMap2D from './WorldMap2D';
import WorldMap3D from './WorldMap3D';

// Map places (merchants / churches / organisations) live here, in the wrapper
// that survives the 2D ↔ 3D toggle, so both maps share one fetch.
const PLACES_REFRESH_MS = 5 * 60 * 1000;

// placesVersion: bumped by the app after an admin approves / hides a marker
// or a charity pool, so the map refetches at once — with a query string, so
// the request skips the CDN copy of /api/places instead of re-reading it.
export default function WorldMap(props) {
  const placesVersion = Number(props.placesVersion) || 0;
  const [places, setPlaces] = useState([]);
  const [placesMode, setPlacesMode] = useState(() => {
    try { return localStorage.getItem('verseRain_mapPlaces') !== '0'; } catch { return true; }
  });
  useEffect(() => {
    let cancelled = false;
    const load = (fresh) => fetch(fresh ? `/api/places?fresh=${fresh}` : '/api/places').then(r => (r.ok ? r.json() : { places: [] }))
      .then(d => { if (!cancelled) setPlaces(Array.isArray(d.places) ? d.places : []); })
      .catch(() => {});
    load(placesVersion > 0 ? `${placesVersion}-${Date.now()}` : '');
    const id = setInterval(() => load(''), PLACES_REFRESH_MS);
    // Coming back to the tab after a while: pick up markers approved meanwhile.
    const onVisible = () => { if (typeof document !== 'undefined' && document.visibilityState === 'visible') load(''); };
    if (typeof document !== 'undefined') document.addEventListener('visibilitychange', onVisible);
    return () => { cancelled = true; clearInterval(id); if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', onVisible); };
  }, [placesVersion]);
  const onTogglePlaces = useCallback(() => {
    setPlacesMode(v => { const n = !v; try { localStorage.setItem('verseRain_mapPlaces', n ? '1' : '0'); } catch { /* ignore */ } return n; });
  }, []);
  const shared = { ...props, places, placesMode, onTogglePlaces };
  return props.currentMode === '3d'
    ? <WorldMap3D {...shared} />
    : <WorldMap2D {...shared} />;
}
