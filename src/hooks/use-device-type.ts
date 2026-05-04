import { useState, useEffect } from 'react';

export type DeviceType = 'mobile' | 'tablet' | 'desktop' | 'foldable';

interface DeviceCapabilities {
  deviceType: DeviceType;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isFoldable: boolean;
  screenWidth: number;
  screenHeight: number;
  isTouchDevice: boolean;
  pixelRatio: number;
}

export function useDeviceType(): DeviceCapabilities {
  const [capabilities, setCapabilities] = useState<DeviceCapabilities>(() => {
    return getDeviceCapabilities();
  });

  function getDeviceCapabilities(): DeviceCapabilities {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const pixelRatio = window.devicePixelRatio || 1;
    
    // Check if touch device
    const isTouchDevice = 'ontouchstart' in window || 
                         navigator.maxTouchPoints > 0 || 
                         (navigator as any).msMaxTouchPoints > 0;

    // Detect foldable devices (wider aspect ratio when unfolded)
    const aspectRatio = Math.max(width, height) / Math.min(width, height);
    const isFoldable = isTouchDevice && 
                      width > 768 && 
                      (aspectRatio > 2.1 || // Unfolded state
                       (width > 820 && width < 1024 && height > 1000)); // Galaxy Fold, Surface Duo

    // Determine device type based on screen size and capabilities
    let deviceType: DeviceType;
    let isMobile = false;
    let isTablet = false;
    let isDesktop = false;
    
    if (isFoldable) {
      deviceType = 'foldable';
      // Foldables can behave like tablets or mobile depending on state
      if (width < 768) {
        isMobile = true; // Folded state
      } else {
        isTablet = true; // Unfolded state
      }
    } else if (width < 768) {
      deviceType = 'mobile';
      isMobile = true;
    } else if (width >= 768 && width < 1024 && isTouchDevice) {
      deviceType = 'tablet';
      isTablet = true;
    } else {
      deviceType = 'desktop';
      isDesktop = true;
    }

    return {
      deviceType,
      isMobile,
      isTablet,
      isDesktop,
      isFoldable,
      screenWidth: width,
      screenHeight: height,
      isTouchDevice,
      pixelRatio
    };
  }

  useEffect(() => {
    const handleResize = () => {
      setCapabilities(getDeviceCapabilities());
    };

    // Listen for resize events (includes orientation changes)
    window.addEventListener('resize', handleResize);
    
    // Also listen for orientation change specifically
    window.addEventListener('orientationchange', handleResize);

    // Check on mount
    handleResize();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  return capabilities;
}