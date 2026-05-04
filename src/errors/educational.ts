/**
 * Educational Error Experience for Pixel's PyGame Palace
 * Transforms technical errors into learning opportunities
 */

import { logger } from "./console-logger";

export interface EducationalError {
  originalError: string;
  friendlyMessage: string;
  explanation: string;
  learningTips: string[];
  nextSteps: string[];
  documentation?: string;
  exampleCode?: string;
  relatedConcepts?: string[];
}

export interface ErrorPattern {
  pattern: RegExp;
  category: 'syntax' | 'runtime' | 'logic' | 'pygame' | 'import' | 'network' | 'system';
  createEducationalError: (match: RegExpMatchArray, originalError: string) => EducationalError;
}

class EducationalErrorTransformer {
  private patterns: ErrorPattern[] = [];

  constructor() {
    this.setupPythonErrorPatterns();
    this.setupPygameErrorPatterns();
    this.setupNetworkErrorPatterns();
    this.setupSystemErrorPatterns();
  }

  private setupPythonErrorPatterns() {
    // Syntax Errors
    this.patterns.push({
      pattern: /SyntaxError.*?invalid syntax.*?line (\d+)/,
      category: 'syntax',
      createEducationalError: (match, originalError) => ({
        originalError,
        friendlyMessage: `There's a syntax error on line ${match[1]} of your code.`,
        explanation: "Python couldn't understand the syntax (structure) of your code. This usually means there's a missing symbol, incorrect indentation, or typo.",
        learningTips: [
          "Check for missing colons (:) after if, for, while, or function definitions",
          "Make sure parentheses, brackets, and quotes are properly closed",
          "Verify that indentation is consistent (use spaces or tabs, but not both)",
          "Look for typos in Python keywords like 'if', 'for', 'while', 'def'"
        ],
        nextSteps: [
          `Look at line ${match[1]} in your code`,
          "Check the line above it too - sometimes the error is actually there",
          "Count your parentheses and brackets to make sure they match",
          "Try commenting out the problematic line to isolate the issue"
        ],
        relatedConcepts: ["Python Syntax", "Indentation", "Code Structure"]
      })
    });

    this.patterns.push({
      pattern: /IndentationError.*?expected an indented block.*?line (\d+)/,
      category: 'syntax',
      createEducationalError: (match, originalError) => ({
        originalError,
        friendlyMessage: `Python is expecting indented code after line ${match[1]}.`,
        explanation: "In Python, code after statements like 'if', 'for', 'while', and 'def' must be indented. Python uses indentation to understand which code belongs together.",
        learningTips: [
          "After a colon (:), the next line should be indented",
          "Use 4 spaces for each level of indentation (this is the Python standard)",
          "All lines at the same level should have the same indentation",
          "Don't mix tabs and spaces - choose one and stick with it"
        ],
        nextSteps: [
          `Add proper indentation after line ${match[1]}`,
          "Make sure you have a colon (:) at the end of the previous line",
          "Use 4 spaces to indent the code that should be inside the block",
          "Check that all related lines have the same indentation"
        ],
        exampleCode: `# Correct indentation:
if pygame_running:
    screen.fill((0, 0, 0))  # This line is indented
    pygame.display.flip()   # This line is also indented

# Incorrect (will cause IndentationError):
if pygame_running:
screen.fill((0, 0, 0))  # Missing indentation!`,
        relatedConcepts: ["Python Indentation", "Code Blocks", "Control Structures"]
      })
    });

    this.patterns.push({
      pattern: /NameError.*?name '(\w+)' is not defined/,
      category: 'runtime',
      createEducationalError: (match, originalError) => ({
        originalError,
        friendlyMessage: `Python doesn't recognize the name '${match[1]}'. It might be undefined or misspelled.`,
        explanation: "Python encountered a variable, function, or module name that it doesn't know about. This usually means you forgot to define it, imported it, or there's a typo.",
        learningTips: [
          "Variables must be assigned a value before you can use them",
          "Function names must be defined with 'def' before calling them",
          "Module names must be imported with 'import' before using them",
          "Check spelling carefully - Python is case-sensitive ('Name' ≠ 'name')"
        ],
        nextSteps: [
          `Check if you've defined '${match[1]}' somewhere in your code`,
          `Look for typos in '${match[1]}' - check capitalization too`,
          `If it's a function, make sure you've defined it with 'def ${match[1]}():'`,
          `If it's from a module, make sure you've imported it properly`
        ],
        exampleCode: `# Common solutions:

# 1. Define the variable first:
player_score = 0
print(player_score)  # Now this works!

# 2. Import modules:
import pygame
pygame.init()  # Now pygame is available

# 3. Define functions:
def move_player():
    # function code here
    pass

move_player()  # Now this works!`,
        relatedConcepts: ["Variables", "Functions", "Imports", "Scope"]
      })
    });

    this.patterns.push({
      pattern: /TypeError.*?'(\w+)' object is not callable/,
      category: 'runtime',
      createEducationalError: (match, originalError) => ({
        originalError,
        friendlyMessage: `You're trying to call '${match[1]}' like a function, but it's not a function.`,
        explanation: "You used parentheses after a variable name, which tells Python to treat it as a function. But the variable contains data, not a function.",
        learningTips: [
          "Parentheses () after a name mean 'call this function'",
          "Only use parentheses with actual functions or methods",
          "Check if you accidentally used the wrong variable name",
          "Variables holding numbers, strings, lists etc. can't be called like functions"
        ],
        nextSteps: [
          `Check what '${match[1]}' actually contains - is it the value you expected?`,
          "Remove the parentheses if you just want to use the variable",
          "If you meant to call a function, check that you're using the right name",
          "Look for where you might have accidentally overwritten a function name"
        ],
        exampleCode: `# Problem:
player_x = 100
player_x()  # Error! player_x is a number, not a function

# Solution:
player_x = 100
print(player_x)  # Just use the variable, no parentheses

# Or if you meant to call a function:
def move_player():
    return 100

player_x = move_player()  # Call the function to get the value`,
        relatedConcepts: ["Functions", "Variables", "Function Calls"]
      })
    });
  }

