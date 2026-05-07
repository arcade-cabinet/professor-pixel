import type React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import PixelPresence from '@/components/pixel/presence';

// Cover app/components/pixel/presence.tsx (390 LOC, 0% coverage).
// PixelPresence is the corner Pixel mascot that lives on every page
// except the home page (which has its own center-stage Pixel). It
// expands into a choices card on click, with separate desktop card and
// mobile bottom-sheet variants gated by useIsMobile().

// Stub useIsMobile so we can test desktop and mobile branches
// independently without manipulating window.matchMedia. The default
// false matches desktop.
let mobileFlag = false;
vi.mock('@lib/hooks/use-media-query', () => ({
  useIsMobile: () => mobileFlag,
}));

// Stub session-history side effects — we don't care about the audit
// trail in unit tests, just that the component doesn't crash.
vi.mock('@lib/storage/session-history', () => ({
  sessionHistory: {
    trackChoice: vi.fn(),
    trackNavigation: vi.fn(),
  },
}));

// AnimatePresence's mode="wait" defers the new child's mount until
// the previous child's exit transition completes — but in jsdom there's
// no real transition, so the swap stalls. Replace AnimatePresence with
// a passthrough so state changes flush synchronously.
vi.mock('framer-motion', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('framer-motion');
  return {
    ...actual,
    AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
  };
});

beforeEach(() => {
  mobileFlag = false;
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('PixelPresence — currentPath gating', () => {
  it('renders nothing when currentPath is "/"', () => {
    const { container } = render(<PixelPresence onNavigate={vi.fn()} currentPath="/" />);
    expect(container.firstChild).toBeNull();
  });

  it('defaults currentPath to "/" so absent prop also returns null', () => {
    const { container } = render(<PixelPresence onNavigate={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders the corner avatar on a non-root path', () => {
    render(<PixelPresence onNavigate={vi.fn()} currentPath="/lesson/1" />);
    expect(screen.getByTestId('pixel-avatar')).toBeInTheDocument();
    expect(screen.getByTestId('pixel-expand')).toBeInTheDocument();
  });
});

describe('PixelPresence — currentPath → image branches', () => {
  it.each([
    ['/lesson/1'],
    ['/wizard/start'],
    ['/project-builder'],
    ['/projects'],
    ['/gallery'],
    ['/something-else'],
  ])('renders the corner avatar on %s without crashing', (path) => {
    render(<PixelPresence onNavigate={vi.fn()} currentPath={path} />);
    expect(screen.getByTestId('pixel-avatar')).toBeInTheDocument();
  });
});

describe('PixelPresence — desktop expand/collapse', () => {
  it('clicking the corner expands to the desktop card with choices', () => {
    render(<PixelPresence onNavigate={vi.fn()} currentPath="/lesson/1" />);
    act(() => {
      fireEvent.click(screen.getByTestId('pixel-expand'));
    });
    expect(screen.getByTestId('pixel-expanded-avatar')).toBeInTheDocument();
    expect(screen.getByTestId('collapse-pixel')).toBeInTheDocument();
    expect(screen.getByTestId('pixel-choice-a')).toBeInTheDocument();
  });

  it('collapse button returns to the corner mode', () => {
    render(<PixelPresence onNavigate={vi.fn()} currentPath="/lesson/1" />);
    act(() => {
      fireEvent.click(screen.getByTestId('pixel-expand'));
    });
    act(() => {
      fireEvent.click(screen.getByTestId('collapse-pixel'));
    });
    expect(screen.queryByTestId('pixel-expanded-avatar')).not.toBeInTheDocument();
    expect(screen.getByTestId('pixel-avatar')).toBeInTheDocument();
  });

  it('non-lesson path expands with the menu choices (Continue + Go home)', () => {
    const onNavigate = vi.fn();
    render(<PixelPresence onNavigate={onNavigate} currentPath="/projects" />);
    act(() => {
      fireEvent.click(screen.getByTestId('pixel-expand'));
    });
    act(() => {
      fireEvent.click(screen.getByTestId('pixel-choice-a'));
    });
    expect(screen.queryByTestId('pixel-expanded-avatar')).not.toBeInTheDocument();
  });

  it('Go home choice invokes onNavigate("/")', () => {
    const onNavigate = vi.fn();
    render(<PixelPresence onNavigate={onNavigate} currentPath="/projects" />);
    act(() => {
      fireEvent.click(screen.getByTestId('pixel-expand'));
    });
    act(() => {
      fireEvent.click(screen.getByTestId('pixel-choice-b'));
    });
    expect(onNavigate).toHaveBeenCalledWith('/');
  });
});

describe('PixelPresence — mobile bottom-sheet variant', () => {
  beforeEach(() => {
    mobileFlag = true;
  });

  it('expand on mobile opens the dialogue modal', () => {
    render(<PixelPresence onNavigate={vi.fn()} currentPath="/lesson/1" />);
    fireEvent.click(screen.getByTestId('pixel-expand'));
    // Mobile uses different testids: mobile-choice-{idx} and mobile-dialogue-close.
    expect(screen.getByTestId('mobile-dialogue-close')).toBeInTheDocument();
    expect(screen.getByTestId('mobile-choice-0')).toBeInTheDocument();
  });

  it('mobile close button dismisses the dialogue modal', () => {
    render(<PixelPresence onNavigate={vi.fn()} currentPath="/lesson/1" />);
    fireEvent.click(screen.getByTestId('pixel-expand'));
    fireEvent.click(screen.getByTestId('mobile-dialogue-close'));
    expect(screen.queryByTestId('mobile-dialogue-close')).not.toBeInTheDocument();
  });

  it('mobile choice fires action then collapses', () => {
    render(<PixelPresence onNavigate={vi.fn()} currentPath="/lesson/1" />);
    fireEvent.click(screen.getByTestId('pixel-expand'));
    fireEvent.click(screen.getByTestId('mobile-choice-0'));
    expect(screen.queryByTestId('mobile-dialogue-close')).not.toBeInTheDocument();
  });
});
