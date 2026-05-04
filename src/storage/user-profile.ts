import type { UserProfile, WizardState } from "@shared/schema";

// User Profile Management
export const getUserProfile = (): UserProfile | null => {
  const stored = localStorage.getItem('pygame_academy_profile');
  if (!stored) return null;
  
  try {
    return JSON.parse(stored) as UserProfile;
  } catch (e) {
    console.error('Failed to parse user profile:', e);
    return null;
  }
};

export const saveUserProfile = (profile: UserProfile): void => {
  localStorage.setItem('pygame_academy_profile', JSON.stringify(profile));
};

export const updateUserProfile = (updates: Partial<UserProfile>): UserProfile | null => {
  const current = getUserProfile();
  if (!current) return null;
  
  const updated = {
    ...current,
    ...updates,
    lastVisitAt: new Date()
  };
  
  saveUserProfile(updated);
  return updated;
};

// Wizard State Management
export const getWizardState = (): WizardState => {
  const stored = localStorage.getItem('pygame_academy_wizard');
  if (!stored) {
    return {
      currentStep: 'welcome',
      answers: {},
      suggestedTemplates: []
    };
  }
  
  try {
    return JSON.parse(stored) as WizardState;
  } catch (e) {
    console.error('Failed to parse wizard state:', e);
    return {
      currentStep: 'welcome',
      answers: {},
      suggestedTemplates: []
    };
  }
};

export const saveWizardState = (state: WizardState): void => {
  localStorage.setItem('pygame_academy_wizard', JSON.stringify(state));
};

export const resetWizardState = (): void => {
  localStorage.removeItem('pygame_academy_wizard');
};

// Conversation History
export const getConversationHistory = (): any[] => {
  const stored = localStorage.getItem('pygame_academy_conversations');
  if (!stored) return [];
  
  try {
    return JSON.parse(stored);
  } catch (e) {
    console.error('Failed to parse conversation history:', e);
    return [];
  }
};

export const saveConversationHistory = (messages: any[]): void => {
  // Keep only last 50 messages to avoid localStorage limits
  const toSave = messages.slice(-50);
  localStorage.setItem('pygame_academy_conversations', JSON.stringify(toSave));
};

// Helper functions
export const isNewUser = (): boolean => {
  return getUserProfile() === null;
};

export const hasCompletedOnboarding = (): boolean => {
  const profile = getUserProfile();
  return profile?.onboardingComplete || false;
};

export const getUserSkillLevel = (): string => {
  const profile = getUserProfile();
  return profile?.skillLevel || 'beginner';
};

export const createNewProfile = (name: string, skillLevel: UserProfile['skillLevel']): UserProfile => {
  const now = new Date();
  const profile: UserProfile = {
    id: `user-${Date.now()}`,
    name,
    firstVisitAt: now,
    lastVisitAt: now,
    skillLevel,
    interests: [],
    preferredGenres: [],
    completedLessons: [],
    mascotName: 'Pixel',
    onboardingComplete: false
  };
  
  saveUserProfile(profile);
  return profile;
};