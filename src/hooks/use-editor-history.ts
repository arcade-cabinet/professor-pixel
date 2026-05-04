import { useState, useCallback, useRef } from 'react';
import type { Entity, HistoryEntry } from '@shared/schema';

interface UseEditorHistoryOptions {
  maxHistorySize?: number;
}

export function useEditorHistory(options: UseEditorHistoryOptions = {}) {
  const { maxHistorySize = 50 } = options;
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const isUndoingRef = useRef(false);

  const canUndo = historyIndex >= 0;
  const canRedo = historyIndex < history.length - 1;

  const addToHistory = useCallback((entry: HistoryEntry) => {
    if (isUndoingRef.current) return;

    setHistory(prev => {
      // If we're not at the end of history, remove everything after current index
      let newHistory = historyIndex >= 0 ? prev.slice(0, historyIndex + 1) : [];
      
      // Add the new entry
      newHistory = [...newHistory, entry];
      
      // Limit history size
      if (newHistory.length > maxHistorySize) {
        newHistory = newHistory.slice(-maxHistorySize);
      }
      
      return newHistory;
    });
    
    setHistoryIndex(prev => Math.min(prev + 1, maxHistorySize - 1));
  }, [historyIndex, maxHistorySize]);

  const undo = useCallback(() => {
    if (!canUndo) return null;
    
    isUndoingRef.current = true;
    const entry = history[historyIndex];
    setHistoryIndex(prev => Math.max(prev - 1, -1));
    
    // Return the previous state to restore
    setTimeout(() => {
      isUndoingRef.current = false;
    }, 0);
    
    return entry.previousState || null;
  }, [canUndo, history, historyIndex]);

  const redo = useCallback(() => {
    if (!canRedo) return null;
    
    isUndoingRef.current = true;
    const nextIndex = historyIndex + 1;
    const entry = history[nextIndex];
    setHistoryIndex(nextIndex);
    
    // Return the entities to restore
    setTimeout(() => {
      isUndoingRef.current = false;
    }, 0);
    
    return entry.entities;
  }, [canRedo, history, historyIndex]);

  const recordAdd = useCallback((entities: Entity[]) => {
    addToHistory({
      type: 'add',
      entities,
      timestamp: Date.now()
    });
  }, [addToHistory]);

  const recordDelete = useCallback((entities: Entity[]) => {
    addToHistory({
      type: 'delete',
      entities: [],
      previousState: entities,
      timestamp: Date.now()
    });
  }, [addToHistory]);

  const recordModify = useCallback((entities: Entity[], previousState: Entity[]) => {
    addToHistory({
      type: 'modify',
      entities,
      previousState,
      timestamp: Date.now()
    });
  }, [addToHistory]);

  const recordBatch = useCallback((entities: Entity[], previousState: Entity[]) => {
    addToHistory({
      type: 'batch',
      entities,
      previousState,
      timestamp: Date.now()
    });
  }, [addToHistory]);

  const clearHistory = useCallback(() => {
    setHistory([]);
    setHistoryIndex(-1);
  }, []);

  return {
    canUndo,
    canRedo,
    undo,
    redo,
    recordAdd,
    recordDelete,
    recordModify,
    recordBatch,
    clearHistory,
    historySize: history.length,
    currentIndex: historyIndex
  };
}