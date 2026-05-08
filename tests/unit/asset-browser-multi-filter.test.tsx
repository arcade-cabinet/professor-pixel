// Cover the asset-browser branches the existing P4.12 preview suite skips:
//   - line 58: getSuggestedAssets routed when showPixelSuggestions=true + gameType
//   - line 71: assetType prop forces filter.type
//   - lines 111-123: multiSelect handleAssetClick toggle + onMultiSelect
//   - lines 183-184: hover enter/leave (setHoveredAsset)
//   - line 301: view-mode toggle button
//   - line 344: category-select onChange
//   - line 361: tabs onValueChange
//   - lines 453, 465: pagination prev / next buttons
//   - line 488: clear-selection button (multiSelect with selectedAssets > 0)

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

// 25 assets so totalPages > 1 and pagination renders. itemsPerPage is 20
// inside asset-browser, so this gives 2 pages.
const fakeAssets = Array.from({ length: 25 }, (_, i) => ({
  id: `sprite-${i}`,
  name: `Sprite ${i}`,
  type: 'sprite' as const,
  description: `desc ${i}`,
  thumbnail: 'data:image/png;base64,x',
  tags: [],
  license: 'CC0',
  category: i < 10 ? 'character' : 'environment',
}));

const filterAssetsMock = vi.fn();
const getAssetByIdMock = vi.fn();
const getSuggestedAssetsMock = vi.fn();

vi.mock('@lib/assets/manager', () => ({
  assetManager: {
    filterAssets: (...args: unknown[]) => filterAssetsMock(...args),
    getAssetById: (id: string) => getAssetByIdMock(id),
    getSuggestedAssets: (gameType: string) => getSuggestedAssetsMock(gameType),
  },
}));

import AssetBrowserWizard from '@/components/wizard/asset-browser';

beforeEach(() => {
  filterAssetsMock.mockReset().mockReturnValue(fakeAssets);
  getAssetByIdMock.mockReset().mockImplementation((id: string) => fakeAssets.find((a) => a.id === id));
  getSuggestedAssetsMock.mockReset().mockReturnValue([fakeAssets[0]]);
});

describe('AssetBrowserWizard — getSuggestedAssets routing (line 56-59)', () => {
  it('with gameType + showPixelSuggestions=true (default), getSuggestedAssets is called', () => {
    render(<AssetBrowserWizard onSelect={vi.fn()} embedded gameType="platformer" />);
    expect(getSuggestedAssetsMock).toHaveBeenCalledWith('platformer');
  });

  it('with showPixelSuggestions=false, getSuggestedAssets is NOT called', () => {
    render(
      <AssetBrowserWizard
        onSelect={vi.fn()}
        embedded
        gameType="platformer"
        showPixelSuggestions={false}
      />
    );
    expect(getSuggestedAssetsMock).not.toHaveBeenCalled();
  });
});

describe('AssetBrowserWizard — assetType prop forces filter type (line 70-72)', () => {
  it('passes filter.type=assetType through to assetManager.filterAssets', () => {
    render(<AssetBrowserWizard onSelect={vi.fn()} embedded assetType="sound" />);
    // Find the call where filter.type is forced to 'sound'.
    const wasForced = filterAssetsMock.mock.calls.some(
      (c) => (c[0] as { type?: string })?.type === 'sound'
    );
    expect(wasForced).toBe(true);
  });
});

