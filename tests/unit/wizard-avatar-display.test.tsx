// Cover app/components/wizard/avatar-display.tsx (137 LOC, 0% → ~100%).
// One main avatar component (WizardAvatarDisplay) with 3 size modes and
// an optional status indicator, plus 3 wrapper components that pin a
// specific size for desktop/portrait/landscape layouts.

import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import WizardAvatarDisplay, {
  CenteredAvatar,
  PortraitAvatar,
  LandscapeAvatar,
} from '@/components/wizard/avatar-display';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('WizardAvatarDisplay — render + size variants', () => {
  it('renders the Pixel avatar image with default desktop size', () => {
    render(<WizardAvatarDisplay />);
    const img = screen.getByAltText('Pixel');
    expect(img).toBeInTheDocument();
  });

  it('renders the status indicator by default (showStatusIndicator=true)', () => {
    const { container } = render(<WizardAvatarDisplay />);
    // The indicator is a positioned div with the PIXEL_STATUS_INDICATOR class
    // (we just verify it exists by checking the absolute-positioned div count).
    expect(container.querySelectorAll('.absolute').length).toBeGreaterThan(0);
  });

  it('hides the status indicator when showStatusIndicator=false', () => {
    const { container } = render(<WizardAvatarDisplay showStatusIndicator={false} />);
    expect(container.querySelectorAll('.absolute').length).toBe(0);
  });

  it.each([
    ['desktop' as const],
    ['phone-portrait' as const],
    ['phone-landscape' as const],
  ])('renders without crashing for size=%s', (size) => {
    render(<WizardAvatarDisplay size={size} />);
    expect(screen.getByAltText('Pixel')).toBeInTheDocument();
  });

  it('applies the className to the wrapper', () => {
    const { container } = render(<WizardAvatarDisplay className="custom-cls" />);
    expect(container.querySelector('.custom-cls')).toBeTruthy();
  });
});

describe('CenteredAvatar wrapper', () => {
  it('renders the avatar inside a flex-justify-center wrapper', () => {
    const { container } = render(<CenteredAvatar />);
    expect(screen.getByAltText('Pixel')).toBeInTheDocument();
    expect(container.querySelector('.justify-center')).toBeTruthy();
  });

  it('forwards size + showStatusIndicator props', () => {
    const { container } = render(
      <CenteredAvatar size="phone-portrait" showStatusIndicator={false} />
    );
    expect(screen.getByAltText('Pixel')).toBeInTheDocument();
    // Indicator hidden → no .absolute children.
    expect(container.querySelectorAll('.absolute').length).toBe(0);
  });

  it('forwards className', () => {
    const { container } = render(<CenteredAvatar className="centered-cls" />);
    expect(container.querySelector('.centered-cls')).toBeTruthy();
  });
});

describe('PortraitAvatar wrapper', () => {
  it('renders the avatar with phone-portrait size hardcoded', () => {
    render(<PortraitAvatar />);
    expect(screen.getByAltText('Pixel')).toBeInTheDocument();
  });

  it('forwards className', () => {
    const { container } = render(<PortraitAvatar className="portrait-cls" />);
    expect(container.querySelector('.portrait-cls')).toBeTruthy();
  });
});

describe('LandscapeAvatar wrapper', () => {
  it('renders the avatar with phone-landscape size hardcoded', () => {
    render(<LandscapeAvatar />);
    expect(screen.getByAltText('Pixel')).toBeInTheDocument();
  });

  it('forwards className', () => {
    const { container } = render(<LandscapeAvatar className="landscape-cls" />);
    expect(container.querySelector('.landscape-cls')).toBeTruthy();
  });
});
