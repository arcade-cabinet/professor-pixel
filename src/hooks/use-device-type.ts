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

// Module-level: pure function over the global `window`, no closure state.
// Hoisting it out of the hook stops Biome flagging it as a missing
// useEffect dep — and also avoids the per-render allocation.
const SSR_DEFAULT_CAPABILITIES: DeviceCapabilities = {
  deviceType: 'desktop',
  isMobile: false,
  isTablet: false,
  isDesktop: true,
  isFoldable: false,
  screenWidth: 1024,
  screenHeight: 768,
  isTouchDevice: false,
  pixelRatio: 1,
};

function getDeviceCapabilities(): DeviceCapabilities {
  // SSR / jsdom-without-window guards. The hook may run during the first
  // render before the browser env is fully wired (esp. under @vitest/browser
  // when the iframe boots).
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return SSR_DEFAULT_CAPABILITIES;
  }

  const width = window.innerWidth;
  const height = window.innerHeight;
  const pixelRatio = window.devicePixelRatio || 1;

  // Check if touch device
  const isTouchDevice =
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    ((navigator as Navigator & { msMaxTouchPoints?: number }).msMaxTouchPoints ?? 0) > 0;

  // Detect foldable devices. Two reachable cases:
  //   - Unfolded: tall/wide aspect ratio (Galaxy Z Fold rotated, Surface Duo
  //     spanned across its hinge). width > 768, aspectRatio > 2.1.
  //   - Folded:  narrow (<= 768px) but unusually tall pixel-ratio combo that
  //     the major foldables ship with. We key off height >= 800 to filter
  //     ordinary phones from foldables in their folded state.
  const aspectRatio = Math.max(width, height) / Math.min(width, height);
  const isUnfoldedFoldable = isTouchDevice && width > 768 && aspectRatio > 2.1;
  const isHingedTablet = isTouchDevice && width > 820 && width < 1024 && height > 1000; // Galaxy Fold, Surface Duo unfolded
  const isFoldedFoldable = isTouchDevice && width <= 768 && height >= 800 && pixelRatio >= 2.5; // Z Fold/Flip outer screen
  const isFoldable = isUnfoldedFoldable || isHingedTablet || isFoldedFoldable;

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
    pixelRatio,
  };
}

export function useDeviceType(): DeviceCapabilities {
  const [capabilities, setCapabilities] = useState<DeviceCapabilities>(() =>
    getDeviceCapabilities()
  );

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
