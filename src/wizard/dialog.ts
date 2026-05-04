import type { ConversationMessage, UserProfile } from "@shared/schema";

export type DialogStep = {
  pixel?: string;
  getUserName?: boolean;
  getInput?: string;
  quickReplies?: string[];
  action?: string;
  condition?: (profile: UserProfile | null) => boolean;
};

export type DialogFlow = DialogStep[];

// Define all conversation flows
export const dialogFlows = {
  firstVisit: [
    { 
      pixel: "Hey there! 👋 I'm Pixel, your game-building sidekick! I'm here to help you create amazing Python games. What should I call you?" 
    },
    { 
      getUserName: true 
    },
    { 
      pixel: "Awesome to meet you, {name}! 🎮 I love that name! So, have you ever made games with Python before?" 
    },
    { 
      quickReplies: ["First time! 🆕", "I've tried a bit 📝", "I know Python 🐍", "I'm a pro! 💪"] 
    },
    {
      pixel: "Perfect! I'll make sure we go at just the right pace for you. What kind of games get you most excited?"
    },
    {
      quickReplies: ["Action/Platformer 🏃", "Puzzle Games 🧩", "Adventure 🗺️", "Racing 🏎️", "Music/Rhythm 🎵", "Creative Sandbox 🎨"]
    },
    {
      pixel: "Excellent choice! I've got some cool templates that match your interests. Ready to start building something awesome?"
    },
    {
      quickReplies: ["Let's do this! 🚀", "Show me around first 👀", "I want to learn Python basics 📚"]
    }
  ] as DialogFlow,
  
  returningUser: [
    {
      pixel: "Hey {name}! Welcome back! 🎉 I've been waiting for you!"
    },
    {
      condition: (profile) => !!profile?.currentProject,
      pixel: "Want to continue working on your {currentProject}?"
    },
    {
      quickReplies: ["Continue my project ▶️", "Start something new ✨", "Practice Python 📝", "Browse gallery 🖼️"]
    }
  ] as DialogFlow,
  
  gameSelection: [
    {
      pixel: "Let's create something amazing! What type of game speaks to you today?"
    },
    {
      quickReplies: [
        "Platformer - Jump & Run 🏃",
        "Puzzle - Brain Teasers 🧩",
        "Adventure - Explore Worlds 🌍", 
        "Racing - Speed Thrills 🏎️",
        "Music - Rhythm & Beats 🎵",
        "Tower Defense - Strategy 🏰",
        "Endless Runner - Non-stop Action 🏃‍♂️",
        "Pet Sim - Virtual Companions 🐾"
      ]
    }
  ] as DialogFlow,
  
  lessonSuggestion: [
    {
      pixel: "I noticed you're working with {concept}. Would you like me to show you some cool tricks with that?"
    },
    {
      quickReplies: ["Yes, show me! 📚", "I got this 💪"]
    }
  ] as DialogFlow,
  
  encouragement: [
    {
      pixel: "You're doing great, {name}! 🌟 Every pro game developer started exactly where you are now."
    }
  ] as DialogFlow,
  
  projectComplete: [
    {
      pixel: "WOW! You did it, {name}! 🎊 Your game looks fantastic!"
    },
    {
      pixel: "Want to share it with others or keep building?"
    },
    {
      quickReplies: ["Share it! 🌐", "Keep building ➕"]
    }
  ] as DialogFlow,
  
  helpOffered: [
    {
      pixel: "Looks like you might be stuck. No worries - happens to all of us! Want some help?"
    },
    {
      quickReplies: ["Yes please! 🆘", "Let me try more 💭"]
    }
  ] as DialogFlow,
  
  renamePixel: [
    {
      pixel: "Oh, you want to give me a new name? I'm honored! What would you like to call me?"
    },
    {
      getInput: "mascotName"
    },
    {
      pixel: "I love it! From now on, call me {mascotName}! 🎭"
    }
  ] as DialogFlow
};

