// The 'map' page — moved out of App.jsx unchanged (UI/UX 第 4 階段).
import { Map } from 'lucide-react';
import React from 'react';
import { initAudio, playPulseTone, playWelcomeFanfare } from '../lib/audio.js';
import { SHOW_CHARITY } from '../../api/_lib/features.js';

// The 3D globe (three / react-globe.gl) stays out of the initial bundle.
const WorldMap = React.lazy(() => import('../WorldMap'));

export default function MapPage({ t, handleViewPlayerGarden, isGuestJoinRef, joinRoomTimeoutRef, mapFocus, mapView, openRedeem, placesVersion, playerName, setCharityFocus, setContestFocus, setJoinRoomError, setMainTab, setMapFocus, setMapView, setMultiplayerRoomId, setMultiplayerRoomMode, setMultiplayerRoomRole, userEmail }) {
  // Lazy-load Leaflet only when map tab is opened
  return (
    <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #cbd5e1', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
      <div style={{ padding: '1.5rem 2rem 1rem', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <Map size={24} />
        <div>
          <h2 style={{ margin: 0, color: '#1e293b', fontSize: '1.2rem' }}>{t('誰在玩：全球玩家地圖', "Who's Playing: Global Player Map")} <button type="button" onClick={() => setMainTab('merchant')} style={{ marginLeft: 8, background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a', borderRadius: 999, padding: '0.15rem 0.7rem', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700, verticalAlign: 'middle' }}>🏪 {t('登記商家／教會', 'Register a shop / church')}</button></h2>
          <p style={{ margin: '2px 0 0', color: '#64748b', fontSize: '0.85rem' }}>{t('點擊標記查看玩家成績，雙擊遊戲房間加入戰局！', 'Click a marker to see scores, double click a room to join!')}</p>
        </div>
      </div>
      <React.Suspense fallback={<div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>{t('地圖載入中…', 'Loading map…')}</div>}>
      <WorldMap t={t} playerName={playerName} userEmail={userEmail} placesVersion={placesVersion}
        currentMode={mapView}
        focusLocation={mapFocus}
        onToggleMode={(coord) => {
          setMapView(v => (v === '2d' ? '3d' : '2d'));
          if (coord && typeof coord.lat === 'number') setMapFocus(coord);
        }}
        playTone={playPulseTone}
        playWelcome={playWelcomeFanfare}
        onEnableAudio={initAudio}
        onRedeem={openRedeem}
        onOpenPool={SHOW_CHARITY ? (poolId) => { setCharityFocus(poolId); setMainTab('charity'); } : undefined}
        onOpenContest={(contestId) => { setContestFocus(contestId); setMainTab('contests'); }}
        onViewGarden={(name) => {
        handleViewPlayerGarden(name);
      }} onJoinRoom={(roomId) => {
        setMainTab('multiplayer');
        setJoinRoomError(null);
        isGuestJoinRef.current = true;
        setMultiplayerRoomMode(null);
        setMultiplayerRoomRole('player');
        setMultiplayerRoomId(roomId);
        if (joinRoomTimeoutRef.current) clearTimeout(joinRoomTimeoutRef.current);
        joinRoomTimeoutRef.current = setTimeout(() => {
          if (isGuestJoinRef.current) {
            setJoinRoomError(roomId);
            setMultiplayerRoomMode(null);
            setMultiplayerRoomRole('player');
            setMultiplayerRoomId(null);
            isGuestJoinRef.current = false;
          }
        }, 5000);
      }} />
      </React.Suspense>
    </div>
  );
}
