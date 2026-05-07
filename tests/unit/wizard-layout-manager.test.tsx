// Cover app/components/wizard/layout-manager.tsx (266 LOC, 7.69% → ~85%+).
// Five exports plus an internal TabletMenuButton:
//   - PhonePortraitLayout / PhoneLandscapeLayout / DesktopLayout — render
//     three top-level wizard layouts with shared LayoutProps + DeviceState
//     hooks (showOptions/showContinue derived via wizard utils).
//   - DesktopHeader — Pixel's PyGame Palace banner.
//   - useLayoutEdgeSwipe — wraps useEdgeSwipe with a console.log + onOpenMenu.

import type React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, renderHook } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import type { WizardNode, UIState, DeviceState } from '@lib/wizard/types';

// AnimatePresence stalls in jsdom; passthrough.
vi.mock('framer-motion', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('framer-motion');
  return {
    ...actual,
    AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
  };
});

// react-swipeable's useSwipeable returns a handlers bag. We don't need to
// drive swipe events in these tests — just verify the components render.
vi.mock('react-swipeable', () => ({
  useSwipeable: () => ({}),
}));

// useEdgeSwipe is invoked at module level by useLayoutEdgeSwipe; stub it
// so we can assert on its options.
const useEdgeSwipeMock = vi.fn((_opts: unknown) => ({}));
vi.mock('@lib/hooks/use-edge-swipe', () => ({
  useEdgeSwipe: (opts: unknown) => useEdgeSwipeMock(opts),
}));

import {
  PhonePortraitLayout,
  PhoneLandscapeLayout,
  DesktopLayout,
  DesktopHeader,
  useLayoutEdgeSwipe,
} from '@/components/wizard/layout-manager';

const baseNode: WizardNode = {
  id: 'n1',
  text: 'Hello, friend!',
  options: [
    { text: 'Pick A', next: 'a' },
    { text: 'Pick B', next: 'b' },
  ],
};

// A node with a single Continue-pattern option triggers the
// shouldShowContinue branch that swaps the option list for a Continue
// button (per src/wizard/utils.ts isSingleContinueOption).
const continueOnlyNode: WizardNode = {
  id: 'n2',
  text: 'Continue text',
  options: [{ text: 'Continue', next: 'next' }],
};

