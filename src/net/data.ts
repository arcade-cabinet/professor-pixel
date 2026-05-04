import { isStaticMode, StorageAdapter } from './storage-mode';

// Centralized data layer that switches between API and static storage
class DataService {
  private storageAdapter: StorageAdapter | null = null;

  private getStorageAdapter() {
    if (!this.storageAdapter) {
      this.storageAdapter = new StorageAdapter();
    }
    return this.storageAdapter;
  }

  // Helper to make API requests in non-static mode
  private async apiRequest(method: string, url: string, data?: any) {
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: data ? JSON.stringify(data) : undefined,
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }

    return response.json();
  }

  // Lesson methods
  async getLessons() {
    if (isStaticMode()) {
      return this.getStorageAdapter().getLessons();
    }
    return this.apiRequest('GET', '/api/lessons');
  }

  async getLesson(id: string) {
    if (isStaticMode()) {
      return this.getStorageAdapter().getLesson(id);
    }
    return this.apiRequest('GET', `/api/lessons/${id}`);
  }

  // Progress methods
  async getUserProgress() {
    if (isStaticMode()) {
      return this.getStorageAdapter().getUserProgress();
    }
    return this.apiRequest('GET', '/api/progress');
  }

  async getUserProgressForLesson(lessonId: string) {
    if (isStaticMode()) {
      return this.getStorageAdapter().getUserProgressForLesson(lessonId);
    }
    return this.apiRequest('GET', `/api/progress/${lessonId}`);
  }

  async updateUserProgress(lessonId: string, progressData: any) {
    if (isStaticMode()) {
      return this.getStorageAdapter().updateUserProgress(lessonId, progressData);
    }
    return this.apiRequest('PUT', `/api/progress/${lessonId}`, progressData);
  }

  // Project methods
  async listProjects() {
    if (isStaticMode()) {
      return this.getStorageAdapter().listProjects();
    }
    return this.apiRequest('GET', '/api/projects');
  }

  async getProject(id: string) {
    if (isStaticMode()) {
      return this.getStorageAdapter().getProject(id);
    }
    return this.apiRequest('GET', `/api/projects/${id}`);
  }

  async createProject(project: any) {
    if (isStaticMode()) {
      return this.getStorageAdapter().createProject(project);
    }
    return this.apiRequest('POST', '/api/projects', project);
  }

  async updateProject(id: string, updates: any) {
    if (isStaticMode()) {
      return this.getStorageAdapter().updateProject(id, updates);
    }
    return this.apiRequest('PUT', `/api/projects/${id}`, updates);
  }

  async deleteProject(id: string) {
    if (isStaticMode()) {
      return this.getStorageAdapter().deleteProject(id);
    }
    return this.apiRequest('DELETE', `/api/projects/${id}`);
  }

  async listPublishedProjects() {
    if (isStaticMode()) {
      return this.getStorageAdapter().listPublishedProjects();
    }
    return this.apiRequest('GET', '/api/gallery');
  }
}

// Singleton instance
export const dataService = new DataService();