import {
  type User,
  type Lesson,
  type UserProgress,
  type Project,
  type InsertProject,
  LessonSchema,
} from '@lib/types/schema';

// Client-side storage adapter for GitHub Pages compatibility
// Uses static JSON files for lessons and LocalStorage for user data
export class ClientStorage {
  private static readonly STORAGE_KEYS = {
    USERS: 'pygame_academy_users',
    PROGRESS: 'pygame_academy_progress', 
    PROJECTS: 'pygame_academy_projects'
  };

  constructor() {
    // Initialize storage if needed
    this.initializeLocalStorage();
  }

  private initializeLocalStorage() {
    if (typeof window === 'undefined') return;
    
    // Initialize empty collections if they don't exist
    if (!localStorage.getItem(ClientStorage.STORAGE_KEYS.USERS)) {
      localStorage.setItem(ClientStorage.STORAGE_KEYS.USERS, JSON.stringify({}));
    }
    if (!localStorage.getItem(ClientStorage.STORAGE_KEYS.PROGRESS)) {
      localStorage.setItem(ClientStorage.STORAGE_KEYS.PROGRESS, JSON.stringify({}));
    }
    if (!localStorage.getItem(ClientStorage.STORAGE_KEYS.PROJECTS)) {
      localStorage.setItem(ClientStorage.STORAGE_KEYS.PROJECTS, JSON.stringify({}));
    }
  }

  private getFromLocalStorage<T>(key: string): T {
    if (typeof window === 'undefined') return {} as T;
    const data = localStorage.getItem(key);
    return data ? (JSON.parse(data) as T) : ({} as T);
  }

  private saveToLocalStorage<T>(key: string, data: T): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(key, JSON.stringify(data));
  }

  private generateId(): string {
    // Client-side UUID generation
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    // Fallback for older browsers
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
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
    return Object.values(users).find(user => user.username === username);
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
    return lessons.find(lesson => lesson.id === id);
  }

  // Progress methods - use LocalStorage
  async getUserProgress(userId: string): Promise<UserProgress[]> {
    const progress = this.getFromLocalStorage<Record<string, UserProgress>>(ClientStorage.STORAGE_KEYS.PROGRESS);
    return Object.values(progress).filter(p => p.userId === userId);
  }

  async getUserProgressForLesson(userId: string, lessonId: string): Promise<UserProgress | undefined> {
    const progress = this.getFromLocalStorage<Record<string, UserProgress>>(ClientStorage.STORAGE_KEYS.PROGRESS);
    return Object.values(progress).find(p => p.userId === userId && p.lessonId === lessonId);
  }

  async updateUserProgress(userId: string, lessonId: string, progressData: Partial<UserProgress>): Promise<UserProgress> {
    const progressMap = this.getFromLocalStorage<Record<string, UserProgress>>(ClientStorage.STORAGE_KEYS.PROGRESS);
    
    // Find existing progress or create new
    const existingProgress = Object.values(progressMap).find(p => p.userId === userId && p.lessonId === lessonId);
    
    let progress: UserProgress;
    if (existingProgress) {
      progress = {
        ...existingProgress,
        ...progressData
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
    const projects = this.getFromLocalStorage<Record<string, Project>>(ClientStorage.STORAGE_KEYS.PROJECTS);
    return Object.values(projects).filter(p => p.userId === userId);
  }

  async getProject(id: string): Promise<Project | undefined> {
    const projects = this.getFromLocalStorage<Record<string, Project>>(ClientStorage.STORAGE_KEYS.PROJECTS);
    return projects[id];
  }

  async createProject(project: InsertProject): Promise<Project> {
    const projects = this.getFromLocalStorage<Record<string, Project>>(ClientStorage.STORAGE_KEYS.PROJECTS);
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
    const projects = this.getFromLocalStorage<Record<string, Project>>(ClientStorage.STORAGE_KEYS.PROJECTS);
    const project = projects[id];
    if (!project) {
      throw new Error('Project not found');
    }
    
    const updatedProject = {
      ...project,
      ...updates
    };
    projects[id] = updatedProject;
    this.saveToLocalStorage(ClientStorage.STORAGE_KEYS.PROJECTS, projects);
    return updatedProject;
  }

  async deleteProject(id: string): Promise<void> {
    const projects = this.getFromLocalStorage<Record<string, Project>>(ClientStorage.STORAGE_KEYS.PROJECTS);
    delete projects[id];
    this.saveToLocalStorage(ClientStorage.STORAGE_KEYS.PROJECTS, projects);
  }

  // Gallery methods
  async listPublishedProjects(): Promise<Project[]> {
    const projects = this.getFromLocalStorage<Record<string, Project>>(ClientStorage.STORAGE_KEYS.PROJECTS);
    return Object.values(projects).filter(p => p.published);
  }

  async publishProject(id: string): Promise<Project> {
    return this.updateProject(id, { 
      published: true, 
      publishedAt: new Date() 
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
        id: "lesson-1",
        title: "Python Basics",
        description: "Variables, data types, print, and input",
        order: 1,
        intro: "🐍 Welcome to Python programming! In this lesson, you'll learn the fundamental building blocks: variables, data types, and how to interact with users.",
        learningObjectives: [
          "Create and use variables to store different types of data",
          "Work with strings, numbers, and booleans",
          "Use print() to display messages and information",
          "Get user input with input() function",
          "Convert between different data types"
        ],
        goalDescription: "Master the basics of Python by creating an interactive program that collects and displays user information!",
        previewCode: "name = input('Enter your name: ')\nage = int(input('Enter your age: '))\nprint(f'Hello {name}, you are {age} years old!')",
        content: {
          introduction: "Python is a powerful and beginner-friendly programming language. Let's start with the fundamentals that every Python programmer needs to know!",
          steps: [
            {
              id: "step-1",
              title: "Your First Python Message",
              description: "Let's start by displaying messages on screen. The print() function is used to show text output.",
              initialCode: "# Use the print() function to display at least 2 messages\n# You can write any greeting or welcome messages you like!\n",
              solution: "print('Hello, World!')\nprint('Welcome to Python programming!')",
              hints: ["Use print() function to display text", "Put text inside quotes", "Try using at least 2 print statements"],
              tests: [
                {
                  mode: "rules",
                  expectedOutput: "Any greeting messages",
                  description: "Should use print() function to display messages",
                  astRules: {
                    requiredFunctions: ["print"],
                    requiredConstructs: [
                      { type: "function_call", name: "print", minCount: 2 },
                      { type: "string_literal", minCount: 2 }
                    ]
                  },
                  runtimeRules: {
                    outputContains: []
                  }
                }
              ]
            }
          ]
        },
        prerequisites: [],
        difficulty: "Beginner",
        estimatedTime: 25
      }
    ];
  }
}