import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { DesktopHeader } from '@/components/wizard/layout-manager';

describe('Page banner', () => {
  it('renders the banner landmark with the product title', () => {
    render(<DesktopHeader />);
    const banner = screen.getByRole('banner');
    expect(banner).toBeInTheDocument();
    expect(banner.tagName.toLowerCase()).toBe('header');
    expect(screen.getByText(/Pixel's PyGame Palace/i)).toBeInTheDocument();
  });

  it('uses semantic <header> rather than role="banner" attribute', () => {
    render(<DesktopHeader />);
    const banner = screen.getByRole('banner');
    expect(banner).not.toHaveAttribute('role');
  });
});
