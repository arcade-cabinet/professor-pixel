import {
  type User,
  type Lesson,
  type UserProgress,
  type Project,
  type InsertProject,
  LessonSchema,
} from '@lib/types/schema';
import { isQuotaExceeded } from '@lib/storage/persistence';

// Client-side storage adapter for GitHub Pages compatibility
// Uses static JSON files for lessons and LocalStorage for user data
export class ClientStorage {
  private static readonly STORAGE_KEYS = {
    USERS: 'pygame_academy_users',
    PROGRESS: 'pygame_academy_progress',
    PROJECTS: 'pygame_academy_projects',
  };

  constructor() {
    // Initialize storage if needed
    this.initializeLocalStorage();
  }

  private initializeLocalStorage() {
    if (typeof window === 'undefined') return;

    // Wrap each setItem so a quota error on first init (Safari private mode,
    // full disk on Chromebooks) doesn't bubble out of the constructor and
    // white-screen the page.
    const safeInit = (key: string) => {
      if (localStorage.getItem(key)) return;
      try {
        localStorage.setItem(key, JSON.stringify({}));
      } catch (err) {
        this.handleStorageError(err as Error, `initializeLocalStorage(${key})`);
      }
    };
    safeInit(ClientStorage.STORAGE_KEYS.USERS);
    safeInit(ClientStorage.STORAGE_KEYS.PROGRESS);
    safeInit(ClientStorage.STORAGE_KEYS.PROJECTS);
  }

  // Mirror src/storage/persistence.ts handleStorageError. Surfaces a kid-
  // friendly toast when the host page exposes one; never throws.
  private handleStorageError(error: Error, operation: string): void {
    console.error(`ClientStorage operation failed (${operation}):`, error);
    if (typeof window === 'undefined') return;
    if (isQuotaExceeded(error)) {
      const winWithToast = window as Window & { toast?: (msg: unknown) => void };
      if (typeof winWithToast.toast === 'function') {
        winWithToast.toast(
          "Looks like your saved games are full! Open the menu to clear old data, or your browser's site settings."
        );
      }
    }
  }

  private getFromLocalStorage<T>(key: string): T {
    if (typeof window === 'undefined') return {} as T;
    const data = localStorage.getItem(key);
    if (!data) return {} as T;
    try {
      return JSON.parse(data) as T;
    } catch (err) {
      // Corrupted entry (truncated write, browser-extension tampering, etc.) —
      // a SyntaxError out of an async queryFn would otherwise punt the page
      // to the error boundary. Treat the slot as empty and let the caller
      // overwrite on next save.
      console.warn(`getFromLocalStorage: corrupt JSON in ${key}, treating as empty`, err);
      return {} as T;
    }
  }

