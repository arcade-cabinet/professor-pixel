import { useState, useEffect } from 'react';

export type OrientationType = 'portrait' | 'landscape';

interface OrientationState {
  isPortrait: boolean;
  isLandscape: boolean;
  orientation: OrientationType;
  angle: number;
}

export function useOrientation(): OrientationState {
  const [orientation, setOrientation] = useState<OrientationState>(() => {
    // Initial orientation based on window dimensions
    const isPortrait = window.innerHeight > window.innerWidth;
    return {
      isPortrait,
      isLandscape: !isPortrait,
      orientation: isPortrait ? 'portrait' : 'landscape',
      angle: 0
    };
  });

  useEffect(() => {
    const handleOrientationChange = () => {
      const isPortrait = window.innerHeight > window.innerWidth;
      const angle = (window.screen as any)?.orientation?.angle || 0;
      
      setOrientation({
        isPortrait,
        isLandscape: !isPortrait,
        orientation: isPortrait ? 'portrait' : 'landscape',
        angle
      });
    };

    // Listen for both resize and orientationchange events
    window.addEventListener('resize', handleOrientationChange);
    window.addEventListener('orientationchange', handleOrientationChange);
    
    // Also listen for screen orientation API if available
    if (window.screen?.orientation) {
      window.screen.orientation.addEventListener('change', handleOrientationChange);
    }

    // Initial check
    handleOrientationChange();

    return () => {
      window.removeEventListener('resize', handleOrientationChange);
      window.removeEventListener('orientationchange', handleOrientationChange);
      if (window.screen?.orientation) {
        window.screen.orientation.removeEventListener('change', handleOrientationChange);
      }
    };
  }, []);

  return orientation;
}