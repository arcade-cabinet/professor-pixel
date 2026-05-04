// Asset Browser Component for PyGame Palace Wizard
// Visual browser for CC0 game assets with filtering and preview

import { useState, useMemo, useCallback, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  Grid3x3, 
  List,
  X,
  Check,
  Info,
  Sparkles
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from '@/components/ui/tooltip';
import { 
  GameAsset, 
  AssetType, 
  AssetFilter,
  AssetSelection
} from '@/lib/asset-library/asset-types';
import { assetManager } from '@/lib/asset-library/asset-manager';

interface AssetBrowserProps {
  onSelect?: (asset: GameAsset) => void;
  onMultiSelect?: (assets: GameAsset[]) => void;
  multiSelect?: boolean;
  assetType?: AssetType;
  gameType?: string;
  onClose?: () => void;
  embedded?: boolean;
  showPixelSuggestions?: boolean;
}

export default function AssetBrowserWizard({
  onSelect,
  onMultiSelect,
  multiSelect = false,
  assetType,
  gameType,
  onClose,
  embedded = false,
  showPixelSuggestions = true
}: AssetBrowserProps) {
  const [selectedTab, setSelectedTab] = useState<AssetType | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedAssets, setSelectedAssets] = useState<Set<string>>(new Set());
  const [hoveredAsset, setHoveredAsset] = useState<GameAsset | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Get suggested assets based on game type
  const suggestedAssets = useMemo(() => {
    if (!gameType || !showPixelSuggestions) return null;
    return assetManager.getSuggestedAssets(gameType);
  }, [gameType, showPixelSuggestions]);

  // Filter assets based on current criteria
  const filteredAssets = useMemo(() => {
    const filter: AssetFilter = {
      search: searchQuery || undefined,
      type: selectedTab === 'all' ? undefined : selectedTab as AssetType,
      category: selectedCategory === 'all' ? undefined : selectedCategory
    };

    if (assetType) {
      filter.type = assetType;
    }

    return assetManager.filterAssets(filter);
  }, [searchQuery, selectedTab, selectedCategory, assetType]);

  // Get unique categories from filtered assets
  const categories = useMemo(() => {
    const cats = new Set<string>();
    filteredAssets.forEach(asset => {
      if ('category' in asset) {
        cats.add(asset.category);
      }
    });
    return Array.from(cats);
  }, [filteredAssets]);
  
  // Calculate pagination
  const totalPages = Math.ceil(filteredAssets.length / itemsPerPage);
  const paginatedAssets = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredAssets.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredAssets, currentPage, itemsPerPage]);
  
  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedTab, selectedCategory, assetType]);

  // Handle asset selection
  const handleAssetClick = useCallback((asset: GameAsset) => {
    if (multiSelect) {
      const newSelected = new Set(selectedAssets);
      if (newSelected.has(asset.id)) {
        newSelected.delete(asset.id);
      } else {
        newSelected.add(asset.id);
      }
      setSelectedAssets(newSelected);
      
      if (onMultiSelect) {
        const assets = Array.from(newSelected)
          .map(id => assetManager.getAssetById(id))
          .filter(Boolean) as GameAsset[];
        onMultiSelect(assets);
      }
    } else {
      if (onSelect) {
        onSelect(asset);
      }
    }
  }, [multiSelect, selectedAssets, onSelect, onMultiSelect]);

  // Render asset card
  const renderAssetCard = (asset: GameAsset) => {
    const isSelected = selectedAssets.has(asset.id);
    const isSuggested = suggestedAssets && (
      (suggestedAssets.player?.id === asset.id) ||
      (suggestedAssets.enemies?.some(e => e.id === asset.id)) ||
      (suggestedAssets.items?.some(i => i.id === asset.id)) ||
      (suggestedAssets.background?.id === asset.id) ||
      (suggestedAssets.music?.id === asset.id)
    );

    return (
      <TooltipProvider key={asset.id}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Card
              data-testid={`asset-card-${asset.id}`}
              className={`
                relative cursor-pointer transition-all hover:scale-105 hover:shadow-lg
                ${isSelected ? 'ring-2 ring-purple-500' : ''}
                ${isSuggested ? 'ring-2 ring-yellow-400' : ''}
                ${viewMode === 'grid' ? 'p-2' : 'p-3 flex items-center space-x-3'}
              `}
              onClick={() => handleAssetClick(asset)}
              onMouseEnter={() => setHoveredAsset(asset)}
              onMouseLeave={() => setHoveredAsset(null)}
            >
              {/* Selected indicator */}
              {isSelected && (
                <div className="absolute top-1 right-1 z-10">
                  <Check className="w-5 h-5 text-purple-600 bg-white rounded-full" />
                </div>
              )}
              
              {/* Suggested by Pixel indicator */}
              {isSuggested && (
                <div className="absolute top-1 left-1 z-10">
                  <Sparkles className="w-4 h-4 text-yellow-500" />
                </div>
              )}

              {viewMode === 'grid' ? (
                <>
                  {/* Asset preview */}
                  <div className="aspect-square bg-gray-100 dark:bg-gray-800 rounded flex items-center justify-center overflow-hidden">
                    {(asset.type === 'sprite' || asset.type === 'background') && asset.thumbnail ? (
                      <img 
                        src={asset.thumbnail} 
                        alt={asset.name}
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <div className="text-4xl">
                        {asset.type === 'sound' ? '🔊' : 
                         asset.type === 'music' ? '🎵' : '📦'}
                      </div>
                    )}
                  </div>
                  
                  {/* Asset name */}
                  <div className="mt-2">
                    <p className="text-sm font-medium truncate">{asset.name}</p>
                    {asset.type === 'sound' || asset.type === 'music' ? (
                      <p className="text-xs text-gray-500">{asset.type}</p>
                    ) : null}
                  </div>
                </>
              ) : (
                <>
                  {/* List view */}
                  <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded flex items-center justify-center overflow-hidden">
                    {(asset.type === 'sprite' || asset.type === 'background') && asset.thumbnail ? (
                      <img 
                        src={asset.thumbnail} 
                        alt={asset.name}
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <div className="text-xl">
                        {asset.type === 'sound' ? '🔊' : 
                         asset.type === 'music' ? '🎵' : '📦'}
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{asset.name}</p>
                    <p className="text-sm text-gray-500">{asset.description}</p>
                  </div>
                  <Badge variant="outline">{asset.type}</Badge>
                </>
              )}
            </Card>
          </TooltipTrigger>
          
          <TooltipContent side="bottom" className="max-w-xs">
            <div className="space-y-2">
              <p className="font-semibold">{asset.name}</p>
              <p className="text-sm">{asset.description}</p>
              {asset.suggestedUse && (
                <p className="text-sm italic text-gray-600">
                  💡 {asset.suggestedUse}
                </p>
              )}
              <div className="flex flex-wrap gap-1">
                {asset.tags.slice(0, 3).map(tag => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
              <p className="text-xs text-gray-500">{asset.license}</p>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  return (
    <div 
      data-testid="asset-browser"
      className={`${embedded ? '' : 'fixed inset-0 z-50 bg-black/50 flex items-center justify-center'}`}>
      <div className={`
        ${embedded ? 'w-full h-full' : 'bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-4xl max-h-[80vh]'}
        flex flex-col
      `}>
        {/* Header */}
        <div className="p-4 border-b flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Sparkles className="w-6 h-6 text-purple-600" />
            <h2 className="text-xl font-bold">Asset Library</h2>
            {showPixelSuggestions && (
              <Badge variant="secondary" className="text-xs">
                🎮 Pixel's Picks Highlighted
              </Badge>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            {/* View mode toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
              data-testid="button-view-mode"
            >
              {viewMode === 'grid' ? <List className="w-4 h-4" /> : <Grid3x3 className="w-4 h-4" />}
            </Button>
            
            {!embedded && onClose && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={onClose}
                data-testid="button-close"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Search and filters */}
        <div className="p-4 space-y-3">
          <div className="flex space-x-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search assets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="input-search"
              />
            </div>
            
            {/* Category filter */}
            {categories.length > 0 && (
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-2 border rounded-md"
                data-testid="select-category"
              >
                <option value="all">All Categories</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Asset type tabs */}
          {!assetType && (
            <Tabs value={selectedTab} onValueChange={(v) => setSelectedTab(v as any)}>
              <TabsList className="w-full">
                <TabsTrigger value="all" className="flex-1">All</TabsTrigger>
                <TabsTrigger value="sprite" className="flex-1">Sprites</TabsTrigger>
                <TabsTrigger value="sound" className="flex-1">Sounds</TabsTrigger>
                <TabsTrigger value="music" className="flex-1">Music</TabsTrigger>
                <TabsTrigger value="background" className="flex-1">Backgrounds</TabsTrigger>
              </TabsList>
            </Tabs>
          )}
        </div>

        {/* Asset grid */}
        <ScrollArea className="flex-1 p-4">
          <div className={`
            ${viewMode === 'grid' 
              ? 'grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3'
              : 'space-y-2'
            }
          `}>
            {paginatedAssets.map(asset => renderAssetCard(asset))}
          </div>
          
          {/* Pagination controls */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center space-x-2 mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                data-testid="pagination-prev"
              >
                Previous
              </Button>
              <span className="text-sm text-gray-600">
                Page {currentPage} of {totalPages} ({filteredAssets.length} total)
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                data-testid="pagination-next"
              >
                Next
              </Button>
            </div>
          )}
          
          {filteredAssets.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <p>No assets found matching your criteria</p>
            </div>
          )}
        </ScrollArea>

        {/* Footer with selection info */}
        {multiSelect && selectedAssets.size > 0 && (
          <div className="p-4 border-t flex items-center justify-between">
            <p className="text-sm text-gray-600">
              {selectedAssets.size} asset{selectedAssets.size !== 1 ? 's' : ''} selected
            </p>
            <Button
              onClick={() => setSelectedAssets(new Set())}
              variant="outline"
              size="sm"
              data-testid="button-clear-selection"
            >
              Clear Selection
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}