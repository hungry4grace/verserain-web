import { useEffect, useRef } from 'react';
import { loadLeaflet } from './leafletLoader';

// A small Leaflet map with one draggable pin, used when a merchant / church
// registers a map marker: the address is geocoded first, then the owner can
// nudge the pin to the exact door. Light "voyager" tiles so street names read.
// Plain OpenStreetMap tiles: CARTO's light raster set now needs an API key.
const TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

export default function PlacePinMap({ lat, lng, zoom = 16, onChange, height = 260 }) {
  const elRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const onChangeRef = useRef(onChange);
  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);

  useEffect(() => {
    let cancelled = false;
    loadLeaflet().then((L) => {
      if (cancelled || !elRef.current || mapRef.current) return;
      const map = L.map(elRef.current, { zoomControl: true, attributionControl: true }).setView([lat, lng], zoom);
      L.tileLayer(TILE_URL, { attribution: '© OpenStreetMap contributors', maxZoom: 19 }).addTo(map);
      const marker = L.marker([lat, lng], { draggable: true }).addTo(map);
      marker.on('dragend', () => {
        const p = marker.getLatLng();
        onChangeRef.current?.({ lat: Number(p.lat.toFixed(5)), lng: Number(p.lng.toFixed(5)) });
      });
      map.on('click', (e) => {
        marker.setLatLng(e.latlng);
        onChangeRef.current?.({ lat: Number(e.latlng.lat.toFixed(5)), lng: Number(e.latlng.lng.toFixed(5)) });
      });
      mapRef.current = map;
      markerRef.current = marker;
    }).catch(() => {});
    return () => {
      cancelled = true;
      try { mapRef.current?.remove(); } catch { /* noop */ }
      mapRef.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // External coordinate change (a new geocode result): move the pin and view.
  useEffect(() => {
    const map = mapRef.current, marker = markerRef.current;
    if (!map || !marker) return;
    const cur = marker.getLatLng();
    if (Math.abs(cur.lat - lat) < 1e-6 && Math.abs(cur.lng - lng) < 1e-6) return;
    marker.setLatLng([lat, lng]);
    map.setView([lat, lng], Math.max(map.getZoom(), zoom), { animate: true });
  }, [lat, lng, zoom]);

  return <div ref={elRef} style={{ height, width: '100%', borderRadius: 10, overflow: 'hidden', border: '1px solid #cbd5e1', background: '#e2e8f0' }} />;
}