  private saveToLocalStorage<T>(key: string, data: T): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (err) {
      // Quota-exceeded, Safari private mode, full disk — never let it bubble
      // out and trip the React error boundary mid-wizard.
      this.handleStorageError(err as Error, `saveToLocalStorage(${key})`);
    }
  }

  private generateId(): string {
    // Client-side UUID generation
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    // Fallback for older browsers
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  // User methods - anonymous users for static mode (no passwords)
  async getUser(id: string): Promise<User | undefined> {
    const users = this.getFromLocalStorage<Record<string, User>>(ClientStorage.STORAGE_KEYS.USERS);
    return users[id];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const users = this.getFromLocalStorage<Record<string, User>>(ClientStorage.STORAGE_KEYS.USERS);
    return Object.values(users).find((user) => user.username === username);
  }

  async createAnonymousUser(username: string): Promise<User> {
    const users = this.getFromLocalStorage<Record<string, User>>(ClientStorage.STORAGE_KEYS.USERS);
    const newUser: User = {
      id: this.generateId(),
      username,
    };
    users[newUser.id] = newUser;
    this.saveToLocalStorage(ClientStorage.STORAGE_KEYS.USERS, users);
    return newUser;
  }

  // Lesson methods - load from static JSON files
  async getLessons(): Promise<Lesson[]> {
    const baseUrl = import.meta.env.BASE_URL || '/';
    let response: Response;
    try {
      response = await fetch(`${baseUrl}api/static/lessons.json`);
    } catch (error) {
      // Network/IO error only — fall back so the app remains usable offline.
      console.warn('Failed to load lessons from static file, using fallback', error);
      return this.getFallbackLessons();
    }

    if (!response.ok) {
      console.warn(`lessons.json fetch returned ${response.status}, using fallback`);
      return this.getFallbackLessons();
    }

    const raw = (await response.json()) as unknown;
    const parsed = LessonSchema.array().safeParse(raw);
    if (!parsed.success) {
      // Schema-validation failure is an authoring bug, not a network problem —
      // surface it loudly so we don't silently render a corrupt catalog.
      const issues = parsed.error.issues
        .slice(0, 5)
        .map((i) => `${i.path.join('.')}: ${i.message}`)
        .join('; ');
      throw new Error(`lessons.json failed schema validation — ${issues}`);
    }
    return parsed.data;
  }

  async getLesson(id: string): Promise<Lesson | undefined> {
    const lessons = await this.getLessons();
    return lessons.find((lesson) => lesson.id === id);
  }

  // Progress methods - use LocalStorage
  async getUserProgress(userId: string): Promise<UserProgress[]> {
    const progress = this.getFromLocalStorage<Record<string, UserProgress>>(
      ClientStorage.STORAGE_KEYS.PROGRESS
    );
    return Object.values(progress).filter((p) => p.userId === userId);
  }

  // Wipe ALL progress rows for a user. Used by P7's profile "Switch user"
  // flow so the destination kid sees a fresh lessons list. Other rows for
  // other userIds (future multi-profile work) are preserved.
  async clearUserProgress(userId: string): Promise<void> {
    const progressMap = this.getFromLocalStorage<Record<string, UserProgress>>(
      ClientStorage.STORAGE_KEYS.PROGRESS
    );
    const kept: Record<string, UserProgress> = {};
    for (const [id, row] of Object.entries(progressMap)) {
      if (row.userId !== userId) kept[id] = row;
    }
    this.saveToLocalStorage(ClientStorage.STORAGE_KEYS.PROGRESS, kept);
  }

  async getUserProgressForLesson(
    userId: string,
    lessonId: string
  ): Promise<UserProgress | undefined> {
    const progress = this.getFromLocalStorage<Record<string, UserProgress>>(
      ClientStorage.STORAGE_KEYS.PROGRESS
    );
    return Object.values(progress).find((p) => p.userId === userId && p.lessonId === lessonId);
  }

  async updateUserProgress(
    userId: string,
    lessonId: string,
    progressData: Partial<UserProgress>
  ): Promise<UserProgress> {
    const progressMap = this.getFromLocalStorage<Record<string, UserProgress>>(
      ClientStorage.STORAGE_KEYS.PROGRESS
    );

    // Find existing progress or create new
    const existingProgress = Object.values(progressMap).find(
      (p) => p.userId === userId && p.lessonId === lessonId
    );

    let progress: UserProgress;
    if (existingProgress) {
      progress = {
        ...existingProgress,
        ...progressData,
      };
    } else {
      progress = {
        id: this.generateId(),
        userId,
        lessonId,
        currentStep: 0,
        completed: false,
        ...progressData,
      };
    }

    progressMap[progress.id] = progress;
    this.saveToLocalStorage(ClientStorage.STORAGE_KEYS.PROGRESS, progressMap);
    return progress;
  }

  // Project methods - use LocalStorage
  async listProjects(userId: string): Promise<Project[]> {
    const projects = this.getFromLocalStorage<Record<string, Project>>(
      ClientStorage.STORAGE_KEYS.PROJECTS
    );
    return Object.values(projects).filter((p) => p.userId === userId);
  }

  async getProject(id: string): Promise<Project | undefined> {
    const projects = this.getFromLocalStorage<Record<string, Project>>(
      ClientStorage.STORAGE_KEYS.PROJECTS
    );
    return projects[id];
  }

  async createProject(project: InsertProject): Promise<Project> {
    const projects = this.getFromLocalStorage<Record<string, Project>>(
      ClientStorage.STORAGE_KEYS.PROJECTS
    );
    const newProject: Project = {
      id: this.generateId(),
      createdAt: new Date(),
      ...project,
      published: false,
    };
    projects[newProject.id] = newProject;
    this.saveToLocalStorage(ClientStorage.STORAGE_KEYS.PROJECTS, projects);
    return newProject;
  }

  async updateProject(id: string, updates: Partial<Project>): Promise<Project> {
    const projects = this.getFromLocalStorage<Record<string, Project>>(
      ClientStorage.STORAGE_KEYS.PROJECTS
    );
    const project = projects[id];
    if (!project) {
      throw new Error('Project not found');
    }

    const updatedProject = {
      ...project,
      ...updates,
    };
    projects[id] = updatedProject;
    this.saveToLocalStorage(ClientStorage.STORAGE_KEYS.PROJECTS, projects);
    return updatedProject;
  }

  async deleteProject(id: string): Promise<void> {
    const projects = this.getFromLocalStorage<Record<string, Project>>(
      ClientStorage.STORAGE_KEYS.PROJECTS
    );
    delete projects[id];
    this.saveToLocalStorage(ClientStorage.STORAGE_KEYS.PROJECTS, projects);
  }

  // Gallery methods
  async listPublishedProjects(): Promise<Project[]> {
    const projects = this.getFromLocalStorage<Record<string, Project>>(
      ClientStorage.STORAGE_KEYS.PROJECTS
    );
    return Object.values(projects).filter((p) => p.published);
  }

  async publishProject(id: string): Promise<Project> {
    return this.updateProject(id, {
      published: true,
      publishedAt: new Date(),
    });
  }

  async unpublishProject(id: string): Promise<Project> {
    return this.updateProject(id, {
      published: false,
      publishedAt: undefined,
    });
  }

  // Fallback lesson data for when static files are not available
  private getFallbackLessons(): Lesson[] {
    return [
      {
        id: 'lesson-1',
        title: 'Python Basics',
        description: 'Variables, data types, print, and input',
        order: 1,
        intro:
          "🐍 Welcome to Python programming! In this lesson, you'll learn the fundamental building blocks: variables, data types, and how to interact with users.",
        learningObjectives: [
          'Create and use variables to store different types of data',
          'Work with strings, numbers, and booleans',
          'Use print() to display messages and information',
          'Get user input with input() function',
          'Convert between different data types',
        ],
        goalDescription:
          'Master the basics of Python by creating an interactive program that collects and displays user information!',
        previewCode:
          "name = input('Enter your name: ')\nage = int(input('Enter your age: '))\nprint(f'Hello {name}, you are {age} years old!')",
        content: {
          introduction:
            "Python is a powerful and beginner-friendly programming language. Let's start with the fundamentals that every Python programmer needs to know!",
          steps: [
            {
              id: 'step-1',
              title: 'Your First Python Message',
              description:
                "Let's start by displaying messages on screen. The print() function is used to show text output.",
              initialCode:
                '# Use the print() function to display at least 2 messages\n# You can write any greeting or welcome messages you like!\n',
              solution: "print('Hello, World!')\nprint('Welcome to Python programming!')",
              hints: [
                'Use print() function to display text',
                'Put text inside quotes',
                'Try using at least 2 print statements',
              ],
              tests: [
                {
                  mode: 'rules',
                  expectedOutput: 'Any greeting messages',
                  description: 'Should use print() function to display messages',
                  astRules: {
                    requiredFunctions: ['print'],
                    requiredConstructs: [
                      { type: 'function_call', name: 'print', minCount: 2 },
                      { type: 'string_literal', minCount: 2 },
                    ],
                  },
                  runtimeRules: {
                    outputContains: [],
                  },
                },
              ],
            },
          ],
        },
        prerequisites: [],
        difficulty: 'Beginner',
        estimatedTime: 25,
      },
    ];
  }
}
