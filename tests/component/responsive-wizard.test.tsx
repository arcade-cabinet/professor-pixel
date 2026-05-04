import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import UniversalWizard from '@/components/wizard/universal';
import '@testing-library/jest-dom';

// Mock window.matchMedia for different screen sizes
const mockMatchMedia = (width: number) => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(query => ({
      matches: query.includes(`${width}px`),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
};

// Mock wizard data
const mockWizardData = {
  nodes: [
    {
      id: 'start',
      type: 'greeting',
      dialogue: 'Welcome to Pixel\'s PyGame Palace!',
      options: [
        { text: 'Hello Pixel!', next: 'intro' },
        { text: 'What can we build?', next: 'intro' }
      ],
      avatar: 'neutral'
    },
    {
      id: 'intro',
      type: 'lesson',
      dialogue: 'Let\'s create your first game!',
      options: [
        { text: 'Start with a simple shape', next: 'shapes' },
        { text: 'Jump to animations', next: 'animations' }
      ],
      avatar: 'excited'
    },
    {
      id: 'shapes',
      type: 'interactive',
      dialogue: 'Let\'s draw a circle on the screen.',
      code: 'import pygame\npygame.draw.circle(screen, (255, 0, 0), (100, 100), 50)',
      options: [
        { text: 'Try it!', next: 'success' },
        { text: 'Show me more', next: 'animations' }
      ],
      avatar: 'neutral'
    }
  ],
  initialNode: 'start'
};

describe('Responsive Wizard Layout Tests', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    });
    
    // Reset window dimensions
    window.innerWidth = 1024;
    window.innerHeight = 768;
  });

  describe('Phone Portrait Layout (390x844)', () => {
    beforeEach(() => {
      window.innerWidth = 390;
      window.innerHeight = 844;
      mockMatchMedia(390);
    });

    it('should render vertical stack layout without title', () => {
      render(
        <QueryClientProvider client={queryClient}>
          <UniversalWizard />
        </QueryClientProvider>
      );

      // Check for vertical stack container
      const container = screen.getByTestId('wizard-container');
      expect(container).toHaveClass('flex', 'flex-col', 'h-screen');

      // Title should NOT be visible
      const title = screen.queryByText(/Pixel's PyGame Palace/i);
      expect(title).not.toBeInTheDocument();

      // Avatar should be at top
      const avatar = screen.getByTestId('pixel-avatar');
      expect(avatar).toBeInTheDocument();

      // Dialogue should be present
      const dialogue = screen.getByTestId('dialogue-text');
      expect(dialogue).toBeInTheDocument();
    });

    it('should have scrollable options area', () => {
      render(
        <QueryClientProvider client={queryClient}>
          <UniversalWizard />
        </QueryClientProvider>
      );

      const optionsContainer = screen.getByTestId('options-container');
      expect(optionsContainer).toHaveClass('overflow-y-auto');
    });

    it('should handle wizard navigation on portrait', async () => {
      render(
        <QueryClientProvider client={queryClient}>
          <UniversalWizard />
        </QueryClientProvider>
      );

      // Check initial state
      expect(screen.getByText(/Welcome to Pixel's PyGame Palace!/i)).toBeInTheDocument();

      // Click first option
      const firstOption = screen.getByTestId('option-0');
      fireEvent.click(firstOption);

      // Wait for transition
      await waitFor(() => {
        expect(screen.getByText(/Let's create your first game!/i)).toBeInTheDocument();
      });
    });
  });

  describe('Phone Landscape Layout (844x390)', () => {
    beforeEach(() => {
      window.innerWidth = 844;
      window.innerHeight = 390;
      mockMatchMedia(844);
    });

    it('should render 20/80 grid layout without hamburger menu', () => {
      render(
        <QueryClientProvider client={queryClient}>
          <UniversalWizard />
        </QueryClientProvider>
      );

      // Check for grid container with 20/80 split
      const container = screen.getByTestId('wizard-container');
      expect(container).toHaveClass('grid', 'grid-cols-[20%,80%]');

      // Hamburger menu button should NOT be visible
      const menuButton = screen.queryByTestId('open-pixel-menu-button');
      expect(menuButton).not.toBeInTheDocument();

      // Avatar should be in left column
      const avatarColumn = screen.getByTestId('avatar-column');
      expect(avatarColumn).toBeInTheDocument();

      // Dialogue and options in right column
      const contentColumn = screen.getByTestId('content-column');
      expect(contentColumn).toBeInTheDocument();
    });

    it('should handle wizard progression in landscape', async () => {
      render(
        <QueryClientProvider client={queryClient}>
          <UniversalWizard />
        </QueryClientProvider>
      );

      // Initial dialogue
      expect(screen.getByText(/Welcome to Pixel's PyGame Palace!/i)).toBeInTheDocument();

      // Click option to progress
      const option = screen.getByTestId('option-1');
      fireEvent.click(option);

      await waitFor(() => {
        expect(screen.getByText(/Let's create your first game!/i)).toBeInTheDocument();
      });

      // Continue to interactive node
      const shapeOption = screen.getByTestId('option-0');
      fireEvent.click(shapeOption);

      await waitFor(() => {
        expect(screen.getByText(/Let's draw a circle/i)).toBeInTheDocument();
      });
    });
  });

  describe('Tablet Layout (768x1024)', () => {
    beforeEach(() => {
      window.innerWidth = 768;
      window.innerHeight = 1024;
      mockMatchMedia(768);
    });

    it('should use desktop layout with hamburger menu for tablets', () => {
      render(
        <QueryClientProvider client={queryClient}>
          <UniversalWizard />
        </QueryClientProvider>
      );

      // Should have centered card layout
      const container = screen.getByTestId('wizard-container');
      expect(container).toHaveClass('flex', 'items-center', 'justify-center');

      // Hamburger menu SHOULD be visible for tablets
      const menuButton = screen.getByTestId('open-pixel-menu-button');
      expect(menuButton).toBeInTheDocument();
      expect(menuButton).toHaveClass('lg:hidden'); // Hidden on large screens
    });
  });

  describe('Desktop Layout (1280x720)', () => {
    beforeEach(() => {
      window.innerWidth = 1280;
      window.innerHeight = 720;
      mockMatchMedia(1280);
    });

    it('should use desktop layout with header for large screens', () => {
      render(
        <QueryClientProvider client={queryClient}>
          <UniversalWizard />
        </QueryClientProvider>
      );

      // Should have centered card layout
      const container = screen.getByTestId('wizard-container');
      expect(container).toHaveClass('flex', 'items-center', 'justify-center');

      // Header SHOULD be visible on large screens
      const header = screen.getByRole('banner');
      expect(header).toBeInTheDocument();
      expect(header).toHaveClass('lg:block'); // Visible on large screens

      // No hamburger menu on large screens
      const menuButton = screen.queryByTestId('open-pixel-menu-button');
      expect(menuButton).not.toBeInTheDocument();
    });

    it('should handle full wizard flow on desktop', async () => {
      render(
        <QueryClientProvider client={queryClient}>
          <UniversalWizard />
        </QueryClientProvider>
      );

      // Progress through multiple stages
      const stages = [
        { text: /Welcome to Pixel's PyGame Palace!/i, optionIndex: 0 },
        { text: /Let's create your first game!/i, optionIndex: 0 },
        { text: /Let's draw a circle/i, optionIndex: 0 }
      ];

      for (const stage of stages) {
        expect(screen.getByText(stage.text)).toBeInTheDocument();
        
        const option = screen.queryByTestId(`option-${stage.optionIndex}`);
        if (option) {
          fireEvent.click(option);
          await waitFor(() => {}, { timeout: 500 });
        }
      }
    });
  });

  describe('Edge Swipe Functionality', () => {
    it('should register edge swipe on mobile devices', async () => {
      window.innerWidth = 390;
      window.innerHeight = 844;
      mockMatchMedia(390);

      render(
        <QueryClientProvider client={queryClient}>
          <UniversalWizard />
        </QueryClientProvider>
      );

      const container = screen.getByTestId('wizard-container');
      
      // Simulate touch swipe from left edge
      fireEvent.touchStart(container, {
        touches: [{ clientX: 10, clientY: 400 }]
      });
      
      fireEvent.touchMove(container, {
        touches: [{ clientX: 150, clientY: 400 }]
      });
      
      fireEvent.touchEnd(container, {
        changedTouches: [{ clientX: 150, clientY: 400 }]
      });

      // Menu should open after swipe
      await waitFor(() => {
        const menu = screen.queryByTestId('pixel-menu');
        expect(menu).toBeInTheDocument();
      }, { timeout: 1000 });
    });
  });

  describe('Dynamic Resolution Changes', () => {
    it('should adapt layout when resizing from desktop to mobile', async () => {
      // Start at desktop size
      window.innerWidth = 1280;
      window.innerHeight = 720;
      mockMatchMedia(1280);

      const { rerender } = render(
        <QueryClientProvider client={queryClient}>
          <UniversalWizard />
        </QueryClientProvider>
      );

      // Verify desktop layout
      expect(screen.getByRole('banner')).toBeInTheDocument();

      // Resize to mobile portrait
      window.innerWidth = 390;
      window.innerHeight = 844;
      mockMatchMedia(390);
      
      // Trigger resize event
      fireEvent(window, new Event('resize'));
      
      rerender(
        <QueryClientProvider client={queryClient}>
          <UniversalWizard />
        </QueryClientProvider>
      );

      // Verify mobile layout - no header
      await waitFor(() => {
        expect(screen.queryByRole('banner')).not.toBeInTheDocument();
      });
    });
  });
});