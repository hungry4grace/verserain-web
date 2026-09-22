import React, { useCallback, useEffect, useState } from 'react';
import WorldMap2D from './WorldMap2D';
import WorldMap3D from './WorldMap3D';

// Map places (merchants / churches / organisations) live here, in the wrapper
// that survives the 2D ↔ 3D toggle, so both maps share one fetch.
const PLACES_REFRESH_MS = 5 * 60 * 1000;

export default function WorldMap(props) {
  const [places, setPlaces] = useState([]);
  const [placesMode, setPlacesMode] = useState(() => {
    try { return localStorage.getItem('verseRain_mapPlaces') !== '0'; } catch { return true; }
  });
  useEffect(() => {
    let cancelled = false;
    const load = () => fetch('/api/places').then(r => (r.ok ? r.json() : { places: [] }))
      .then(d => { if (!cancelled) setPlaces(Array.isArray(d.places) ? d.places : []); })
      .catch(() => {});
    load();
    const id = setInterval(load, PLACES_REFRESH_MS);
    return () => { cancelled = true; clearInterval(id); };
  }, []);
  const onTogglePlaces = useCallback(() => {
    setPlacesMode(v => { const n = !v; try { localStorage.setItem('verseRain_mapPlaces', n ? '1' : '0'); } catch { /* ignore */ } return n; });
  }, []);
  const shared = { ...props, places, placesMode, onTogglePlaces };
  return props.currentMode === '3d'
    ? <WorldMap3D {...shared} />
    : <WorldMap2D {...shared} />;
}
