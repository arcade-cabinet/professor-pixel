import { StorageAdapter } from '@lib/storage/mode';
import type { UserProgress, Project, InsertProject } from '@lib/types/schema';

// Pure browser app — no backend exists. Every method routes to the
// client-side StorageAdapter (localStorage / OPFS). Used to gate behind
// `isStaticMode()`, but the apiRequest path was dead code that would
// have 404'd on Capacitor + Pages and was kept alive only by the
// localhost-vs-github.io heuristic in storage/mode.ts.
class DataService {
  private storageAdapter: StorageAdapter | null = null;

  private getStorageAdapter() {
    if (!this.storageAdapter) {
      this.storageAdapter = new StorageAdapter();
    }
    return this.storageAdapter;
  }

  async getLessons() {
    return this.getStorageAdapter().getLessons();
  }

  async getLesson(id: string) {
    return this.getStorageAdapter().getLesson(id);
  }

  async getUserProgress() {
    return this.getStorageAdapter().getUserProgress();
  }

  async getUserProgressForLesson(lessonId: string) {
    return this.getStorageAdapter().getUserProgressForLesson(lessonId);
  }

  async updateUserProgress(lessonId: string, progressData: Partial<UserProgress>) {
    return this.getStorageAdapter().updateUserProgress(lessonId, progressData);
  }

  async listProjects() {
    return this.getStorageAdapter().listProjects();
  }

  async getProject(id: string) {
    return this.getStorageAdapter().getProject(id);
  }

  async createProject(project: Omit<InsertProject, 'userId'>) {
    return this.getStorageAdapter().createProject(project);
  }

  async updateProject(id: string, updates: Partial<Project>) {
    return this.getStorageAdapter().updateProject(id, updates);
  }

  async deleteProject(id: string) {
    return this.getStorageAdapter().deleteProject(id);
  }

  async listPublishedProjects() {
    return this.getStorageAdapter().listPublishedProjects();
  }
}

export const dataService = new DataService();
