// P4.15 — Help / FAQ modal triggered from the PixelMenu's "Help" entry.
//
// Built on the Radix Dialog primitive (`@/components/ui/dialog`), which
// gives us focus trap + restore, Escape-to-close, scroll lock, and the
// aria-modal="true" + role="dialog" wiring for free. The 6 FAQ entries
// live in `strings.help.questions` so copy stays editable in the i18n
// catalog without touching component code.
//
// The component is purely presentational — it owns no state and accepts
// a controlled `open` + `onOpenChange` so the PixelMenu (or any future
// caller — there's a planned `?` keyboard shortcut in task-016 that
// will wire to the same modal) can drive it.

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { strings } from '@lib/i18n';

interface HelpModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function HelpModal({ open, onOpenChange }: HelpModalProps) {
  const { title, questions } = strings.help;
  // Iteration order is the catalog declaration order — Object.values is
  // stable in modern engines and the catalog ordering is intentional
  // (most-asked first).
  const entries = Object.values(questions);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="help-modal" className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>Quick answers to questions other kids have asked.</DialogDescription>
        </DialogHeader>
        <ul className="space-y-4 mt-4">
          {entries.map((entry, idx) => (
            <li
              key={idx}
              data-testid={`help-entry-${idx}`}
              className="rounded-md border border-purple-200 bg-purple-50/50 p-4 dark:border-purple-800 dark:bg-purple-950/30"
            >
              <p className="font-semibold text-gray-900 dark:text-gray-100">{entry.q}</p>
              <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">{entry.a}</p>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
