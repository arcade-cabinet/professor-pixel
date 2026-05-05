/**
 * Pixel's PyGame Palace — user-facing string catalog.
 *
 * Single source of truth for every kid-facing string. Routing copy through
 * this catalog instead of inlining JSX text gives us:
 *   1. A single place to audit reading-level + voice consistency.
 *   2. A pivot point for future localisation (Spanish + Portuguese are the
 *      anticipated next locales given the audience). The current shape is
 *      "one English catalog"; swapping to a `Locale` keyed map is a
 *      mechanical change once a translator is in the loop.
 *   3. Easier review — a copy change is a one-file diff, not a hunt across
 *      pages and components.
 *
 * Convention: keys are domain-grouped objects (chrome, home, wizard, ...).
 * Functions are used when interpolation is needed; otherwise plain strings.
 * Keep the catalog flat-ish (max 2 nesting levels) so it stays greppable.
 *
 * The catalog is currently English-only. To add a locale, replace this file
 * with a `Record<Locale, typeof strings>` and route `useStrings()` through
 * the active locale. Until then, importing `strings` directly from this
 * module is fine — the indirection is the win.
 */

export const strings = {
  /* ─── Page chrome (banners, error boundary, common chrome) ──────────── */
  chrome: {
    offlineBanner: {
      message:
        "You're offline — saved games still work, but new lessons and Pixel updates need a connection.",
    },
    storageBlocked: {
      title: "Pixel can't save your progress here",
      message:
        "Your browser is in private mode or has storage turned off, so games and lessons won't stick around if you refresh. Open a normal browser window to save your work.",
      dismissLabel: 'Dismiss',
    },
    audioToggle: {
      onLabel: 'Mute Pixel',
      offLabel: 'Unmute Pixel',
    },
    errorBoundary: {
      title: 'Hmm, something is blocked',
      body: 'Pixel ran into a problem. Try refreshing the page — if it keeps happening, ask a grown-up for help.',
      refresh: 'Refresh',
    },
  },

  /* ─── Landing page (home.tsx) ───────────────────────────────────────── */
  home: {
    title: "Pixel's PyGame Palace",
    tagline: 'Make your own games with Python — no install needed!',
    sections: {
      myGames: 'My Games',
      choosePathLabel: 'Choose your path',
      mySavedGamesLabel: 'My saved games',
    },
    cards: {
      build: {
        heading: 'Build a game with Pixel',
        body: 'Pixel will guide you step-by-step. Pick a game type, choose your characters and backgrounds, and play your creation!',
        cta: 'Start building →',
        ariaLabel: 'Build a game with Pixel — start the wizard',
      },
      lessons: {
        heading: 'Try a Python lesson',
        body: 'Learn Python one concept at a time — variables, loops, classes. Each lesson is a short, friendly step-by-step.',
        cta: 'Start learning →',
        ariaLabel: 'Try a Python lesson — learn step by step',
      },
    },
    intro: {
      heading: '👋 Welcome!',
      bodyPrefix: 'Not sure where to start? ',
      bodyBuildEmphasis: 'Build a game',
      bodyMiddle: ' if you want to make something fast. ',
      bodyLessonEmphasis: 'Try a lesson',
      bodySuffix: ' if you want to learn Python first. You can always switch between them.',
      dismiss: 'Got it!',
    },
    project: {
      open: 'Open',
      delete: 'Delete',
      keep: 'Keep',
      deleting: 'Deleting...',
      confirmDelete: (name: string) => `Delete "${name}"? This can't be undone.`,
      deleteAriaLabel: (name: string) => `Delete ${name}`,
      recently: 'Recently',
      openErrorTitle: "Couldn't open that game",
      openErrorBody: 'Starting a fresh wizard instead.',
      deleteErrorTitle: "Couldn't delete that game",
      deleteErrorBody: 'Try again in a moment.',
    },
  },

  /* ─── Lessons index (lessons.tsx) ───────────────────────────────────── */
  lessons: {
    loading: 'Loading lessons…',
    pageTitle: 'Your Python Lessons',
    pageSubtitle: 'Pick a lesson and Pixel will help you through every step.',
    progressLabel: (pct: number) => `Overall progress: ${pct}%`,
    overallTitle: 'Your progress so far',
    statusCompleted: 'Completed',
    statusInProgress: 'In progress',
    statusNotStarted: 'Not started',
    namePromptTitle: 'What should Pixel call you?',
    namePromptBody: 'Pixel will use your name to cheer you on through every lesson.',
    namePromptPlaceholder: 'Your first name',
    namePromptSave: 'Save',
    namePromptSaved: 'Got it!',
    error: {
      heading: "We couldn't reach the lesson library",
      body: 'Check your internet connection and try again — Pixel will be right here.',
      refresh: 'Refresh',
      skip: 'Skip to the wizard',
    },
    empty: {
      heading: 'No lessons available yet',
      body: "We'll add some soon! In the meantime, you can build a game from scratch.",
      cta: 'Start the wizard',
    },
  },

  /* ─── Lesson page (lesson.tsx) ──────────────────────────────────────── */
  lesson: {
    loading: 'Loading lesson…',
    notFoundTitle: "We couldn't find that lesson",
    notFoundBody: 'It might have moved. Pick another from the list.',
    backToLessons: '← Back to lessons',
    runCode: 'Run code',
    checkCode: 'Check my code',
    nextStep: 'Next step →',
    prevStep: '← Previous step',
    hint: 'Need a hint?',
    showSolution: 'Show solution',
    completion: {
      heading: 'Excellent Work! 🎉',
      body: (name: string) => `${name}, you finished this lesson.`,
      anonymousBody: 'You finished this lesson!',
      nextLesson: 'Next lesson!',
      nextLessonWithTitle: (title: string) => `Next: ${title} →`,
      home: 'Back home',
      restart: 'Restart this lesson',
      finalHeading: 'You finished them all! 🏆',
      finalBody: 'You worked through every lesson Pixel has. Time to build something of your own.',
      finalCta: 'Build a game',
    },
    runtimeErrorTitle: 'Pixel hit a snag',
    timeoutTitle: 'Your code took too long',
    timeoutBody: 'Pixel stopped it so the page stays responsive. Try a simpler version.',
  },

  /* ─── Profile page (profile.tsx) ────────────────────────────────────── */
  profile: {
    pageTitle: 'What should Pixel call you?',
    nameLabel: 'Your name',
    namePlaceholder: 'Your first name',
    saveButton: 'Save',
    savedToast: 'Saved!',
    sinceLabel: (date: string) => `With Pixel since ${date}`,
    sinceFallback: 'your first day',
    backToHome: '← Back home',
    switchUserHeading: 'Switch user',
    switchUserBody:
      'Starting fresh? Pixel will clear your saved games and progress so a new player can begin.',
    switchUserButton: 'Switch user',
    switchUserConfirm: 'Are you sure? This deletes saved games and lesson progress for this user.',
    switchUserCancel: 'Cancel',
    nameValidation: {
      empty: 'Please enter a name.',
      tooLong: 'That name is too long — try something shorter.',
    },
  },

  /* ─── 404 (not-found.tsx) ───────────────────────────────────────────── */
  notFound: {
    title: 'That page wandered off!',
    body: "Pixel can't find this one — but don't worry, let's get you back to building!",
    pixelAlt: 'Pixel looking confused',
    home: 'Back to Home',
    lessons: 'Go to Lessons',
  },

  /* ─── Pixel menu (pixel/menu.tsx) ──────────────────────────────────── */
  pixelMenu: {
    open: 'Open Pixel menu',
    close: 'Close menu',
    home: 'Home',
    lessons: 'Lessons',
    progress: 'View progress',
    profile: 'Profile',
    help: 'Help',
    about: 'About',
  },

  /* ─── Floating feedback (floating-feedback.tsx) ────────────────────── */
  floatingFeedback: {
    open: 'Need help?',
    close: 'Close help',
    nextHint: 'Next hint',
    showSolution: 'Show solution',
    hideSolution: 'Hide solution',
    noMoreHints: "That's all the hints for this step.",
  },

  /* ─── Wizard (wizard/universal.tsx) ────────────────────────────────── */
  wizard: {
    next: 'Next →',
    back: '← Back',
    skip: 'Skip',
    finish: 'Finish',
    save: 'Save',
    saved: 'Saved',
    saving: 'Saving…',
    saveErrorTitle: "Couldn't save",
    saveErrorBody: 'Pixel will keep trying — your work is still on this page.',
    namePromptTitle: 'Pick a name for your game',
    namePromptPlaceholder: 'My Awesome Game',
    namePromptSave: 'Save and continue',
    backToHome: '← Back home',
    resetTitle: 'Start over?',
    resetBody: 'This clears your wizard progress and starts fresh.',
    resetConfirm: 'Yes, start over',
    resetCancel: 'Keep going',
  },

  /* ─── Help modal (help-modal.tsx — task-015) ───────────────────────── */
  help: {
    title: 'How can Pixel help?',
    close: 'Close',
    questions: {
      save: {
        q: 'How do I save my game?',
        a: 'Your game saves on its own when you finish the wizard. You can find your saved games on the home page.',
      },
      wizard: {
        q: 'What is the wizard?',
        a: 'The wizard is a step-by-step guide. Pixel asks you what kind of game you want to make and helps you build it together.',
      },
      stuck: {
        q: "What if my code doesn't work?",
        a: 'Pixel shows a friendly hint when something goes wrong. You can also press the help bubble to see step hints.',
      },
      offline: {
        q: 'Can I use this offline?',
        a: 'Saved games still work offline. You need internet to load new lessons.',
      },
      audio: {
        q: 'How do I make Pixel quiet?',
        a: 'Tap the speaker icon at the top right of any page. That mutes Pixel and the sound effects.',
      },
      grownup: {
        q: 'How do I get help from a grown-up?',
        a: 'If something keeps going wrong, ask a grown-up to refresh the page or check your internet. They can also email feedback at pixel@example.com.',
      },
    },
  },
} as const;

export type Strings = typeof strings;
