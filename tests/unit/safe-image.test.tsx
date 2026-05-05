import { describe, expect, it } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import SafeImage from '@/components/ui/safe-image';

describe('SafeImage (Q5)', () => {
  it('renders the img normally when src loads', () => {
    render(<SafeImage src="/x.png" alt="Pixel mascot" data-testid="img" />);
    expect(screen.getByTestId('img')).toHaveAttribute('src', '/x.png');
    expect(screen.queryByTestId('safe-image-fallback')).not.toBeInTheDocument();
  });

  it('swaps to fallback when the img errors', () => {
    render(<SafeImage src="/missing.png" alt="Pixel mascot" data-testid="img" />);
    const img = screen.getByTestId('img');
    fireEvent.error(img);
    const fallback = screen.getByTestId('safe-image-fallback');
    expect(fallback).toBeInTheDocument();
    // Alt text preserved for screen readers
    expect(fallback).toHaveAttribute('aria-label', 'Pixel mascot');
  });

  it('shows the custom fallback emoji', () => {
    render(<SafeImage src="" alt="game asset" fallbackEmoji="🎮" />);
    expect(screen.getByText('🎮')).toBeInTheDocument();
  });

  it('renders the fallback immediately when src is missing', () => {
    render(<SafeImage src={undefined} alt="x" />);
    expect(screen.getByTestId('safe-image-fallback')).toBeInTheDocument();
  });
});
