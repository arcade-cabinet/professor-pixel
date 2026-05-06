import { ClientStorage } from '@lib/storage/client';
import type { UserProgress, Project, InsertProject } from '@lib/types/schema';

// Pure browser app — no backend exists. Every storage op routes
// to ClientStorage (localStorage / OPFS). The old `isStaticMode()`
// gate was a stub that broke on Capacitor (hostname `localhost`
// would mean "use the backend that doesn't exist").

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

  async updateUserProgress(
    lessonId: string,
    progressData: Partial<UserProgress>,
    userId: string = 'anonymous-user'
  ) {
    return this.storage.updateUserProgress(userId, lessonId, progressData);
  }

  // Project methods
  async listProjects(userId: string = 'anonymous-user') {
    return this.storage.listProjects(userId);
  }

  async getProject(id: string) {
    return this.storage.getProject(id);
  }

  async createProject(project: Omit<InsertProject, 'userId'>, userId: string = 'anonymous-user') {
    return this.storage.createProject({ ...project, userId });
  }

  async updateProject(id: string, updates: Partial<Project>) {
    return this.storage.updateProject(id, updates);
  }

  async deleteProject(id: string) {
    return this.storage.deleteProject(id);
  }

  async listPublishedProjects() {
    return this.storage.listPublishedProjects();
  }
}
