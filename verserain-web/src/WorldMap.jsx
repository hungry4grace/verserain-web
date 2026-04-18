import React, { useState, useEffect } from 'react';
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

  if (mapMode === '2d') {
    return (
      <WorldMap2D 
        {...props} 
        currentMode={mapMode} 
        onToggleMode={switchTo2D} 
        focusLocation={focusLocation}
      />
    );
  }

  return (
    <WorldMap3D 
      {...props} 
      currentMode={mapMode} 
      onToggleMode={switchTo2D} 
    />
  );
}
