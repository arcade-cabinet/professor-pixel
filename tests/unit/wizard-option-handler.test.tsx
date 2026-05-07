// Cover app/components/wizard/option-handler.tsx (270 LOC).
// Three components in one file:
//   * WizardOptionHandler — default export, dispatches to OptionButton list
//     across three layout variants (default desktop, phone-portrait, phone-landscape)
//     with grid-vs-flex decisioning based on option count + isMobile.
//   * OptionButton — individual selectable button. Visual layout differs by
//     variant + optionCount + isMobile. playPop + onSelect fire on click.
//   * ContinueButton — single button, three variant styles.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import type { WizardOption } from '@lib/wizard/types';

const playPopMock = vi.fn();

// playPop has side effects (Web Audio); stub so onSelect side-effect test
// can verify it fires without playing real audio.
vi.mock('@lib/audio', () => ({
  playPop: () => playPopMock(),
}));

import WizardOptionHandler, {
  OptionButton,
  ContinueButton,
} from '@/components/wizard/option-handler';

const baseOption: WizardOption = { text: 'Option text', next: 'next-node' };

beforeEach(() => {
  playPopMock.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('WizardOptionHandler — render + click forwarding', () => {
  it('returns null when options is empty', () => {
    const { container } = render(
      <WizardOptionHandler options={[]} onOptionSelect={vi.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('returns null when options is undefined-ish', () => {
    // @ts-expect-error — driving the early-return branch in source
    const { container } = render(<WizardOptionHandler onOptionSelect={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders one button per option (default variant)', () => {
    const opts: WizardOption[] = [
      { text: 'Alpha', next: 'a' },
      { text: 'Beta', next: 'b' },
      { text: 'Gamma', next: 'g' },
    ];
    render(<WizardOptionHandler options={opts} onOptionSelect={vi.fn()} />);
    expect(screen.getByTestId('dialogue-option-0')).toBeInTheDocument();
    expect(screen.getByTestId('dialogue-option-1')).toBeInTheDocument();
    expect(screen.getByTestId('dialogue-option-2')).toBeInTheDocument();
    expect(screen.getByText('Alpha')).toBeInTheDocument();
  });

  it('clicking an option fires playPop + onOptionSelect with the option', () => {
    const onSelect = vi.fn();
    render(
      <WizardOptionHandler
        options={[{ text: 'Pick me', next: 'next' }]}
        onOptionSelect={onSelect}
      />
    );
    fireEvent.click(screen.getByTestId('dialogue-option-0'));
    expect(playPopMock).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith({ text: 'Pick me', next: 'next' });
  });

  it.each([
    ['default' as const],
    ['phone-portrait' as const],
    ['phone-landscape' as const],
  ])('renders successfully for variant=%s', (variant) => {
    render(
      <WizardOptionHandler
        options={[baseOption]}
        onOptionSelect={vi.fn()}
        variant={variant}
      />
    );
    expect(screen.getByTestId('dialogue-option-0')).toBeInTheDocument();
  });

  it('renders 5+ options without crashing (exercises optionCount > 4 grid branch)', () => {
    const opts = Array.from({ length: 5 }, (_, i) => ({ text: `Opt${i}`, next: `n${i}` }));
    render(<WizardOptionHandler options={opts} onOptionSelect={vi.fn()} />);
    expect(screen.getByTestId('dialogue-option-4')).toBeInTheDocument();
  });

  it('renders mobile layout when isMobile=true', () => {
    const opts: WizardOption[] = [{ text: 'Mobile opt', next: 'n' }];
    render(<WizardOptionHandler options={opts} onOptionSelect={vi.fn()} isMobile={true} />);
    expect(screen.getByTestId('dialogue-option-0')).toBeInTheDocument();
  });

  it('renders mobile + 5+ options (drives the >4 mobile flex branch)', () => {
    const opts = Array.from({ length: 5 }, (_, i) => ({ text: `Opt${i}`, next: `n${i}` }));
    render(<WizardOptionHandler options={opts} onOptionSelect={vi.fn()} isMobile={true} />);
    expect(screen.getByTestId('dialogue-option-4')).toBeInTheDocument();
  });

  it('forwards className to the wrapper', () => {
    const { container } = render(
      <WizardOptionHandler
        options={[baseOption]}
        onOptionSelect={vi.fn()}
        className="my-cls"
      />
    );
    expect(container.querySelector('.my-cls')).toBeTruthy();
  });
});

describe('OptionButton — variant + sizing branches', () => {
  it.each([
    ['default' as const, false, 1],
    ['default' as const, false, 5],
    ['default' as const, true, 1],
    ['phone-portrait' as const, false, 1],
    ['phone-landscape' as const, false, 1],
  ])('renders cleanly for variant=%s isMobile=%s optionCount=%i', (variant, isMobile, count) => {
    render(
      <OptionButton
        option={baseOption}
        index={0}
        onSelect={vi.fn()}
        isMobile={isMobile}
        variant={variant}
        optionCount={count}
      />
    );
    expect(screen.getByTestId('dialogue-option-0')).toBeInTheDocument();
  });

  it('clicking the button invokes onSelect', () => {
    const onSelect = vi.fn();
    render(
      <OptionButton
        option={baseOption}
        index={0}
        onSelect={onSelect}
        isMobile={false}
        variant="default"
        optionCount={1}
      />
    );
    fireEvent.click(screen.getByTestId('dialogue-option-0'));
    expect(onSelect).toHaveBeenCalled();
  });
});

describe('ContinueButton — three variants', () => {
  it.each([
    ['default' as const],
    ['phone-portrait' as const],
    ['phone-landscape' as const],
  ])('renders cleanly for variant=%s', (variant) => {
    render(<ContinueButton onClick={vi.fn()} variant={variant} />);
    expect(screen.getByTestId('dialogue-continue')).toBeInTheDocument();
    expect(screen.getByText(/Continue/)).toBeInTheDocument();
  });

  it('renders mobile-default layout when isMobile=true + variant=default', () => {
    render(<ContinueButton onClick={vi.fn()} isMobile={true} />);
    expect(screen.getByTestId('dialogue-continue')).toBeInTheDocument();
  });

  it('clicking fires onClick', () => {
    const onClick = vi.fn();
    render(<ContinueButton onClick={onClick} />);
    fireEvent.click(screen.getByTestId('dialogue-continue'));
    expect(onClick).toHaveBeenCalled();
  });
});
