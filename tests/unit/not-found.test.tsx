import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import NotFound from '@/pages/not-found';

describe('NotFound page', () => {
  it('shows Pixel and the kid-friendly headline', () => {
    render(<NotFound />);
    expect(screen.getByAltText(/Pixel/i)).toBeInTheDocument();
    expect(screen.getByText(/wandered off/i)).toBeInTheDocument();
  });

  it('exposes both escape hatches: home + lessons', () => {
    render(<NotFound />);
    expect(screen.getByTestId('not-found-home')).toBeInTheDocument();
    expect(screen.getByTestId('not-found-lessons')).toBeInTheDocument();
  });

  it('does not leak Error / stack-trace text to the kid', () => {
    render(<NotFound />);
    // Generic adult-mode shadcn copy and JS error vocabulary must not appear.
    expect(screen.queryByText(/router/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/^Error/)).not.toBeInTheDocument();
    expect(screen.queryByText(/stack/i)).not.toBeInTheDocument();
  });
});