// Pixel's personality traits and responses
export const pixelPersonality = {
  greetings: [
    "Hey there, coder! 👋",
    "Ready to build something awesome? 🚀",
    "Welcome back, game creator! 🎮",
    "Let's make some magic happen! ✨"
  ],
  
  encouragements: [
    "You're crushing it! 💪",
    "That's exactly right! 🎯", 
    "Brilliant work! 🌟",
    "You're a natural at this! 🏆",
    "Keep going, you're doing amazing! 🔥"
  ],
  
  hints: [
    "Here's a tip: {hint} 💡",
    "Try thinking about it this way: {hint} 🤔",
    "What if you {hint}? 🎯",
    "Pro tip: {hint} 🎓"
  ],
  
  celebrations: [
    "WOOHOO! You did it! 🎉",
    "That's what I'm talking about! 🎊",
    "Incredible work! 🏆",
    "You're officially awesome! 🌟",
    "High five! ✋ You nailed it!"
  ],
  
  thinking: [
    "Hmm, let me think... 🤔",
    "Great question! Let me process that... 💭",
    "Interesting! Give me a sec... ⚡",
    "Ooh, I love this challenge... 🧠"
  ]
};

// Helper function to process dialog steps
export function processDialogStep(
  step: DialogStep, 
  profile: UserProfile | null,
  context: Record<string, any> = {}
): string {
  if (!step.pixel) return "";
  
  let message = step.pixel;
  
  // Replace placeholders with actual values
  if (profile) {
    message = message.replace("{name}", profile.name);
    message = message.replace("{currentProject}", profile.currentProject || "your project");
    message = message.replace("{mascotName}", profile.mascotName || "Pixel");
  }
  
  // Replace context variables
  Object.keys(context).forEach(key => {
    message = message.replace(`{${key}}`, context[key]);
  });
  
  return message;
}

// Create a conversation message
export function createMessage(
  content: string,
  role: ConversationMessage['role'] = 'pixel',
  quickReplies?: string[],
  actionType?: ConversationMessage['actionType']
): ConversationMessage {
  return {
    id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    role,
    content,
    timestamp: new Date(),
    quickReplies,
    actionType
  };
}

// Get appropriate dialog flow based on user state
export function getDialogFlow(
  state: string,
  profile: UserProfile | null
): DialogFlow {
  if (!profile || !profile.onboardingComplete) {
    return dialogFlows.firstVisit;
  }
  
  switch(state) {
    case 'returning':
      return dialogFlows.returningUser;
    case 'gameSelection':
      return dialogFlows.gameSelection;
    case 'lessonSuggestion':
      return dialogFlows.lessonSuggestion;
    case 'projectComplete':
      return dialogFlows.projectComplete;
    case 'help':
      return dialogFlows.helpOffered;
    case 'rename':
      return dialogFlows.renamePixel;
    default:
      return dialogFlows.returningUser;
  }
}

// Get a random personality response
export function getPixelResponse(type: keyof typeof pixelPersonality): string {
  const responses = pixelPersonality[type];
  return responses[Math.floor(Math.random() * responses.length)];
}

// Map skill levels to appropriate responses
export const skillLevelResponses = {
  'beginner': {
    pace: "Let's start with the basics and build up from there!",
    explanation: "detailed",
    examples: "many"
  },
  'learning': {
    pace: "You know some stuff! Let's expand on that foundation.",
    explanation: "moderate", 
    examples: "some"
  },
  'confident': {
    pace: "You've got skills! Let's dive into the fun stuff.",
    explanation: "concise",
    examples: "few"
  },
  'pro': {
    pace: "Expert mode activated! Let's build something epic.",
    explanation: "minimal",
    examples: "advanced"
  }
};

// Pixel's emotional states (for avatar expressions)
export enum PixelMood {
  Happy = "happy",
  Excited = "excited",
  Thinking = "thinking",
  Helpful = "helpful",
  Celebrating = "celebrating",
  Curious = "curious",
  Encouraging = "encouraging",
  Proud = "proud"
}

// Get mood based on context
export function getPixelMood(context: string): PixelMood {
  const moodMap: Record<string, PixelMood> = {
    greeting: PixelMood.Happy,
    question: PixelMood.Curious,
    success: PixelMood.Celebrating,
    help: PixelMood.Helpful,
    encouragement: PixelMood.Encouraging,
    thinking: PixelMood.Thinking,
    achievement: PixelMood.Proud,
    excited: PixelMood.Excited
  };
  
  return moodMap[context] || PixelMood.Happy;
}