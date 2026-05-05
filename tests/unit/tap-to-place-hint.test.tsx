import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import TapToPlaceHint from '@/components/editor/tap-to-place-hint';

describe('TapToPlaceHint (P4.7)', () => {
  it('renders the hint when on a touch-primary device with an armed component', () => {
    render(<TapToPlaceHint isTouchPrimary={true} armedComponentId="sprite" />);

    const hint = screen.getByTestId('tap-to-place-hint');
    expect(hint).toBeInTheDocument();
    expect(hint).toHaveTextContent(/tap the canvas to place/i);
    // Live region so screen-readers announce the affordance when armed.
    expect(hint).toHaveAttribute('role', 'status');
    expect(hint).toHaveAttribute('aria-live', 'polite');
  });

  it('renders nothing on a mouse-primary device (drag-and-drop is the discoverable path)', () => {
    render(<TapToPlaceHint isTouchPrimary={false} armedComponentId="sprite" />);

    expect(screen.queryByTestId('tap-to-place-hint')).not.toBeInTheDocument();
  });

  it('renders nothing when no component is armed (nothing to hint about)', () => {
    render(<TapToPlaceHint isTouchPrimary={true} armedComponentId={null} />);

    expect(screen.queryByTestId('tap-to-place-hint')).not.toBeInTheDocument();
  });
});
