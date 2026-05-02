import React, { useState } from 'react';
import WorldMap2D from './WorldMap2D';
import WorldMap3D from './WorldMap3D';

export default function WorldMap(props) {
  // Always start with 3d map
  const [mapMode, setMapMode] = useState('3d');
  const [focusLocation, setFocusLocation] = useState(null);

  const switchTo2D = (targetLocation = null) => {
    if (targetLocation && targetLocation.lat) {
      setFocusLocation(targetLocation);
    }
    setMapMode('2d');
  };

  const switchTo3D = () => {
    setMapMode('3d');
  };

  return (
    <div style={{ position: 'relative' }}>
      <div style={{ position: 'absolute', top: '15px', right: '120px', zIndex: 1000, display: 'flex', gap: '5px' }}>
        <button
          onClick={switchTo3D}
          style={{
            background: mapMode === '3d' ? '#fbbf24' : '#1e293b',
            color: mapMode === '3d' ? '#fff' : '#94a3b8',
            border: '1px solid #334155',
            padding: '4px 12px',
            borderRadius: '20px 0 0 20px',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '0.8rem',
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
          }}
        >
          🌏 3D Globe
        </button>
        <button
          onClick={() => switchTo2D()}
          style={{
            background: mapMode === '2d' ? '#fbbf24' : '#1e293b',
            color: mapMode === '2d' ? '#fff' : '#94a3b8',
            border: '1px solid #334155',
            padding: '4px 12px',
            borderRadius: '0 20px 20px 0',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '0.8rem',
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
          }}
        >
          🗺️ 2D Flat
        </button>
      </div>

      {mapMode === '2d' ? (
        <WorldMap2D 
          {...props} 
          currentMode={mapMode} 
          onToggleMode={switchTo2D} 
          focusLocation={focusLocation}
        />
      ) : (
        <WorldMap3D 
          {...props} 
          currentMode={mapMode} 
          onToggleMode={switchTo2D} 
        />
      )}
    </div>
  );
}