  private setupPygameErrorPatterns() {
    this.patterns.push({
      pattern: /pygame\.error.*?display mode not set/,
      category: 'pygame',
      createEducationalError: (match, originalError) => ({
        originalError,
        friendlyMessage: "You need to create a game window before drawing to the screen.",
        explanation: "Pygame requires you to set up a display (create a window) before you can draw anything. Think of it like needing a canvas before you can paint!",
        learningTips: [
          "Always call pygame.display.set_mode() to create your game window",
          "This should be done early in your program, after pygame.init()",
          "The screen object returned is what you'll draw on",
          "Set the window size based on your game's needs"
        ],
        nextSteps: [
          "Add pygame.display.set_mode() to create a window",
          "Choose appropriate width and height for your game",
          "Store the result in a variable (usually called 'screen')",
          "Make sure this happens before any drawing commands"
        ],
        exampleCode: `import pygame

pygame.init()
# Create the game window (this is what was missing!)
screen = pygame.display.set_mode((800, 600))  # 800x600 pixels
pygame.display.set_caption("My Game")

# Now you can draw to the screen:
screen.fill((0, 0, 0))  # Fill with black
pygame.display.flip()   # Show the changes`,
        relatedConcepts: ["Pygame Setup", "Game Window", "Display"]
      })
    });

    this.patterns.push({
      pattern: /pygame\.error.*?No such file or directory.*?'([^']+)'/,
      category: 'pygame',
      createEducationalError: (match, originalError) => ({
        originalError,
        friendlyMessage: `Pygame can't find the file '${match[1]}'. Make sure the file exists and the path is correct.`,
        explanation: "Pygame is looking for a file (like an image or sound) but can't find it. This usually means the filename is wrong or the file isn't in the expected location.",
        learningTips: [
          "Check that the file actually exists in your project",
          "File names are case-sensitive ('Image.png' ≠ 'image.png')",
          "Use relative paths from where your Python file is located",
          "Double-check the file extension (.png, .jpg, .wav, etc.)"
        ],
        nextSteps: [
          `Verify that '${match[1]}' exists in your project folder`,
          "Check the spelling and capitalization of the filename",
          "Make sure the file is in the correct folder relative to your Python file",
          "Try using an absolute path temporarily to test if the file loads"
        ],
        exampleCode: `# If your project structure is:
# my_game/
#   ├── game.py
#   └── images/
#       └── player.png

# In game.py, load the image like this:
player_image = pygame.image.load("images/player.png")

# Common mistakes:
# pygame.image.load("player.png")        # Wrong - file is in images folder
# pygame.image.load("Images/player.png") # Wrong - folder is lowercase
# pygame.image.load("images/Player.png") # Wrong - file is lowercase`,
        relatedConcepts: ["File Paths", "Pygame Assets", "File Management"]
      })
    });

    this.patterns.push({
      pattern: /AttributeError.*?'pygame\.Surface' object has no attribute '(\w+)'/,
      category: 'pygame',
      createEducationalError: (match, originalError) => ({
        originalError,
        friendlyMessage: `The pygame Surface doesn't have a '${match[1]}' method. Check the correct method name.`,
        explanation: "You're trying to use a method that doesn't exist on a pygame Surface object. This often happens due to typos or confusion between different pygame objects.",
        learningTips: [
          "pygame.Surface objects (like screen) have specific methods for drawing",
          "Common Surface methods: blit(), fill(), get_rect(), convert()",
          "Check pygame documentation for the correct method names",
          "Make sure you're using the right object for what you want to do"
        ],
        nextSteps: [
          `Check if '${match[1]}' is spelled correctly`,
          "Look up the correct method name in pygame documentation",
          "Verify you're calling the method on the right type of object",
          "Consider if you meant to use a different pygame object or module"
        ],
        exampleCode: `# Common pygame Surface methods:
screen = pygame.display.set_mode((800, 600))

# Correct methods:
screen.fill((255, 0, 0))           # Fill with red
screen.blit(image, (x, y))         # Draw an image
rect = screen.get_rect()           # Get the screen rectangle

# If you want to draw shapes, use pygame.draw:
pygame.draw.circle(screen, (0, 255, 0), (100, 100), 50)
pygame.draw.rect(screen, (0, 0, 255), (50, 50, 100, 100))`,
        relatedConcepts: ["Pygame Surfaces", "Drawing Methods", "Pygame Documentation"]
      })
    });
  }

  private setupNetworkErrorPatterns() {
    this.patterns.push({
      pattern: /NetworkError|Failed to fetch|ERR_NETWORK/,
      category: 'network',
      createEducationalError: (match, originalError) => ({
        originalError,
        friendlyMessage: "There's a problem connecting to the internet or the server.",
        explanation: "Your browser couldn't connect to the server. This might be due to internet connectivity issues, server problems, or browser settings.",
        learningTips: [
          "Network errors are usually temporary and not caused by your code",
          "These errors happen when the browser can't reach the server",
          "Your Python code is probably correct - it's a connectivity issue",
          "Different networks (school, home, public WiFi) may have different restrictions"
        ],
        nextSteps: [
          "Check your internet connection",
          "Try refreshing the page",
          "Wait a moment and try again - servers sometimes have temporary issues",
          "If at school, ask your teacher about network restrictions"
        ],
        relatedConcepts: ["Network Connectivity", "Server Communication", "Internet Basics"]
      })
    });

    this.patterns.push({
      pattern: /TimeoutError|Request timeout/,
      category: 'network',
      createEducationalError: (match, originalError) => ({
        originalError,
        friendlyMessage: "The operation took too long and timed out.",
        explanation: "The server didn't respond quickly enough, so the request was cancelled. This often happens with slow internet connections or busy servers.",
        learningTips: [
          "Timeouts protect your browser from waiting forever",
          "This usually indicates network or server performance issues",
          "Your code is likely correct - it's a timing issue",
          "Some operations naturally take longer (like loading large files)"
        ],
        nextSteps: [
          "Wait a moment and try again",
          "Check if your internet connection is slow",
          "Try the operation at a different time when the server might be less busy",
          "If consistently happening, report to your instructor"
        ],
        relatedConcepts: ["Network Performance", "Timeouts", "Server Response Times"]
      })
    });
  }

  private setupSystemErrorPatterns() {
    this.patterns.push({
      pattern: /ReferenceError.*?(\w+) is not defined/,
      category: 'system',
      createEducationalError: (match, originalError) => ({
        originalError,
        friendlyMessage: `The browser doesn't recognize '${match[1]}'. This might be a JavaScript error in the platform.`,
        explanation: "This is a browser/JavaScript error, not a Python error. It's likely an issue with the Pixel's PyGame Palace platform itself, not your code.",
        learningTips: [
          "JavaScript errors are different from Python errors",
          "These usually indicate platform issues, not problems with your Python code",
          "Your Python learning progress isn't affected by these errors",
          "The platform team works to fix these issues quickly"
        ],
        nextSteps: [
          "Try refreshing the page",
          "Save your work if possible",
          "Report this error to your instructor",
          "Continue with your Python learning - this doesn't affect your code"
        ],
        relatedConcepts: ["Platform Issues", "JavaScript vs Python", "Error Reporting"]
      })
    });

    this.patterns.push({
      pattern: /ChunkLoadError|Loading chunk \d+ failed/,
      category: 'system',
      createEducationalError: (match, originalError) => ({
        originalError,
        friendlyMessage: "There was a problem loading part of the website. Try refreshing the page.",
        explanation: "The browser couldn't load a piece of the Pixel's PyGame Palace platform. This is a technical issue with the website, not your Python code.",
        learningTips: [
          "Chunk load errors are website loading issues",
          "They're not related to your Python programming",
          "These errors don't affect your saved work or progress",
          "Refreshing usually fixes the problem"
        ],
        nextSteps: [
          "Refresh the page (Ctrl+R or Cmd+R)",
          "If that doesn't work, try closing and reopening your browser",
          "Clear your browser cache if the problem persists",
          "Contact support if the issue continues"
        ],
        relatedConcepts: ["Website Loading", "Browser Issues", "Platform Maintenance"]
      })
    });
  }

  transformError(errorMessage: string): EducationalError | null {
    for (const pattern of this.patterns) {
      const match = errorMessage.match(pattern.pattern);
      if (match) {
        const educationalError = pattern.createEducationalError(match, errorMessage);
        logger.user.info('Error transformed to educational format', { 
          category: pattern.category,
          originalError: errorMessage.substring(0, 100)
        });
        return educationalError;
      }
    }

    return null;
  }

  getGenericEducationalError(errorMessage: string): EducationalError {
    return {
      originalError: errorMessage,
      friendlyMessage: "Something unexpected happened, but don't worry - we can figure this out together!",
      explanation: "This error isn't one of the common ones we recognize, but that's okay! Every programmer encounters unfamiliar errors - it's part of learning.",
      learningTips: [
        "Read the error message carefully - it often contains helpful clues",
        "Look for line numbers that point to where the problem occurred",
        "Try to identify which part of your code might be causing the issue",
        "Don't be afraid of errors - they're learning opportunities!"
      ],
      nextSteps: [
        "Read through your recent code changes",
        "Check for typos, missing punctuation, or indentation issues",
        "Try commenting out recent additions to isolate the problem",
        "Ask for help from your instructor or classmates"
      ],
      relatedConcepts: ["Debugging", "Problem Solving", "Error Analysis"]
    };
  }

  // Educational helpers for common Python/Pygame concepts
  getSyntaxHelp(): string[] {
    return [
      "Python uses indentation (spaces) to group code together",
      "After colons (:), the next line should be indented",
      "Parentheses (), brackets [], and quotes must be properly closed",
      "Python is case-sensitive: 'Name' and 'name' are different",
      "Use consistent indentation (4 spaces is recommended)"
    ];
  }

  getPygameHelp(): string[] {
    return [
      "Always call pygame.init() before using pygame features",
      "Create a display with pygame.display.set_mode() before drawing",
      "Use screen.fill() to clear the screen each frame",
      "Call pygame.display.flip() to show your drawings",
      "Handle pygame.QUIT events to close the window properly"
    ];
  }

  getDebuggingTips(): string[] {
    return [
      "Read error messages carefully - they tell you what went wrong",
      "Look at line numbers to find where the error occurred",
      "Use print() statements to check what values your variables contain",
      "Test small parts of your code individually",
      "Comment out code sections to isolate problems",
      "Ask for help when you're stuck - that's how we learn!"
    ];
  }

  // Get contextual help based on the current lesson or activity
  getContextualHelp(context: {
    lessonId?: string;
    projectType?: string;
    codeContent?: string;
  }): string[] {
    const tips: string[] = [];

    if (context.codeContent) {
      if (context.codeContent.includes('pygame')) {
        tips.push(...this.getPygameHelp().slice(0, 3));
      }
      
      if (context.codeContent.includes('if ') || context.codeContent.includes('for ')) {
        tips.push("Remember to indent code inside if statements and loops");
        tips.push("Don't forget the colon (:) at the end of if, for, and while lines");
      }

      if (context.codeContent.includes('def ')) {
        tips.push("Function definitions need a colon (:) and indented code");
        tips.push("Use 'return' to give back a value from your function");
      }
    }

    if (context.lessonId?.includes('basic')) {
      tips.push(...this.getSyntaxHelp().slice(0, 2));
    }

    if (context.projectType === 'game') {
      tips.push(...this.getPygameHelp().slice(0, 2));
    }

    return tips.length > 0 ? tips : this.getDebuggingTips().slice(0, 3);
  }
}

// Create global instance
export const educationalErrorTransformer = new EducationalErrorTransformer();

// Export convenience functions
export const transformError = (errorMessage: string) =>
  educationalErrorTransformer.transformError(errorMessage);

export const getEducationalError = (errorMessage: string) =>
  educationalErrorTransformer.transformError(errorMessage) ||
  educationalErrorTransformer.getGenericEducationalError(errorMessage);

export const getContextualHelp = (context: Parameters<typeof educationalErrorTransformer.getContextualHelp>[0]) =>
  educationalErrorTransformer.getContextualHelp(context);

export const getSyntaxHelp = () => educationalErrorTransformer.getSyntaxHelp();
export const getPygameHelp = () => educationalErrorTransformer.getPygameHelp();
export const getDebuggingTips = () => educationalErrorTransformer.getDebuggingTips();

// Make available globally in development
if (import.meta.env.DEV) {
  (window as any).__educationalErrors = educationalErrorTransformer;
}

export default educationalErrorTransformer;