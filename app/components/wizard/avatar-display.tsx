import { motion } from 'framer-motion';
import pixelImage from '@assets/pixel/Pixel_happy_excited_expression_22a41625.png';
import { ANIMATIONS, AVATAR_SIZES, STYLES } from './wizard-constants';

interface WizardAvatarProps {
  size?: 'desktop' | 'phone-portrait' | 'phone-landscape';
  showStatusIndicator?: boolean;
  className?: string;
}

export default function WizardAvatarDisplay({ 
  size = 'desktop',
  showStatusIndicator = true,
  className = '' 
}: WizardAvatarProps) {
  const avatarSizeClasses = (() => {
    switch (size) {
      case 'phone-landscape':
        return `${AVATAR_SIZES.PHONE_LANDSCAPE.width} ${AVATAR_SIZES.PHONE_LANDSCAPE.height} ${AVATAR_SIZES.PHONE_LANDSCAPE.widthSm} ${AVATAR_SIZES.PHONE_LANDSCAPE.heightSm}`;
      case 'phone-portrait':
        return `${AVATAR_SIZES.PHONE_PORTRAIT.width} ${AVATAR_SIZES.PHONE_PORTRAIT.height}`;
      default:
        return `${AVATAR_SIZES.DESKTOP.width} ${AVATAR_SIZES.DESKTOP.height}`;
    }
  })();

  const statusIndicatorSize = (() => {
    switch (size) {
      case 'phone-landscape':
        return 'w-5 h-5';
      case 'phone-portrait':
        return 'w-8 h-8';
      default:
        return 'w-6 h-6';
    }
  })();

  const statusIndicatorPosition = (() => {
    switch (size) {
      case 'phone-landscape':
        return '-bottom-1 -right-1';
      case 'phone-portrait':
        return '-bottom-2 -right-2';
      default:
        return 'bottom-0 right-0';
    }
  })();

  const statusIndicatorBorder = (() => {
    switch (size) {
      case 'phone-landscape':
        return 'border-2';
      default:
        return 'border-4';
    }
  })();

  return (
    <motion.div
      animate={{
        scale: ANIMATIONS.AVATAR_BOUNCE.scale as any,
        rotate: ANIMATIONS.AVATAR_BOUNCE.rotate as any
      }}
      transition={{ 
        duration: ANIMATIONS.AVATAR_BOUNCE.duration,
        repeat: Infinity,
        repeatType: "reverse"
      }}
      className={`relative ${className}`}
    >
      <img 
        src={pixelImage}
        alt="Pixel"
        className={`${avatarSizeClasses} object-cover rounded-full shadow-xl`}
        style={{ imageRendering: 'crisp-edges' }}
      />
      
      {showStatusIndicator && (
        <motion.div 
          className={`absolute ${statusIndicatorPosition} ${statusIndicatorSize} ${STYLES.PIXEL_STATUS_INDICATOR} ${statusIndicatorBorder}`}
          animate={{ scale: ANIMATIONS.AVATAR_PULSE.scale as any }}
          transition={{ 
            duration: ANIMATIONS.AVATAR_PULSE.duration, 
            repeat: Infinity 
          }}
        />
      )}
    </motion.div>
  );
}

// Avatar wrapper for centered display
export function CenteredAvatar({ 
  size = 'desktop',
  showStatusIndicator = true,
  className = '' 
}: WizardAvatarProps) {
  return (
    <motion.div 
      className={`flex justify-center ${className}`}
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: ANIMATIONS.FADE_IN.duration }}
    >
      <WizardAvatarDisplay 
        size={size} 
        showStatusIndicator={showStatusIndicator} 
      />
    </motion.div>
  );
}

// Avatar wrapper for portrait layout
export function PortraitAvatar({ className = '' }: { className?: string }) {
  return (
    <motion.div 
      className={`flex-shrink-0 flex items-center justify-center py-6 ${className}`}
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: ANIMATIONS.FADE_IN.duration }}
    >
      <WizardAvatarDisplay size="phone-portrait" />
    </motion.div>
  );
}

// Avatar wrapper for landscape layout
export function LandscapeAvatar({ className = '' }: { className?: string }) {
  return (
    <motion.div 
      className={`flex items-center justify-center p-2 ${className}`}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: ANIMATIONS.FADE_IN.duration }}
    >
      <WizardAvatarDisplay size="phone-landscape" />
    </motion.div>
  );
}