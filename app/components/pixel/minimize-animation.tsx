import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import pixelImage from '@assets/pixel/Pixel_happy_excited_expression_22a41625.png';

interface PixelMinimizeAnimationProps {
  message?: string;
  onAnimationComplete: () => void;
  isMobile: boolean;
}

export default function PixelMinimizeAnimation({
  message = "I'll be right here if you need me!",
  onAnimationComplete,
  isMobile
}: PixelMinimizeAnimationProps) {
  const [phase, setPhase] = useState<'message' | 'animating' | 'complete'>('message');

  useEffect(() => {
    // Show message for 2 seconds
    const messageTimer = setTimeout(() => {
      setPhase('animating');
    }, 2000);

    // Complete animation after 3.5 seconds total
    const completeTimer = setTimeout(() => {
      setPhase('complete');
      onAnimationComplete();
    }, 3500);

    return () => {
      clearTimeout(messageTimer);
      clearTimeout(completeTimer);
    };
  }, [onAnimationComplete]);

  // Target position based on device
  const targetPosition = isMobile 
    ? { x: window.innerWidth - 70, y: 10 } // Top-right for mobile
    : { x: 10, y: 10 }; // Top-left for desktop

  return (
    <AnimatePresence>
      <div className="fixed inset-0 pointer-events-none z-50">
        {/* Message Phase */}
        {phase === 'message' && (
          <motion.div
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-auto"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex flex-col items-center gap-4">
              <div className="relative">
                <img 
                  src={pixelImage}
                  alt="Pixel"
                  className="w-32 h-32 object-cover rounded-full shadow-xl"
                  style={{ imageRendering: 'crisp-edges' }}
                />
                {/* Sparkle effects */}
                <motion.div
                  className="absolute -top-2 -right-2"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                >
                  <Sparkles className="w-6 h-6 text-yellow-400" />
                </motion.div>
                <motion.div
                  className="absolute -bottom-2 -left-2"
                  animate={{ rotate: -360 }}
                  transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                >
                  <Sparkles className="w-5 h-5 text-purple-400" />
                </motion.div>
              </div>
              <motion.div 
                className="bg-white/95 dark:bg-gray-900/95 rounded-2xl px-6 py-3 shadow-lg"
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                <p className="text-lg font-medium text-gray-800 dark:text-gray-200">
                  {message}
                </p>
              </motion.div>
            </div>
          </motion.div>
        )}

        {/* Animating Phase */}
        {phase === 'animating' && (
          <>
            {/* Pixel Avatar Animating */}
            <motion.div
              className="absolute pointer-events-auto"
              initial={{ 
                x: window.innerWidth / 2 - 64,
                y: window.innerHeight / 2 - 64,
                scale: 1 
              }}
              animate={{ 
                x: targetPosition.x,
                y: targetPosition.y,
                scale: 0.4
              }}
              transition={{ 
                duration: 1.2,
                type: "spring",
                damping: 15,
                stiffness: 100
              }}
            >
              <div className="relative">
                <motion.img 
                  src={pixelImage}
                  alt="Pixel"
                  className="w-32 h-32 object-cover rounded-full shadow-xl"
                  style={{ imageRendering: 'crisp-edges' }}
                  animate={{ 
                    filter: [
                      "brightness(1)",
                      "brightness(1.3)",
                      "brightness(1)"
                    ]
                  }}
                  transition={{ duration: 1.2 }}
                />
                
                {/* Glow effect during transition */}
                <motion.div
                  className="absolute inset-0 rounded-full"
                  style={{
                    background: 'radial-gradient(circle, rgba(168,85,247,0.5) 0%, transparent 70%)',
                  }}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ 
                    opacity: [0, 1, 0],
                    scale: [0.8, 1.5, 0.8]
                  }}
                  transition={{ duration: 1.2 }}
                />

                {/* Trail sparkles */}
                {[...Array(5)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="absolute top-1/2 left-1/2"
                    initial={{ x: 0, y: 0, opacity: 0 }}
                    animate={{
                      x: [0, -20 * (i + 1)],
                      y: [0, -10 * (i + 1)],
                      opacity: [0, 1, 0]
                    }}
                    transition={{
                      duration: 0.8,
                      delay: i * 0.1,
                      ease: "easeOut"
                    }}
                  >
                    <Sparkles className={`w-${4 - i} h-${4 - i} text-purple-400`} />
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Magic particles effect */}
            <div className="absolute inset-0 overflow-hidden">
              {[...Array(20)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute"
                  initial={{
                    x: window.innerWidth / 2,
                    y: window.innerHeight / 2,
                    opacity: 0
                  }}
                  animate={{
                    x: window.innerWidth / 2 + (Math.random() - 0.5) * 200,
                    y: window.innerHeight / 2 + (Math.random() - 0.5) * 200,
                    opacity: [0, 1, 0]
                  }}
                  transition={{
                    duration: 1.5,
                    delay: i * 0.05,
                    ease: "easeOut"
                  }}
                >
                  <div className={`w-2 h-2 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full`} />
                </motion.div>
              ))}
            </div>
          </>
        )}
      </div>
    </AnimatePresence>
  );
}

// Animation variants for reuse
export const minimizeAnimationVariants = {
  initial: {
    scale: 1,
    opacity: 1,
    filter: "brightness(1)"
  },
  minimizing: {
    scale: 0.4,
    opacity: 0.9,
    filter: "brightness(1.2)",
    transition: {
      duration: 1.2,
      type: "spring",
      damping: 15,
      stiffness: 100
    }
  },
  minimized: {
    scale: 0.4,
    opacity: 1,
    filter: "brightness(1)",
    transition: {
      duration: 0.3
    }
  }
};

// Bounce animation for settling
export const bounceInAnimation = {
  initial: { scale: 0.3, opacity: 0 },
  animate: {
    scale: [0.3, 0.45, 0.35, 0.4],
    opacity: 1,
    transition: {
      duration: 0.6,
      times: [0, 0.6, 0.8, 1],
      ease: "easeOut"
    }
  }
};