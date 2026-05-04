// Asset Library Test Page
// Test component to verify the asset library system

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import AssetBrowserWizard from '@/components/asset-browser-wizard';
import { GameAsset } from '@/lib/asset-library/asset-types';
import { assetManager } from '@/lib/asset-library/asset-manager';
import { Sparkles, Search, Grid3x3 } from 'lucide-react';

export default function AssetLibraryTest() {
  const [showBrowser, setShowBrowser] = useState(false);
  const [selectedAssets, setSelectedAssets] = useState<GameAsset[]>([]);
  const [assetType, setAssetType] = useState<'sprite' | 'sound' | 'music' | 'background' | undefined>(undefined);

  const handleAssetSelect = (asset: GameAsset) => {
    setSelectedAssets([...selectedAssets, asset]);
    setShowBrowser(false);
  };

  const handleMultiSelect = (assets: GameAsset[]) => {
    setSelectedAssets(assets);
    setShowBrowser(false);
  };

  const clearSelection = () => {
    setSelectedAssets([]);
    assetManager.clearSelection();
  };

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
          <Sparkles className="w-8 h-8 text-purple-600" />
          Asset Library Test
        </h1>
        <p className="text-gray-600">Test the CC0 asset library system for PyGame Palace</p>
      </div>

      {/* Controls */}
      <div className="mb-6 flex flex-wrap gap-2">
        <Button 
          onClick={() => { setAssetType(undefined); setShowBrowser(true); }}
          variant="default"
          data-testid="button-show-all"
        >
          <Grid3x3 className="w-4 h-4 mr-2" />
          Show All Assets
        </Button>
        <Button 
          onClick={() => { setAssetType('sprite'); setShowBrowser(true); }}
          variant="outline"
          data-testid="button-show-sprites"
        >
          Show Sprites
        </Button>
        <Button 
          onClick={() => { setAssetType('background'); setShowBrowser(true); }}
          variant="outline"
          data-testid="button-show-backgrounds"
        >
          Show Backgrounds
        </Button>
        <Button 
          onClick={() => { setAssetType('sound'); setShowBrowser(true); }}
          variant="outline"
          data-testid="button-show-sounds"
        >
          Show Sounds
        </Button>
        <Button 
          onClick={() => { setAssetType('music'); setShowBrowser(true); }}
          variant="outline"
          data-testid="button-show-music"
        >
          Show Music
        </Button>
        <Button 
          onClick={clearSelection}
          variant="destructive"
          disabled={selectedAssets.length === 0}
          data-testid="button-clear"
        >
          Clear Selection
        </Button>
      </div>

      {/* Selected Assets Display */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-3">Selected Assets ({selectedAssets.length})</h2>
        {selectedAssets.length === 0 ? (
          <Card className="p-6 text-center text-gray-500">
            No assets selected. Click "Show Assets" buttons above to browse.
          </Card>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {selectedAssets.map(asset => (
              <Card key={asset.id} className="p-2">
                <div className="aspect-square bg-gray-100 dark:bg-gray-800 rounded flex items-center justify-center overflow-hidden mb-2">
                  {(asset.type === 'sprite' || asset.type === 'background') && asset.thumbnail ? (
                    <img 
                      src={asset.thumbnail} 
                      alt={asset.name}
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="text-2xl">
                      {asset.type === 'sound' ? '🔊' : 
                       asset.type === 'music' ? '🎵' : '📦'}
                    </div>
                  )}
                </div>
                <p className="text-sm font-medium truncate">{asset.name}</p>
                <p className="text-xs text-gray-500">{asset.type}</p>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Asset Statistics */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-3">Asset Library Statistics</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="p-4">
            <p className="text-sm text-gray-600">Total Assets</p>
            <p className="text-2xl font-bold">{assetManager.getAllAssets().length}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-gray-600">Sprites</p>
            <p className="text-2xl font-bold">{assetManager.getSprites().length}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-gray-600">Backgrounds</p>
            <p className="text-2xl font-bold">{assetManager.getBackgrounds().length}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-gray-600">Sounds & Music</p>
            <p className="text-2xl font-bold">
              {assetManager.getSounds().length + assetManager.getMusic().length}
            </p>
          </Card>
        </div>
      </div>

      {/* Asset Browser Modal */}
      {showBrowser && (
        <AssetBrowserWizard
          assetType={assetType}
          onSelect={handleAssetSelect}
          onMultiSelect={handleMultiSelect}
          multiSelect={true}
          onClose={() => setShowBrowser(false)}
          showPixelSuggestions={true}
          gameType="platformer"
        />
      )}
    </div>
  );
}