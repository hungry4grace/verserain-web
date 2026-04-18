import React, { useState, useEffect } from 'react';
import WorldMap2D from './WorldMap2D';
import WorldMap3D from './WorldMap3D';

export default function WorldMap(props) {
  // Read from localStorage to remember preference
  const [mapMode, setMapMode] = useState(() => {
    return localStorage.getItem('verserain-map-mode') || '3d';
  });

  const toggleMode = () => {
    setMapMode(prev => {
      const newMode = prev === '3d' ? '2d' : '3d';
      localStorage.setItem('verserain-map-mode', newMode);
      return newMode;
    });
  };

  if (mapMode === '2d') {
    return (
      <WorldMap2D 
        {...props} 
        currentMode={mapMode} 
        onToggleMode={toggleMode} 
      />
    );
  }

  return (
    <WorldMap3D 
      {...props} 
      currentMode={mapMode} 
      onToggleMode={toggleMode} 
    />
  );
}
