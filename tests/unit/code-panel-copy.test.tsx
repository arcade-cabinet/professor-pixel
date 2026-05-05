import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import PygameEditorCodePanel from '@/components/editor/code-panel';

// Q4 — code-panel.tsx Copy button must NOT show "Code copied!" if the
// clipboard write rejected. Insecure-context, denied-permission, and
// some embedded-webview cases all reject the Promise; before the fix
// the kid saw a green confirmation while nothing actually copied.

// useToast wraps a context; mock it to capture the title/variant payload.
const toastSpy = vi.fn();
vi.mock('@lib/hooks/use-toast', () => ({
  useToast: () => ({ toast: toastSpy }),
}));

const writeTextSpy = vi.fn();

beforeAll(() => {
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText: writeTextSpy },
  });
});

beforeEach(() => {
  toastSpy.mockClear();
  writeTextSpy.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('PygameEditorCodePanel Copy (Q4)', () => {
  it('shows the success toast when writeText resolves', async () => {
    writeTextSpy.mockResolvedValue(undefined);
    render(<PygameEditorCodePanel components={[]} />);

    const buttons = screen.getAllByRole('button');
    const copyBtn = buttons.find((b) => /copy/i.test(b.textContent ?? ''));
    expect(copyBtn).toBeDefined();
    fireEvent.click(copyBtn!);

    await waitFor(() => expect(toastSpy).toHaveBeenCalled());
    const payload = toastSpy.mock.calls[toastSpy.mock.calls.length - 1][0];
    expect(payload.title).toMatch(/copied/i);
    expect(payload.variant).not.toBe('destructive');
  });

  it('shows a destructive toast when writeText rejects (no false-positive)', async () => {
    writeTextSpy.mockRejectedValue(new Error('NotAllowedError'));
    render(<PygameEditorCodePanel components={[]} />);

    const buttons = screen.getAllByRole('button');
    const copyBtn = buttons.find((b) => /copy/i.test(b.textContent ?? ''));
    fireEvent.click(copyBtn!);

    await waitFor(() => expect(toastSpy).toHaveBeenCalled());
    const payload = toastSpy.mock.calls[toastSpy.mock.calls.length - 1][0];
    expect(payload.variant).toBe('destructive');
    expect(payload.title).not.toMatch(/copied/i);
  });
});