beforeEach(() => {
  useEdgeSwipeMock.mockClear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('PhonePortraitLayout', () => {
  it('returns null when currentNode is null', () => {
    const { container } = render(
      <PhonePortraitLayout
        currentNode={null}
        dialogueStep={0}
        onAdvance={vi.fn()}
        onOptionSelect={vi.fn()}
        onOpenMenu={vi.fn()}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders the dialogue text and options when currentNode has options', () => {
    render(
      <PhonePortraitLayout
        currentNode={baseNode}
        dialogueStep={0}
        onAdvance={vi.fn()}
        onOptionSelect={vi.fn()}
        onOpenMenu={vi.fn()}
      />
    );
    expect(screen.getByText('Hello, friend!')).toBeInTheDocument();
    expect(screen.getByText('Pick A')).toBeInTheDocument();
    expect(screen.getByText('Pick B')).toBeInTheDocument();
  });

  it('renders the Continue button when currentNode has no options', () => {
    render(
      <PhonePortraitLayout
        currentNode={continueOnlyNode}
        dialogueStep={0}
        onAdvance={vi.fn()}
        onOptionSelect={vi.fn()}
        onOpenMenu={vi.fn()}
      />
    );
    expect(screen.getByTestId('dialogue-continue')).toBeInTheDocument();
  });
});

describe('PhoneLandscapeLayout', () => {
  it('returns null when currentNode is null', () => {
    const { container } = render(
      <PhoneLandscapeLayout
        currentNode={null}
        dialogueStep={0}
        onAdvance={vi.fn()}
        onOptionSelect={vi.fn()}
        onOpenMenu={vi.fn()}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders the dialogue text and options', () => {
    render(
      <PhoneLandscapeLayout
        currentNode={baseNode}
        dialogueStep={0}
        onAdvance={vi.fn()}
        onOptionSelect={vi.fn()}
        onOpenMenu={vi.fn()}
      />
    );
    expect(screen.getByText('Hello, friend!')).toBeInTheDocument();
    expect(screen.getByText('Pick A')).toBeInTheDocument();
  });

  it('renders the Continue button when no options', () => {
    render(
      <PhoneLandscapeLayout
        currentNode={continueOnlyNode}
        dialogueStep={0}
        onAdvance={vi.fn()}
        onOptionSelect={vi.fn()}
        onOpenMenu={vi.fn()}
      />
    );
    expect(screen.getByTestId('dialogue-continue')).toBeInTheDocument();
  });
});

describe('DesktopLayout', () => {
  const baseDeviceState: DeviceState = {
    isMobile: false,
    isLandscape: true,
    screenWidth: 1280,
    screenHeight: 800,
  };

  const baseUiState: UIState = {
    pixelMenuOpen: false,
    embeddedComponent: 'none',
    pixelState: 'center-stage',
  };

  it('renders the desktop banner header always', () => {
    render(
      <DesktopLayout
        currentNode={baseNode}
        dialogueStep={0}
        deviceState={baseDeviceState}
        uiState={baseUiState}
        onAdvance={vi.fn()}
        onOptionSelect={vi.fn()}
        onOpenMenu={vi.fn()}
        onPixelMenuAction={vi.fn()}
        renderDialogue={() => <p>dialogue body</p>}
      />
    );
    expect(screen.getByText("Pixel's PyGame Palace")).toBeInTheDocument();
  });

  it('renders the centered dialogue card when pixelState=center-stage + embeddedComponent=none', () => {
    render(
      <DesktopLayout
        currentNode={baseNode}
        dialogueStep={0}
        deviceState={baseDeviceState}
        uiState={baseUiState}
        onAdvance={vi.fn()}
        onOptionSelect={vi.fn()}
        onOpenMenu={vi.fn()}
        onPixelMenuAction={vi.fn()}
        renderDialogue={() => <p>dialogue body content</p>}
      />
    );
    expect(screen.getByText('dialogue body content')).toBeInTheDocument();
  });

  it('hides the centered dialogue when pixelState is minimized', () => {
    render(
      <DesktopLayout
        currentNode={baseNode}
        dialogueStep={0}
        deviceState={baseDeviceState}
        uiState={{ ...baseUiState, pixelState: 'minimized' }}
        onAdvance={vi.fn()}
        onOptionSelect={vi.fn()}
        onOpenMenu={vi.fn()}
        onPixelMenuAction={vi.fn()}
        renderDialogue={() => <p>hidden body</p>}
      />
    );
    expect(screen.queryByText('hidden body')).not.toBeInTheDocument();
  });

  it('renders the Game Progress Sidebar only when showProgressSidebar + sessionActions.gameType are set', () => {
    const { rerender } = render(
      <DesktopLayout
        currentNode={baseNode}
        dialogueStep={0}
        deviceState={baseDeviceState}
        uiState={baseUiState}
        onAdvance={vi.fn()}
        onOptionSelect={vi.fn()}
        onOpenMenu={vi.fn()}
        onPixelMenuAction={vi.fn()}
        renderDialogue={() => null}
      />
    );
    // No sessionActions or showProgressSidebar → no sidebar (its identifier
    // is the heading "Overall Progress").
    expect(screen.queryByText('Overall Progress')).not.toBeInTheDocument();
    rerender(
      <DesktopLayout
        currentNode={baseNode}
        dialogueStep={0}
        deviceState={baseDeviceState}
        uiState={baseUiState}
        onAdvance={vi.fn()}
        onOptionSelect={vi.fn()}
        onOpenMenu={vi.fn()}
        onPixelMenuAction={vi.fn()}
        renderDialogue={() => null}
        showProgressSidebar={true}
        sessionActions={{
          choices: [],
          createdAssets: [],
          gameType: 'platformer',
          currentProject: null,
          completedSteps: [],
          unlockedEditor: false,
          selectedComponents: {},
        }}
      />
    );
    expect(screen.getByText('Overall Progress')).toBeInTheDocument();
  });

  it('renders the TabletMenuButton + invokes onOpenMenu when clicked', () => {
    const onOpenMenu = vi.fn();
    render(
      <DesktopLayout
        currentNode={baseNode}
        dialogueStep={0}
        deviceState={baseDeviceState}
        uiState={baseUiState}
        onAdvance={vi.fn()}
        onOptionSelect={vi.fn()}
        onOpenMenu={onOpenMenu}
        onPixelMenuAction={vi.fn()}
        renderDialogue={() => null}
      />
    );
    fireEvent.click(screen.getByTestId('open-pixel-menu-button'));
    expect(onOpenMenu).toHaveBeenCalled();
  });

  it('forwards Pixel menu actions to onPixelMenuAction', () => {
    const onPixelMenuAction = vi.fn();
    render(
      <DesktopLayout
        currentNode={baseNode}
        dialogueStep={0}
        deviceState={baseDeviceState}
        uiState={{ ...baseUiState, pixelMenuOpen: true }}
        onAdvance={vi.fn()}
        onOptionSelect={vi.fn()}
        onOpenMenu={vi.fn()}
        onPixelMenuAction={onPixelMenuAction}
        renderDialogue={() => null}
      />
    );
    // PixelMenu's "Change Game" button is in the layout's open menu.
    fireEvent.click(screen.getByTestId('change-game-button'));
    expect(onPixelMenuAction).toHaveBeenCalledWith('changeGame');
  });
});

describe('DesktopHeader', () => {
  it('renders the Pixel banner heading', () => {
    render(<DesktopHeader />);
    expect(screen.getByText("Pixel's PyGame Palace")).toBeInTheDocument();
    expect(screen.getByText('Your Game Building Adventure')).toBeInTheDocument();
  });
});

describe('useLayoutEdgeSwipe', () => {
  it('passes onEdgeSwipe → onOpenMenu through to useEdgeSwipe', () => {
    const onOpenMenu = vi.fn();
    renderHook(() => useLayoutEdgeSwipe(onOpenMenu));
    expect(useEdgeSwipeMock).toHaveBeenCalled();
    const callArgs = useEdgeSwipeMock.mock.calls[0];
    const opts = callArgs[0] as {
      onEdgeSwipe: (edge: string) => void;
      edgeThreshold: number;
      enabled: boolean;
    };
    expect(typeof opts.onEdgeSwipe).toBe('function');
    expect(typeof opts.edgeThreshold).toBe('number');
    expect(typeof opts.enabled).toBe('boolean');
    // Drive the onEdgeSwipe forward to onOpenMenu.
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    opts.onEdgeSwipe('left');
    expect(onOpenMenu).toHaveBeenCalled();
    logSpy.mockRestore();
  });
});
