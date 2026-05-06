import { useEffect, useRef } from 'react';
import { useSwipeable, SwipeEventData } from 'react-swipeable';

interface EdgeSwipeOptions {
  onEdgeSwipe?: (edge: 'top' | 'bottom' | 'left' | 'right') => void;
  edgeThreshold?: number; // Distance from edge to trigger (default 50px)
  enabled?: boolean;
}

export function useEdgeSwipe({
  onEdgeSwipe,
  edgeThreshold = 50,
  enabled = true,
}: EdgeSwipeOptions = {}) {
  const isSwipingRef = useRef(false);

  const checkEdgeSwipe = (
    eventData: SwipeEventData,
    direction: 'up' | 'down' | 'left' | 'right'
  ) => {
    if (!enabled || !onEdgeSwipe || !eventData || !eventData.initial) return;

    const [startX, startY] = eventData.initial;
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;

    switch (direction) {
      case 'down':
        if (startY < edgeThreshold) onEdgeSwipe('top');
        break;
      case 'up':
        if (startY > screenHeight - edgeThreshold) onEdgeSwipe('bottom');
        break;
      case 'right':
        if (startX < edgeThreshold) onEdgeSwipe('left');
        break;
      case 'left':
        if (startX > screenWidth - edgeThreshold) onEdgeSwipe('right');
        break;
    }
  };

  const handlers = useSwipeable({
    onSwipedDown: (eventData) => {
      checkEdgeSwipe(eventData, 'down');
    },
    onSwipedUp: (eventData) => {
      checkEdgeSwipe(eventData, 'up');
    },
    onSwipedLeft: (eventData) => {
      checkEdgeSwipe(eventData, 'left');
    },
    onSwipedRight: (eventData) => {
      checkEdgeSwipe(eventData, 'right');
    },
    onSwipeStart: () => {
      isSwipingRef.current = true;
    },
    onSwiped: () => {
      isSwipingRef.current = false;
    },
    preventScrollOnSwipe: false,
    trackMouse: false,
    trackTouch: true,
    delta: 10,
    swipeDuration: 500,
  });

  // Attach handlers to document.body for global edge-swipe detection.
  // react-swipeable's `ref` callback wires its internal listeners; we
  // pass body so a swipe anywhere on the page can be matched against
  // the edge threshold.
  useEffect(() => {
    if (!enabled) return;
    handlers.ref(document.body);
  }, [enabled, handlers]);

  return {
    handlers,
    isSwipingRef,
  };
}
