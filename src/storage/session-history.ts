import { nanoid } from 'nanoid';

export interface SessionEvent {
  id: string;
  timestamp: Date;
  type: 'choice' | 'lesson' | 'editor' | 'component' | 'navigation';
  description: string;
  data: any;
  canRevert: boolean;
}

export interface SessionState {
  events: SessionEvent[];
  currentPosition: number;
}

class SessionHistory {
  private static instance: SessionHistory;
  private events: SessionEvent[] = [];
  private currentPosition: number = -1;
  private readonly STORAGE_KEY = 'pixel-session-history';
  private listeners: Set<(state: SessionState) => void> = new Set();

  private constructor() {
    this.loadFromStorage();
    window.addEventListener('beforeunload', () => this.saveToStorage());
  }

  static getInstance(): SessionHistory {
    if (!SessionHistory.instance) {
      SessionHistory.instance = new SessionHistory();
    }
    return SessionHistory.instance;
  }

  // Add a new event to the history
  addEvent(
    type: SessionEvent['type'],
    description: string,
    data: any = {},
    canRevert: boolean = true
  ): void {
    const event: SessionEvent = {
      id: nanoid(),
      timestamp: new Date(),
      type,
      description,
      data,
      canRevert,
    };

    // If we're not at the end of history, remove future events
    if (this.currentPosition < this.events.length - 1) {
      this.events = this.events.slice(0, this.currentPosition + 1);
    }

    this.events.push(event);
    this.currentPosition = this.events.length - 1;

    this.saveToStorage();
    this.notifyListeners();
  }

  // Track a dialogue choice
  trackChoice(choiceId: string, label: string, path?: string): void {
    this.addEvent('choice', `Selected: ${label}`, {
      choiceId,
      label,
      path,
    });
  }

  // Track a lesson completion
  trackLesson(lessonId: string, lessonName: string, completed: boolean = false): void {
    this.addEvent('lesson', completed ? `Completed: ${lessonName}` : `Started: ${lessonName}`, {
      lessonId,
      lessonName,
      completed,
    });
  }

  // Track editor changes
  trackEditorChange(action: string, details: any): void {
    this.addEvent('editor', `Editor: ${action}`, details);
  }

  // Track component selection
  trackComponentSelection(componentName: string, componentType: string): void {
    this.addEvent('component', `Selected ${componentType}: ${componentName}`, {
      componentName,
      componentType,
    });
  }

  // Track navigation
  trackNavigation(fromPath: string, toPath: string): void {
    this.addEvent(
      'navigation',
      `Navigated to ${toPath}`,
      {
        fromPath,
        toPath,
      },
      false
    );
  }

  // Get all events
  getEvents(): SessionEvent[] {
    return [...this.events];
  }

  // Get current state
  getState(): SessionState {
    return {
      events: this.getEvents(),
      currentPosition: this.currentPosition,
    };
  }

  // Jump to a specific event
  jumpToEvent(eventId: string): SessionEvent | null {
    const index = this.events.findIndex((e) => e.id === eventId);
    if (index === -1) return null;

    this.currentPosition = index;
    this.saveToStorage();
    this.notifyListeners();

    return this.events[index];
  }

  // Revert to a specific event (removes all events after it)
  revertToEvent(eventId: string): SessionEvent | null {
    const index = this.events.findIndex((e) => e.id === eventId);
    if (index === -1) return null;

    this.events = this.events.slice(0, index + 1);
    this.currentPosition = index;

    this.saveToStorage();
    this.notifyListeners();

    return this.events[index];
  }

  // Clear all history
  clearHistory(): void {
    this.events = [];
    this.currentPosition = -1;

    this.saveToStorage();
    this.notifyListeners();
  }

  // Subscribe to changes
  subscribe(listener: (state: SessionState) => void): () => void {
    this.listeners.add(listener);
    listener(this.getState()); // Send initial state

    return () => {
      this.listeners.delete(listener);
    };
  }

  // Notify all listeners
  private notifyListeners(): void {
    const state = this.getState();
    this.listeners.forEach((listener) => listener(state));
  }

  // Save to localStorage
  private saveToStorage(): void {
    try {
      const data = {
        events: this.events.map((e) => ({
          ...e,
          timestamp: e.timestamp.toISOString(),
        })),
        currentPosition: this.currentPosition,
      };
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save session history:', error);
    }
  }

  // Load from localStorage
  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        this.events = data.events.map((e: any) => ({
          ...e,
          timestamp: new Date(e.timestamp),
        }));
        this.currentPosition = data.currentPosition;
      }
    } catch (error) {
      console.error('Failed to load session history:', error);
      this.events = [];
      this.currentPosition = -1;
    }
  }

  // Get events by type
  getEventsByType(type: SessionEvent['type']): SessionEvent[] {
    return this.events.filter((e) => e.type === type);
  }

  // Get recent events
  getRecentEvents(count: number = 10): SessionEvent[] {
    return this.events.slice(-count);
  }

  // Check if can revert
  canRevert(): boolean {
    return this.currentPosition > 0;
  }

  // Check if can redo
  canRedo(): boolean {
    return this.currentPosition < this.events.length - 1;
  }
}

// Export singleton instance
export const sessionHistory = SessionHistory.getInstance();
