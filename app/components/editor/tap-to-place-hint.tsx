// P4.7 — Tap-to-place hint badge for the WYSIWYG editor.
//
// On touch-primary devices (iPad / phone) drag-and-drop from the palette
// often doesn't fire — react-dnd's HTML5 backend depends on dragstart,
// which Safari Mobile suppresses unless the kid hits a specific long-
// press threshold. The fallback flow is "tap palette item to arm → tap
// canvas to place," but without a visible hint the kid sees an armed
// glow on the palette item and an unresponsive canvas with no signal
// that the next step is a canvas tap.
//
// This badge is the missing affordance. It only renders when:
//   1. isTouchPrimary is true (mouse users see drag-and-drop and don't
//      need the hint),
//   2. armedComponentId is set (no point hinting until they've armed
//      something).
//
// role="status" + aria-live="polite" announces the hint to screen-
// reader users when an item is armed without interrupting their input.

interface TapToPlaceHintProps {
  isTouchPrimary: boolean;
  armedComponentId: string | null;
}

export default function TapToPlaceHint({ isTouchPrimary, armedComponentId }: TapToPlaceHintProps) {
  if (!isTouchPrimary || !armedComponentId) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="tap-to-place-hint"
      className="mb-2 flex items-center gap-2 rounded-lg border-2 border-purple-300 bg-purple-50 px-3 py-2 text-sm font-medium text-purple-900 shadow-sm dark:border-purple-700 dark:bg-purple-900/30 dark:text-purple-100"
    >
      <span className="text-base" aria-hidden="true">
        👆
      </span>
      <span>Tap the canvas to place your component.</span>
    </div>
  );
}
