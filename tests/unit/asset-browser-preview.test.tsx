// P4.12 — Inline preview before advance.
//
// Single-select asset browser used to call onSelect() on the first tap,
// which immediately advanced the wizard. Kids didn't get a chance to
// see what they'd picked. The fix is a two-tap pattern: first tap
// previews (banner above the grid), second tap on the same card OR
// the explicit "Use this one" button confirms and advances. These
// tests pin that contract: tapping does NOT call onSelect, the banner
// renders the chosen asset, and only the second tap or button click
// invokes onSelect.

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

// The asset-browser pulls the catalog from assetManager; mock to a
// deterministic 2-asset fixture so the test is stable.
vi.mock('@lib/assets/manager', () => {
  const fakeAssets = [
    {
      id: 'sprite-knight',
      name: 'Knight',
      type: 'sprite' as const,
      description: 'A brave knight',
      thumbnail: 'data:image/png;base64,knight',
      tags: ['hero'],
      license: 'CC0',
      category: 'character',
    },
    {
      id: 'sprite-wizard',
      name: 'Wizard',
      type: 'sprite' as const,
      description: 'A wise wizard',
      thumbnail: 'data:image/png;base64,wizard',
      tags: ['hero'],
      license: 'CC0',
      category: 'character',
    },
  ];
  return {
    assetManager: {
      filterAssets: () => fakeAssets,
      getAssetById: (id: string) => fakeAssets.find((a) => a.id === id),
      getSuggestedAssets: () => null,
    },
  };
});

import AssetBrowserWizard from '@/components/wizard/asset-browser';

beforeEach(() => {
  // Each test starts fresh — no preview state survives between renders.
});

describe('AssetBrowserWizard preview-before-advance (P4.12)', () => {
  it('first tap shows the preview banner and does NOT call onSelect', () => {
    const onSelect = vi.fn();
    render(<AssetBrowserWizard onSelect={onSelect} embedded />);

    const knightCard = screen.getByTestId('asset-card-sprite-knight');
    fireEvent.click(knightCard);

    // Preview banner appeared with the right asset.
    const banner = screen.getByTestId('asset-preview-banner');
    expect(banner).toBeInTheDocument();
    expect(screen.getByTestId('asset-preview-name')).toHaveTextContent('Knight');

    // onSelect was NOT called — that's the whole point of the change.
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('tapping a different asset updates the preview, still no advance', () => {
    const onSelect = vi.fn();
    render(<AssetBrowserWizard onSelect={onSelect} embedded />);

    fireEvent.click(screen.getByTestId('asset-card-sprite-knight'));
    expect(screen.getByTestId('asset-preview-name')).toHaveTextContent('Knight');

    fireEvent.click(screen.getByTestId('asset-card-sprite-wizard'));
    expect(screen.getByTestId('asset-preview-name')).toHaveTextContent('Wizard');

    expect(onSelect).not.toHaveBeenCalled();
  });

  it('second tap on the same card calls onSelect with that asset', () => {
    const onSelect = vi.fn();
    render(<AssetBrowserWizard onSelect={onSelect} embedded />);

    const knight = screen.getByTestId('asset-card-sprite-knight');
    fireEvent.click(knight);
    fireEvent.click(knight);

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: 'sprite-knight' }));
  });

  it('"Use this one" button confirms the previewed asset', () => {
    const onSelect = vi.fn();
    render(<AssetBrowserWizard onSelect={onSelect} embedded />);

    fireEvent.click(screen.getByTestId('asset-card-sprite-wizard'));
    fireEvent.click(screen.getByTestId('button-confirm-preview'));

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: 'sprite-wizard' }));
  });

  it('clears the preview banner when the search query changes (P4.12 review fold)', () => {
    // Without this reset the banner would keep advertising an asset that's
    // no longer in the visible grid. Stale-state UX trap fixed in the
    // commit folding the task-012 review findings.
    const onSelect = vi.fn();
    render(<AssetBrowserWizard onSelect={onSelect} embedded />);

    fireEvent.click(screen.getByTestId('asset-card-sprite-knight'));
    expect(screen.getByTestId('asset-preview-banner')).toBeInTheDocument();

    fireEvent.change(screen.getByTestId('input-search'), { target: { value: 'wizard' } });
    expect(screen.queryByTestId('asset-preview-banner')).not.toBeInTheDocument();
  });
});
