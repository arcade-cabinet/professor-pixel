import { ClientStorage } from "@shared/storage-client";

// Environment detection for storage mode
export const isStaticMode = (): boolean => {
  // Detect if we're in GitHub Pages static mode
  return import.meta.env.VITE_STATIC_MODE === 'true' || 
         typeof window !== 'undefined' && window.location.hostname.includes('github.io');
};

// Singleton client storage instance
let clientStorageInstance: ClientStorage | null = null;

export const getClientStorage = (): ClientStorage => {
  if (!clientStorageInstance) {
    clientStorageInstance = new ClientStorage();
  }
  return clientStorageInstance;
};

// Storage adapter that uses client storage in static mode
export class StorageAdapter {
  private storage: ClientStorage;

  constructor() {
    this.storage = getClientStorage();
  }

  // Lesson methods
  async getLessons() {
    return this.storage.getLessons();
  }

  async getLesson(id: string) {
    return this.storage.getLesson(id);
  }

  // Progress methods  
  async getUserProgress(userId: string = 'anonymous-user') {
    return this.storage.getUserProgress(userId);
  }

  async getUserProgressForLesson(lessonId: string, userId: string = 'anonymous-user') {
    return this.storage.getUserProgressForLesson(userId, lessonId);
  }

  async updateUserProgress(lessonId: string, progressData: any, userId: string = 'anonymous-user') {
    return this.storage.updateUserProgress(userId, lessonId, progressData);
  }

  // Project methods
  async listProjects(userId: string = 'anonymous-user') {
    return this.storage.listProjects(userId);
  }

  async getProject(id: string) {
    return this.storage.getProject(id);
  }

  async createProject(project: any, userId: string = 'anonymous-user') {
    return this.storage.createProject({ ...project, userId });
  }

  async updateProject(id: string, updates: any) {
    return this.storage.updateProject(id, updates);
  }

  async deleteProject(id: string) {
    return this.storage.deleteProject(id);
  }

  async listPublishedProjects() {
    return this.storage.listPublishedProjects();
  }
}