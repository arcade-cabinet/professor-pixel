// Q5 (pillar 3) — every <img> in the kid-facing chrome should fail
// gracefully. Bundled imports can desync after a refactor, the asset
// catalog can drift, school wifi can drop image bytes mid-fetch. The
// browser's default broken-image icon is more confusing than no image —
// kids pattern-match it to "I broke something."
//
// SafeImage swaps to a styled emoji/text fallback on the first onError
// event. Subsequent renders bypass the failed src so React doesn't keep
// re-attempting. The fallback is intentionally simple: a square box with
// the alt text and an emoji. Callers can override the emoji per category
// (e.g. 🎮 for assets, 🐍 for Pixel) via the `fallbackEmoji` prop.

import { useState } from 'react';
import { cn } from '@lib/utils/cn';

type SafeImageProps = Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'onError'> & {
  /** Emoji shown in the fallback box. Defaults to 🖼. */
  fallbackEmoji?: string;
  /** Extra class names applied to the fallback wrapper. */
  fallbackClassName?: string;
};

export default function SafeImage({
  src,
  alt = '',
  className,
  fallbackEmoji = '🖼️',
  fallbackClassName,
  ...rest
}: SafeImageProps) {
  const [failed, setFailed] = useState(false);

  if (failed || !src) {
    return (
      <div
        role="img"
        aria-label={alt}
        data-testid="safe-image-fallback"
        className={cn(
          'inline-flex items-center justify-center rounded-md bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
          className,
          fallbackClassName
        )}
        style={rest.style}
      >
        <span className="text-2xl" aria-hidden="true">
          {fallbackEmoji}
        </span>
        {alt && <span className="sr-only">{alt}</span>}
      </div>
    );
  }

  return (
    <img src={src} alt={alt} className={className} onError={() => setFailed(true)} {...rest} />
  );
}
