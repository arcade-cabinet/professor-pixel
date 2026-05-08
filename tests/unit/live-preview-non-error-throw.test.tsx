// Cover the cold non-Error throw path in app/components/pygame/live-preview.tsx
// that the existing live-preview-error-paths suite skips:
//   - line 195 path 1 falsy: `error instanceof Error` falsy → falls back
//     to the literal 'Failed to execute pygame code' string. Existing
//     tests reject with `new Error(...)` covering the truthy arm only.

import type React from 'react';
import { describe, expect, it, vi, beforeAll, beforeEach, afterEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import PygameLivePreview from '@/components/pygame/live-preview';
import type { GameChoice } from '@lib/wizard/types';

const setCanvasContextMock = vi.fn();
const flushFrameBufferMock = vi.fn();
const createPygameEnvironmentMock = vi.fn();
const resetPygameStateMock = vi.fn();
vi.mock('@lib/pygame/runtime/simulator', () => ({
  setCanvasContext: (...args: unknown[]) => setCanvasContextMock(...args),
  flushFrameBuffer: (...args: unknown[]) => flushFrameBufferMock(...args),
  createPygameEnvironment: () => createPygameEnvironmentMock(),
  resetPygameState: () => resetPygameStateMock(),
}));

const runSnippetMock = vi.fn();
vi.mock('@lib/python/runner', () => {
  class PythonRunner {
    runSnippet = runSnippetMock;
  }
  return { PythonRunner };
});

vi.mock('@lib/wizard/code-generator', () => ({
  generatePygameCode: vi.fn(() => '# stub'),
}));

const toastMock = vi.fn();
vi.mock('@lib/hooks/use-toast', () => ({
  useToast: () => ({ toast: toastMock }),
}));

vi.mock('@/components/ui/slider', () => ({
  Slider: () => null,
}));

const mockPyodide = {
  globals: { set: vi.fn() },
  runPython: vi.fn(),
} as unknown as PyodideInstance;

const sampleChoice: GameChoice = {
  type: 'character' as const,
  id: 'robot',
  name: 'Robot',
};

beforeAll(() => {
  HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
    clearRect: vi.fn(),
    fillRect: vi.fn(),
    drawImage: vi.fn(),
    fillText: vi.fn(),
  })) as unknown as HTMLCanvasElement['getContext'];
});

beforeEach(() => {
  setCanvasContextMock.mockReset();
  flushFrameBufferMock.mockReset();
  createPygameEnvironmentMock.mockReset();
  resetPygameStateMock.mockReset();
  runSnippetMock.mockReset();
  toastMock.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('PygameLivePreview — runSnippet non-Error rejection (line 195 path 1 falsy)', () => {
  it("rejection with a string falls back to 'Failed to execute pygame code'", async () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    // Reject with a non-Error value → `error instanceof Error` is false →
    // literal fallback string is logged + surfaced via toast.
    runSnippetMock.mockRejectedValue('plain-string-rejection');
    render(<PygameLivePreview choices={[sampleChoice]} pyodide={mockPyodide} />);
    await waitFor(() => {
      expect(toastMock).toHaveBeenCalled();
    });
    expect(errSpy).toHaveBeenCalledWith(
      '[live-preview]',
      'Failed to execute pygame code'
    );
  });
});
