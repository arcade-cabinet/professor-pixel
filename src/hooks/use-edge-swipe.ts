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
  enabled = true
}: EdgeSwipeOptions = {}) {
  const isSwipingRef = useRef(false);
  
  const checkEdgeSwipe = (eventData: SwipeEventData, direction: 'up' | 'down' | 'left' | 'right') => {
    if (!enabled || !onEdgeSwipe || !eventData || !eventData.initial) return;
    
    const [startX, startY] = eventData.initial;
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    
    // Debug logging
    console.log('Edge swipe check:', { direction, startX, startY, screenWidth, screenHeight, edgeThreshold });
    
    // Check which edge the swipe started from
    switch (direction) {
      case 'down':
        // Swipe down from top edge
        if (startY < edgeThreshold) {
          onEdgeSwipe('top');
        }
        break;
      case 'up':
        // Swipe up from bottom edge
        if (startY > screenHeight - edgeThreshold) {
          onEdgeSwipe('bottom');
        }
        break;
      case 'right':
        // Swipe right from left edge
        if (startX < edgeThreshold) {
          console.log('Left edge swipe detected!');
          onEdgeSwipe('left');
        }
        break;
      case 'left':
        // Swipe left from right edge
        if (startX > screenWidth - edgeThreshold) {
          onEdgeSwipe('right');
        }
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
    trackMouse: true, // Enable for testing
    trackTouch: true,
    delta: 10, // Min distance to be considered a swipe
    swipeDuration: 500, // Max time for swipe
  });

  // Attach handlers to the document body for global edge swipe detection
  useEffect(() => {
    if (!enabled) return;

    const element = document.body;
    const refPassthrough = (el: HTMLElement) => {
      handlers.ref(el);
    };

    refPassthrough(element);

    return () => {
      // Clean up if needed
    };
  }, [enabled, handlers]);

  return {
    handlers,
    isSwipingRef
  };
}