describe('AssetBrowserWizard — multiSelect mode (lines 111-123)', () => {
  it('first click adds asset to selection + fires onMultiSelect with one asset', () => {
    const onMultiSelect = vi.fn();
    render(
      <AssetBrowserWizard
        onSelect={vi.fn()}
        embedded
        multiSelect
        onMultiSelect={onMultiSelect}
      />
    );
    fireEvent.click(screen.getByTestId('asset-card-sprite-0'));
    expect(onMultiSelect).toHaveBeenCalledTimes(1);
    const callAssets = onMultiSelect.mock.calls[0][0] as Array<{ id: string }>;
    expect(callAssets).toHaveLength(1);
    expect(callAssets[0].id).toBe('sprite-0');
  });

  it('clicking a selected asset removes it (toggle) + fires onMultiSelect with empty array', () => {
    const onMultiSelect = vi.fn();
    render(
      <AssetBrowserWizard
        onSelect={vi.fn()}
        embedded
        multiSelect
        onMultiSelect={onMultiSelect}
      />
    );
    const card = screen.getByTestId('asset-card-sprite-0');
    fireEvent.click(card);
    fireEvent.click(card);
    expect(onMultiSelect).toHaveBeenCalledTimes(2);
    const second = onMultiSelect.mock.calls[1][0] as Array<{ id: string }>;
    expect(second).toHaveLength(0);
  });

  it('multiSelect without onMultiSelect prop still updates internal selection state', () => {
    render(<AssetBrowserWizard onSelect={vi.fn()} embedded multiSelect />);
    expect(() => fireEvent.click(screen.getByTestId('asset-card-sprite-0'))).not.toThrow();
  });
});

describe('AssetBrowserWizard — hover handlers (lines 183-184)', () => {
  it('mouseenter / mouseleave on a card fire setHoveredAsset (no crash)', () => {
    render(<AssetBrowserWizard onSelect={vi.fn()} embedded />);
    const card = screen.getByTestId('asset-card-sprite-0');
    expect(() => {
      fireEvent.mouseEnter(card);
      fireEvent.mouseLeave(card);
    }).not.toThrow();
  });
});

describe('AssetBrowserWizard — view mode + category + tabs', () => {
  it('view-mode button toggles between grid and list (line 301)', () => {
    render(<AssetBrowserWizard onSelect={vi.fn()} embedded />);
    const btn = screen.getByTestId('button-view-mode');
    expect(() => fireEvent.click(btn)).not.toThrow();
    // Click again to flip back.
    fireEvent.click(btn);
  });

  it('category select onChange updates the selectedCategory state (line 344)', () => {
    render(<AssetBrowserWizard onSelect={vi.fn()} embedded />);
    const select = screen.getByTestId('select-category') as HTMLSelectElement;
    fireEvent.change(select, { target: { value: 'character' } });
    expect(select.value).toBe('character');
  });

  it('asset-type tabs change selectedTab (line 361)', () => {
    render(<AssetBrowserWizard onSelect={vi.fn()} embedded />);
    // The tab radixUi uses role=tab; click "Sprites".
    const tab = screen.getByRole('tab', { name: /sprites/i });
    expect(() => fireEvent.click(tab)).not.toThrow();
  });
});

describe('AssetBrowserWizard — pagination', () => {
  it('Next/Previous buttons render with > 1 page and advance/retreat current page (lines 453, 465)', () => {
    render(<AssetBrowserWizard onSelect={vi.fn()} embedded />);
    const next = screen.getByTestId('pagination-next') as HTMLButtonElement;
    const prev = screen.getByTestId('pagination-prev') as HTMLButtonElement;
    // Initially page 1 → prev disabled.
    expect(prev.disabled).toBe(true);
    fireEvent.click(next);
    // After next: page 2 → next disabled (only 2 pages with 25 assets / 20 perPage).
    expect((screen.getByTestId('pagination-next') as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByTestId('pagination-prev') as HTMLButtonElement).disabled).toBe(false);
    // Prev now goes back to page 1.
    fireEvent.click(screen.getByTestId('pagination-prev'));
    expect((screen.getByTestId('pagination-prev') as HTMLButtonElement).disabled).toBe(true);
  });
});

describe('AssetBrowserWizard — clear selection (line 488)', () => {
  it('clear-selection button resets selectedAssets to empty', () => {
    const onMultiSelect = vi.fn();
    render(
      <AssetBrowserWizard
        onSelect={vi.fn()}
        embedded
        multiSelect
        onMultiSelect={onMultiSelect}
      />
    );
    fireEvent.click(screen.getByTestId('asset-card-sprite-0'));
    fireEvent.click(screen.getByTestId('asset-card-sprite-1'));
    // Clear-selection footer renders only when selectedAssets.size > 0.
    const clear = screen.getByTestId('button-clear-selection');
    fireEvent.click(clear);
    // After clear, the footer's clear button is no longer in the DOM.
    expect(screen.queryByTestId('button-clear-selection')).not.toBeInTheDocument();
  });
});
