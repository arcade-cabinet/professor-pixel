import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ChevronRight } from 'lucide-react';
import { WizardOption } from './wizard-types';
import { 
  getGameTypeIcon,
  shouldUseOptionGrid,
  getButtonVariant,
  getButtonSize,
  formatTestId
} from './wizard-utils';
import { 
  BUTTON_STYLES, 
  ICON_SIZES,
  ANIMATIONS 
} from './wizard-constants';

interface WizardOptionsProps {
  options: WizardOption[];
  onOptionSelect: (option: WizardOption) => void;
  isMobile?: boolean;
  className?: string;
  variant?: 'default' | 'phone-portrait' | 'phone-landscape';
}

// Main options component
export default function WizardOptionHandler({
  options,
  onOptionSelect,
  isMobile = false,
  className = '',
  variant = 'default'
}: WizardOptionsProps) {
  if (!options || options.length === 0) return null;

  const shouldGrid = shouldUseOptionGrid(options.length, isMobile);
  
  const containerStyles = (() => {
    if (variant === 'phone-portrait' || variant === 'phone-landscape') {
      return variant === 'phone-portrait' ? 'space-y-3' : 'space-y-2';
    }
    
    if (isMobile) {
      return options.length > 4 ? 'flex flex-col gap-2' : 'flex flex-col gap-3';
    }
    
    // For tablets and small desktops, be more conservative with horizontal layouts
    return shouldGrid
      ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3'
      : 'flex flex-col lg:flex-row gap-3 justify-center flex-wrap';
  })();

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: ANIMATIONS.DIALOGUE_TRANSITION.delay }}
      className={`${containerStyles} ${className}`}
    >
      {options.map((option, index) => (
        <OptionButton
          key={index}
          option={option}
          index={index}
          onSelect={() => onOptionSelect(option)}
          isMobile={isMobile}
          variant={variant}
          optionCount={options.length}
        />
      ))}
    </motion.div>
  );
}

interface OptionButtonProps {
  option: WizardOption;
  index: number;
  onSelect: () => void;
  isMobile: boolean;
  variant: 'default' | 'phone-portrait' | 'phone-landscape';
  optionCount: number;
}

// Individual option button component
export function OptionButton({
  option,
  index,
  onSelect,
  isMobile,
  variant,
  optionCount
}: OptionButtonProps) {
  const Icon = getGameTypeIcon(option.text) || ChevronRight;
  
  const buttonStyles = (() => {
    if (variant === 'phone-portrait') {
      return BUTTON_STYLES.PHONE_PORTRAIT;
    }
    
    if (variant === 'phone-landscape') {
      return BUTTON_STYLES.PHONE_LANDSCAPE;
    }
    
    if (isMobile) {
      return BUTTON_STYLES.MOBILE_OPTION;
    }
    
    return optionCount > 4
      ? BUTTON_STYLES.DESKTOP_GRID
      : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold py-3 px-4 md:px-6 min-w-0 flex-1 lg:flex-initial';
  })();

  const buttonVariant = getButtonVariant(isMobile, optionCount);
  const buttonSize = variant === 'phone-portrait' ? 'lg' : getButtonSize(isMobile);
  
  const animationProps = (() => {
    if (variant === 'phone-portrait') {
      return {
        initial: { opacity: 0, y: 20 },
        animate: { opacity: 1, y: 0 },
        transition: { delay: index * ANIMATIONS.OPTION_STAGGER.delay }
      };
    }
    
    if (variant === 'phone-landscape') {
      return {
        initial: { opacity: 0, x: 20 },
        animate: { opacity: 1, x: 0 },
        transition: { delay: index * ANIMATIONS.OPTION_STAGGER.delay }
      };
    }
    
    return {
      initial: { opacity: 0, y: 10 },
      animate: { opacity: 1, y: 0 },
      transition: { delay: index * ANIMATIONS.OPTION_STAGGER.delay / 2 }
    };
  })();

  return (
    <motion.div {...animationProps}>
      <Button
        onClick={onSelect}
        className={buttonStyles}
        variant={buttonVariant}
        size={buttonSize}
        data-testid={formatTestId('dialogue-option', index)}
      >
        <OptionContent
          text={option.text}
          Icon={Icon}
          isMobile={isMobile}
          variant={variant}
          optionCount={optionCount}
        />
      </Button>
    </motion.div>
  );
}

interface OptionContentProps {
  text: string;
  Icon: React.ComponentType<any>;
  isMobile: boolean;
  variant: 'default' | 'phone-portrait' | 'phone-landscape';
  optionCount: number;
}

// Option button content rendering
function OptionContent({
  text,
  Icon,
  isMobile,
  variant,
  optionCount
}: OptionContentProps) {
  if (variant === 'phone-portrait') {
    return (
      <>
        <Icon className={`mr-3 ${ICON_SIZES.MEDIUM} flex-shrink-0 text-purple-600`} />
        <span className="font-medium text-base">{text}</span>
      </>
    );
  }
  
  if (variant === 'phone-landscape') {
    return (
      <>
        <Icon className={`mr-2 ${ICON_SIZES.SMALL} flex-shrink-0 text-purple-600`} />
        <span className="font-medium text-xs">{text}</span>
      </>
    );
  }
  
  if (isMobile) {
    return (
      <>
        <Icon className={`mr-3 ${ICON_SIZES.MEDIUM} flex-shrink-0`} />
        <span className="font-medium">{text}</span>
      </>
    );
  }
  
  // Desktop grid layout
  if (optionCount > 4) {
    return (
      <>
        <Icon className={`${ICON_SIZES.LARGE} mb-2 text-purple-600`} />
        <span className="text-sm font-semibold">{text}</span>
      </>
    );
  }
  
  // Desktop default layout
  return (
    <>
      <Icon className={`mr-2 ${ICON_SIZES.MEDIUM}`} />
      <span>{text}</span>
    </>
  );
}

interface ContinueButtonProps {
  onClick: () => void;
  isMobile?: boolean;
  variant?: 'default' | 'phone-portrait' | 'phone-landscape';
}

// Continue button component
export function ContinueButton({
  onClick,
  isMobile = false,
  variant = 'default'
}: ContinueButtonProps) {
  const buttonStyles = (() => {
    if (variant === 'phone-portrait') {
      return 'w-full py-5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold text-base';
    }
    
    if (variant === 'phone-landscape') {
      return 'w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold text-sm';
    }
    
    return isMobile
      ? BUTTON_STYLES.CONTINUE_MOBILE
      : BUTTON_STYLES.CONTINUE_DESKTOP;
  })();

  const buttonSize = variant === 'phone-portrait' ? 'lg' : (isMobile ? 'lg' : 'default');
  const iconSize = variant === 'phone-landscape' ? ICON_SIZES.SMALL : ICON_SIZES.MEDIUM;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: ANIMATIONS.DIALOGUE_TRANSITION.delay }}
      className={isMobile && variant === 'default' ? "w-full" : variant !== 'default' ? '' : "flex justify-center"}
    >
      <Button
        onClick={onClick}
        className={buttonStyles}
        size={buttonSize}
        data-testid="dialogue-continue"
      >
        Continue <ChevronRight className={`ml-2 ${iconSize}`} />
      </Button>
    </motion.div>
  );
}