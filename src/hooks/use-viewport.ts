// Reactive viewport-size + input-modality hook for responsive layouts.
//
// We use this in the WYSIWYG editor to switch between desktop (3-column)
// and mobile (drawer) layouts, and to decide when to fall back to
// tap-to-place vs drag-and-drop. The breakpoints match Tailwind's `lg` (1024px)
// since that's the threshold at which the existing 3-column layout starts
// to feel cramped.
//
// We avoid reading window inside render — SSR safety isn't critical here
// (this is a pure-browser app) but the listener pattern matters: passive
// resize handling, no layout thrash.

import { useEffect, useState } from 'react';

const LG_BREAKPOINT = 1024;

export interface ViewportState {
  /** Inner width in CSS pixels. 0 during SSR / pre-mount. */
  width: number;
  /** True for viewports under Tailwind's `lg` breakpoint (1024px). */
  isCompact: boolean;
  /**
   * True when the primary input is touch (PointerEvent type === 'touch'
   * on most recent click) OR the device has no fine pointer at all.
   * Used to decide whether to surface the tap-to-place fallback for
   * the WYSIWYG editor. We don't conflate touch with `isCompact` —
   * a Surface tablet in landscape is wide AND touch-primary.
   */
  isTouchPrimary: boolean;
}

function readInitialState(): ViewportState {
  if (typeof window === 'undefined') {
    return { width: 0, isCompact: false, isTouchPrimary: false };
  }
  const width = window.innerWidth;
  const coarsePointer = window.matchMedia?.('(pointer: coarse)').matches ?? false;
  const noFinePointer = !(window.matchMedia?.('(any-pointer: fine)').matches ?? true);
  return {
    width,
    isCompact: width < LG_BREAKPOINT,
    isTouchPrimary: coarsePointer || noFinePointer,
  };
}

export function useViewport(): ViewportState {
  const [state, setState] = useState<ViewportState>(readInitialState);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onChange = () => {
      const width = window.innerWidth;
      const coarsePointer = window.matchMedia?.('(pointer: coarse)').matches ?? false;
      const noFinePointer = !(window.matchMedia?.('(any-pointer: fine)').matches ?? true);
      setState({
        width,
        isCompact: width < LG_BREAKPOINT,
        isTouchPrimary: coarsePointer || noFinePointer,
      });
    };
    window.addEventListener('resize', onChange, { passive: true });
    window.addEventListener('orientationchange', onChange, { passive: true });
    // Pointer-modality can change without a resize (plug a mouse into an
    // iPad, dock a tablet to a keyboard). matchMedia change events fire
    // independently of resize so the touch fallback UI updates correctly.
    const coarseMql = window.matchMedia?.('(pointer: coarse)');
    const fineMql = window.matchMedia?.('(any-pointer: fine)');
    coarseMql?.addEventListener?.('change', onChange);
    fineMql?.addEventListener?.('change', onChange);
    return () => {
      window.removeEventListener('resize', onChange);
      window.removeEventListener('orientationchange', onChange);
      coarseMql?.removeEventListener?.('change', onChange);
      fineMql?.removeEventListener?.('change', onChange);
    };
  }, []);

  return state;
}
