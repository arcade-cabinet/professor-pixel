// localStorage wrapper for progress tracking
import type { UserProgress } from "@shared/schema";

const STORAGE_PREFIX = 'pygame_academy_';
const PROGRESS_KEY = STORAGE_PREFIX + 'progress';

export const localStorageService = {
  // Get all progress
  getProgress(): UserProgress[] {
    try {
      const data = localStorage.getItem(PROGRESS_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  // Get progress for a specific lesson
  getLessonProgress(lessonId: string): UserProgress | null {
    const allProgress = this.getProgress();
    return allProgress.find(p => p.lessonId === lessonId) || null;
  },

  // Update progress for a lesson
  updateProgress(lessonId: string, updates: Partial<UserProgress>): UserProgress {
    const allProgress = this.getProgress();
    const existingIndex = allProgress.findIndex(p => p.lessonId === lessonId);
    
    const newProgress: UserProgress = {
      id: updates.id || `progress_${lessonId}_${Date.now()}`,
      userId: 'local-user',
      lessonId,
      currentStep: updates.currentStep ?? 0,
      completed: updates.completed ?? false,
      code: updates.code
    };

    if (existingIndex >= 0) {
      // Update existing
      allProgress[existingIndex] = { ...allProgress[existingIndex], ...newProgress };
    } else {
      // Add new
      allProgress.push(newProgress);
    }

    localStorage.setItem(PROGRESS_KEY, JSON.stringify(allProgress));
    return newProgress;
  },

  // Clear all progress
  clearProgress(): void {
    localStorage.removeItem(PROGRESS_KEY);
  },

  // Check if running in GitHub Pages or static mode
  isStaticMode(): boolean {
    // Check if we're on GitHub Pages or running without a backend
    return window.location.hostname.includes('github.io') || 
           window.location.protocol === 'file:' ||
           !window.location.hostname.includes('localhost');
  }
};