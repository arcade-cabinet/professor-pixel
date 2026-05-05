import { useState, useCallback, useEffect, useRef } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { Play, Pause, RotateCw, Code, Eye, Grid3x3, Package, Settings2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { cn } from '@lib/utils/cn';
import { useViewport } from '@lib/hooks/use-viewport';
import { useUndoableList } from '@lib/hooks/use-undoable-list';

import PygameEditorCanvas from './canvas';
import TapToPlaceHint from './tap-to-place-hint';
import PygameEditorPalette from './palette';
import PygameEditorProperties from './properties';
import PygameEditorCodePanel from './code-panel';
import type { ComponentPropertyValue } from '@lib/pygame/components/types';

export interface PlacedComponent {
  id: string;
  componentId: string;
  x: number;
  y: number;
  properties: Record<string, ComponentPropertyValue>;
}

interface PygameWysiwygEditorProps {
  className?: string;
  onClose?: () => void;
  initialComponents?: PlacedComponent[];
}

export default function PygameWysiwygEditor({
  className,
  onClose,
  initialComponents = [],
}: PygameWysiwygEditorProps) {
  const {
    state: placedComponents,
    set: setPlacedComponents,
    undo: undoPlacements,
    redo: redoPlacements,
    canUndo,
    canRedo,
    reset: resetPlacements,
  } = useUndoableList<PlacedComponent[]>(initialComponents);
  const [selectedComponentId, setSelectedComponentId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [activeTab, setActiveTab] = useState<'visual' | 'code'>('visual');

  // P4 mobile responsiveness — sidebars become drawers under lg.
  // armedComponentId is the tap-to-place fallback for touch-primary devices
  // where react-dnd's HTML5 backend doesn't fire: tap a palette item to
  // arm it, tap the canvas to place. Cleared on place or by tapping the
  // armed item again.
  const { isCompact, isTouchPrimary } = useViewport();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [propertiesOpen, setPropertiesOpen] = useState(false);
  const [armedComponentId, setArmedComponentId] = useState<string | null>(null);

  // Drawer focus management — keyboard a11y for the compact-viewport
  // palette + properties drawers. We move focus into the drawer on open,
  // restore focus to the toggle button on close, and listen for Escape
  // anywhere on the page to dismiss whichever drawer is open.
  const paletteToggleRef = useRef<HTMLButtonElement | null>(null);
  const propertiesToggleRef = useRef<HTMLButtonElement | null>(null);
  const paletteDrawerRef = useRef<HTMLDivElement | null>(null);
  const propertiesDrawerRef = useRef<HTMLDivElement | null>(null);
  // Has-been-open guards — without these, the focus-restore effects fire
  // on initial mount and grab focus to the toggle buttons before the user
  // has interacted, hijacking page focus on every load. Only restore focus
  // when an open transitioned to closed.
  const paletteHasBeenOpenRef = useRef(false);
  const propertiesHasBeenOpenRef = useRef(false);

  useEffect(() => {
    if (paletteOpen) {
      paletteHasBeenOpenRef.current = true;
      // Move focus to the first focusable child inside the drawer so a
      // keyboard user lands on a real control, not on the scrim.
      const first = paletteDrawerRef.current?.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      first?.focus();
    } else if (paletteHasBeenOpenRef.current && paletteToggleRef.current) {
      // Drawer just closed — restore focus to the toggle that opened it,
      // matching native dialog semantics. Skipped on initial mount.
      paletteToggleRef.current.focus();
    }
  }, [paletteOpen]);

  useEffect(() => {
    if (propertiesOpen) {
      propertiesHasBeenOpenRef.current = true;
      const first = propertiesDrawerRef.current?.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      first?.focus();
    } else if (propertiesHasBeenOpenRef.current && propertiesToggleRef.current) {
      propertiesToggleRef.current.focus();
    }
  }, [propertiesOpen]);

  useEffect(() => {
    if (!paletteOpen && !propertiesOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key !== 'Escape') return;
      // Close whichever drawer is open — properties takes priority because
      // it nests visually above the palette in compact layout.
      if (propertiesOpen) setPropertiesOpen(false);
      else if (paletteOpen) setPaletteOpen(false);
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [paletteOpen, propertiesOpen]);

  const selectedComponent = placedComponents.find((c) => c.id === selectedComponentId);

  const handleDrop = useCallback(
    (componentId: string, x: number, y: number) => {
      const newComponent: PlacedComponent = {
        id: `${componentId}-${Date.now()}`,
        componentId,
        x: snapToGrid ? Math.round(x / 20) * 20 : x,
        y: snapToGrid ? Math.round(y / 20) * 20 : y,
        properties: {},
      };
      setPlacedComponents((prev) => [...prev, newComponent]);
      setSelectedComponentId(newComponent.id);
      // Tap-to-place flow: clear the armed component once it's been dropped
      // so the next canvas tap doesn't keep placing the same thing.
      setArmedComponentId(null);
    },
    [snapToGrid]
  );

  // Tap-to-arm a palette item. Tapping the same item again disarms it.
  const handlePaletteArm = useCallback((componentId: string) => {
    setArmedComponentId((current) => (current === componentId ? null : componentId));
  }, []);

  const handleComponentMove = useCallback(
    (id: string, x: number, y: number) => {
      setPlacedComponents((prev) =>
        prev.map((comp) =>
          comp.id === id
            ? {
                ...comp,
                x: snapToGrid ? Math.round(x / 20) * 20 : x,
                y: snapToGrid ? Math.round(y / 20) * 20 : y,
              }
            : comp
        )
      );
    },
    [snapToGrid]
  );

  const handleComponentDelete = useCallback(
    (id: string) => {
      setPlacedComponents((prev) => prev.filter((comp) => comp.id !== id));
      if (selectedComponentId === id) {
        setSelectedComponentId(null);
      }
    },
    [selectedComponentId]
  );

  // P4 — on compact layouts, opening the properties panel for the user
  // when they pick a component is the obvious behavior; otherwise the
  // settings drawer stays hidden behind the canvas with no signal that
  // it has any state to show.
  // Depend only on selectedComponentId — re-firing on isCompact change
  // would re-open the drawer after a user explicitly closed it whenever
  // the viewport straddles the lg breakpoint (rotate device, resize).
  // The isCompact gate is read via closure at firing time.
  // biome-ignore lint/correctness/useExhaustiveDependencies: see comment
  useEffect(() => {
    if (isCompact && selectedComponentId) {
      setPropertiesOpen(true);
    }
  }, [selectedComponentId]);

  const handlePropertyChange = useCallback(
    (id: string, property: string, value: ComponentPropertyValue) => {
      setPlacedComponents((prev) =>
        prev.map((comp) =>
          comp.id === id ? { ...comp, properties: { ...comp.properties, [property]: value } } : comp
        )
      );
    },
    []
  );

  const handlePlay = () => setIsPlaying(true);
  const handlePause = () => setIsPlaying(false);
  const handleReset = () => {
    setIsPlaying(false);
    // Reset wipes history too — a new baseline. Otherwise Ctrl+Z
    // after Reset would un-reset the canvas, which is a footgun.
    resetPlacements(initialComponents);
  };

  // P4.29 — Ctrl+Z / Ctrl+Shift+Z (or Cmd on macOS) for undo/redo. Gated to
  // not fire while typing in inputs/textareas/contenteditable so the kid
  // can still undo within a property text field with the browser's
  // native undo. Modifier-held during a text-edit context yields to it.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const ctrlOrMeta = e.ctrlKey || e.metaKey;
      if (!ctrlOrMeta) return;
      const key = e.key.toLowerCase();
      if (key !== 'z') return;
      const target = e.target as HTMLElement | null;
      if (target) {
        const tag = target.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable) {
          return;
        }
      }
      e.preventDefault();
      if (e.shiftKey) {
        redoPlacements();
      } else {
        undoPlacements();
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [undoPlacements, redoPlacements]);

  return (
    <DndProvider backend={HTML5Backend}>
      <div
        className={cn(
          'flex flex-col h-screen bg-gradient-to-br from-purple-50 to-pink-50',
          className
        )}
      >
        {/* Header Toolbar */}
        <div className="flex items-center justify-between p-2 sm:p-4 bg-white/80 backdrop-blur-sm border-b border-purple-200/50 flex-wrap gap-2">
          <div className="flex items-center gap-2 sm:gap-4">
            {isCompact && (
              <Button
                ref={paletteToggleRef}
                size="icon"
                variant="ghost"
                onClick={() => setPaletteOpen((o) => !o)}
                aria-label="Toggle component palette"
                aria-pressed={paletteOpen}
                data-testid="wysiwyg-palette-toggle"
              >
                <Package className="w-5 h-5" />
              </Button>
            )}
            <h2 className="text-base sm:text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              {isCompact ? 'Editor' : 'PyGame Visual Editor'}
            </h2>
            <div className="flex items-center gap-1 sm:gap-2">
              <Button
                variant={isPlaying ? 'outline' : 'default'}
                size="sm"
                onClick={handlePlay}
                disabled={isPlaying}
                className="gap-1 sm:gap-2 min-h-[44px]"
                aria-label="Play"
              >
                <Play className="w-4 h-4" />
                <span className="hidden sm:inline">Play</span>
              </Button>
              <Button
                variant={isPlaying ? 'default' : 'outline'}
                size="sm"
                onClick={handlePause}
                disabled={!isPlaying}
                className="gap-1 sm:gap-2 min-h-[44px]"
                aria-label="Pause"
              >
                <Pause className="w-4 h-4" />
                <span className="hidden sm:inline">Pause</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleReset}
                className="gap-1 sm:gap-2 min-h-[44px]"
                aria-label="Reset"
              >
                <RotateCw className="w-4 h-4" />
                <span className="hidden sm:inline">Reset</span>
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <div className="hidden md:flex items-center gap-2">
              <Switch id="show-grid" checked={showGrid} onCheckedChange={setShowGrid} />
              <Label htmlFor="show-grid" className="text-sm flex items-center gap-1">
                <Grid3x3 className="w-4 h-4" />
                Grid
              </Label>
            </div>
            <div className="hidden md:flex items-center gap-2">
              <Switch id="snap-to-grid" checked={snapToGrid} onCheckedChange={setSnapToGrid} />
              <Label htmlFor="snap-to-grid" className="text-sm">
                Snap
              </Label>
            </div>
            {isCompact && selectedComponent && (
              <Button
                ref={propertiesToggleRef}
                size="icon"
                variant="ghost"
                onClick={() => setPropertiesOpen((o) => !o)}
                aria-label="Toggle component settings"
                aria-pressed={propertiesOpen}
                data-testid="wysiwyg-properties-toggle"
              >
                <Settings2 className="w-5 h-5" />
              </Button>
            )}
            {onClose && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="min-h-[44px]"
                aria-label="Close editor"
              >
                {isCompact ? <X className="w-5 h-5" /> : 'Close Editor'}
              </Button>
            )}
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex flex-1 overflow-hidden relative">
          {/* Left Sidebar - Component Palette.
              On compact viewports it slides over as a drawer; on lg+ it's
              a normal flex sibling. The drawer scrim closes it on tap. */}
          {isCompact ? (
            <>
              {paletteOpen && (
                <button
                  type="button"
                  tabIndex={-1}
                  aria-hidden="true"
                  className="absolute inset-0 bg-black/40 z-10"
                  onClick={() => setPaletteOpen(false)}
                />
              )}
              <div
                ref={paletteDrawerRef}
                className={cn(
                  'absolute left-0 top-0 bottom-0 z-20 w-72 max-w-[85vw] transition-transform',
                  paletteOpen ? 'translate-x-0' : '-translate-x-full'
                )}
                role="dialog"
                aria-modal="true"
                aria-label="Component palette"
                aria-hidden={!paletteOpen}
              >
                <PygameEditorPalette
                  className="h-full border-r border-purple-200/50"
                  armedComponentId={armedComponentId}
                  onArm={(id) => {
                    handlePaletteArm(id);
                    setPaletteOpen(false);
                  }}
                />
              </div>
            </>
          ) : (
            <PygameEditorPalette
              className="w-64 border-r border-purple-200/50"
              armedComponentId={armedComponentId}
              onArm={isTouchPrimary ? handlePaletteArm : undefined}
            />
          )}

          {/* Center - Canvas or Code View */}
          <div className="flex-1 flex flex-col">
            <Tabs
              value={activeTab}
              onValueChange={(v) => setActiveTab(v as 'visual' | 'code')}
              className="flex-1 flex flex-col"
            >
              <TabsList className="mx-2 sm:mx-4 mt-2 sm:mt-4 self-start">
                <TabsTrigger value="visual" className="gap-2">
                  <Eye className="w-4 h-4" />
                  Visual
                </TabsTrigger>
                <TabsTrigger value="code" className="gap-2">
                  <Code className="w-4 h-4" />
                  <span className="hidden sm:inline">Python </span>Code
                </TabsTrigger>
              </TabsList>

              <TabsContent value="visual" className="flex-1 p-2 sm:p-4">
                <TapToPlaceHint
                  isTouchPrimary={isTouchPrimary}
                  armedComponentId={armedComponentId}
                />
                <PygameEditorCanvas
                  components={placedComponents}
                  selectedId={selectedComponentId}
                  showGrid={showGrid}
                  isPlaying={isPlaying}
                  onDrop={handleDrop}
                  onSelect={setSelectedComponentId}
                  onMove={handleComponentMove}
                  onDelete={handleComponentDelete}
                  armedComponentId={armedComponentId}
                />
              </TabsContent>

              <TabsContent value="code" className="flex-1 p-2 sm:p-4">
                <PygameEditorCodePanel components={placedComponents} className="h-full" />
              </TabsContent>
            </Tabs>
          </div>

          {/* Right Sidebar - Properties Panel */}
          {selectedComponent &&
            (isCompact ? (
              <>
                {propertiesOpen && (
                  <button
                    type="button"
                    tabIndex={-1}
                    aria-hidden="true"
                    className="absolute inset-0 bg-black/40 z-10"
                    onClick={() => setPropertiesOpen(false)}
                  />
                )}
                <div
                  ref={propertiesDrawerRef}
                  className={cn(
                    'absolute right-0 top-0 bottom-0 z-20 w-80 max-w-[85vw] transition-transform',
                    propertiesOpen ? 'translate-x-0' : 'translate-x-full'
                  )}
                  role="dialog"
                  aria-modal="true"
                  aria-label="Component settings"
                  aria-hidden={!propertiesOpen}
                >
                  <PygameEditorProperties
                    component={selectedComponent}
                    onPropertyChange={handlePropertyChange}
                    className="h-full border-l border-purple-200/50"
                  />
                </div>
              </>
            ) : (
              <PygameEditorProperties
                component={selectedComponent}
                onPropertyChange={handlePropertyChange}
                className="w-80 border-l border-purple-200/50"
              />
            ))}
        </div>
      </div>
    </DndProvider>
  );
}
