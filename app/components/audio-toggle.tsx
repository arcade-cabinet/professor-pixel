// P8 — Global audio toggle button. Drops into any chrome surface (lesson
// Header, PixelPresence chrome, Profile page) and gates ALL audio (TTS +
// SFX) via the master `pp.audioEnabled` localStorage key. The icon
// reflects state (Volume2 / VolumeX) and the button is keyboard-focusable
// + aria-pressed so assistive tech announces the state.
//
// Subscribes via subscribeAudioEnabled so cross-tab toggles (and the few
// places that call setAudioEnabled directly) update every mounted button
// instantly without polling.

import { useEffect, useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { isAudioEnabled, setAudioEnabled, subscribeAudioEnabled } from '@lib/audio/tts';
import { cn } from '@lib/utils/cn';

interface AudioToggleProps {
  className?: string;
  /**
   * Variant aligns to shadcn Button variants. Defaults to 'ghost' so the
   * icon-only form sits cleanly inside an existing toolbar without
   * dominating it.
   */
  variant?: 'ghost' | 'outline' | 'secondary';
  /**
   * If false, only renders the icon (icon-only chrome). Defaults to false
   * because most placements want compact chrome; pass true for the
   * Profile page or settings surface where text helps comprehension.
   */
  showLabel?: boolean;
}

export default function AudioToggle({
  className,
  variant = 'ghost',
  showLabel = false,
}: AudioToggleProps) {
  const [enabled, setEnabled] = useState<boolean>(() => isAudioEnabled());

  useEffect(() => {
    return subscribeAudioEnabled(setEnabled);
  }, []);

  const onClick = () => {
    setAudioEnabled(!enabled);
  };

  const label = enabled ? 'Mute audio' : 'Unmute audio';

  return (
    <Button
      type="button"
      variant={variant}
      size={showLabel ? 'sm' : 'icon'}
      onClick={onClick}
      aria-pressed={enabled}
      aria-label={label}
      title={label}
      data-testid="audio-toggle"
      className={cn('shrink-0', className)}
    >
      {enabled ? (
        <Volume2 className="h-4 w-4" data-testid="audio-toggle-on-icon" />
      ) : (
        <VolumeX className="h-4 w-4" data-testid="audio-toggle-off-icon" />
      )}
      {showLabel && <span className="ml-2 text-sm">{enabled ? 'Sound on' : 'Sound off'}</span>}
    </Button>
  );
}
