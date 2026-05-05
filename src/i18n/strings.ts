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
    // P4.20 — surfaced from the /home mount when localStorage usage
    // crosses the warning threshold.
    quota: {
      warningTitle: 'Storage is getting full',
      warningBody:
        "There's not much room left for new games. Try deleting one you don't play anymore.",
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
      rename: 'Rename',
      renameAriaLabel: (name: string) => `Rename ${name}`,
      renameInputAriaLabel: (name: string) => `New name for ${name}`,
      saveRename: 'Save',
      cancelRename: 'Cancel',
      renameErrorTitle: "Couldn't rename that game",
      renameErrorBody: 'Try a different name and save again.',
      // P4.18 — Remix (clone) a project so a kid can spin off variants
      // without losing the original. Suffix is "{name} — Remix N".
      remix: 'Remix',
      remixing: 'Remixing…',
      remixAriaLabel: (name: string) => `Remix ${name}`,
      remixSuccessTitle: 'Remix created!',
      remixSuccessBody: (name: string) => `Opening "${name}" in the wizard.`,
      remixErrorTitle: "Couldn't remix that game",
      remixErrorBody: 'Try again in a moment.',
      // P4.17 — Export-as-ZIP affordance on each project row.
      exportLabel: 'Export',
      exporting: 'Exporting…',
      exportAriaLabel: (name: string) => `Export ${name} as a zip file`,
      exportSuccessTitle: 'Game exported!',
      exportSuccessBody: (filename: string) => `Saved as ${filename}.`,
      exportSharedTitle: 'Game shared!',
      exportCancelledTitle: 'Export cancelled',
      exportCancelledBody: 'No file was saved.',
      exportErrorTitle: "Couldn't export that game",
      exportErrorBody: 'Try opening it first, then exporting from the wizard.',
    },
  },

  /* ─── Lessons index (lessons.tsx) ───────────────────────────────────── */
  lessons: {
    loading: 'Loading lessons…',
    pageTitle: 'Your Python Lessons',
    pageSubtitle: 'Pick where you left off, or start a new lesson!',
    listLabel: 'Lessons',
    greeting: {
      welcomeBack: (name: string) => `Hi, ${name}! Pixel is glad you're back.`,
    },
    nameCard: {
      sectionLabel: 'Set your name',
      title: 'What should Pixel call you?',
      body: 'Pixel will use your name throughout the lessons. (You can skip this — Pixel will just say "you.")',
      placeholder: 'Your name',
      ariaLabel: 'Your name',
      save: 'Save',
    },
    overall: {
      sectionLabel: 'Overall lesson progress',
      heading: 'Overall progress',
      finished: 'You finished every lesson!',
      keepGoing: (pct: number) => `${pct}% — keep going!`,
    },
    status: {
      completed: 'Completed',
      inProgress: (pct: number) => `In progress, ${pct}%`,
      notStarted: 'Not started',
    },
    rowAriaLabel: (title: string, state: string) => `${title}. ${state}.`,
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
    pixelAlt: {
      thinking: 'Pixel thinking',
      concerned: 'Pixel concerned',
      confused: 'Pixel confused',
      celebrating: 'Pixel celebrating',
      avatar: 'Pixel',
    },
    loading: {
      pyodide: 'Setting up Python for you...',
      lesson: 'Loading your lesson...',
    },
    error: {
      pythonHeading: "Python didn't load",
      lessonsHeading: 'Lessons failed to load',
      tryAgain: 'Try again',
    },
    notFound: {
      message: 'Lesson not found',
      backToLessons: 'Back to Lessons',
    },
    pixelDialogues: {
      stepStart: [
        "Alright! Let's dive into {title}! 🌟",
        'This is going to be fun - {title} time! 🎉',
        "Ready for {title}? I'm excited to show you! ✨",
        "Here we go with {title}! You've got this! 💪",
      ],
      stepComplete: [
        'Amazing work! You nailed it! 🎉',
        "That's exactly right! You're a natural! 🌟",
        'Perfect! I knew you could do it! 💫',
        "Brilliant! You're really getting the hang of this! 🚀",
      ],
      stepError: [
        "Oops! No worries, let's fix this together! 💙",
        "That's not quite right, but you're super close! 🔍",
        "Let me help you debug this - we'll solve it! 🛠️",
        'Almost there! Just a small tweak needed! ✨',
      ],
      hint: [
        "Need a hint? Here's a tip: ",
        'Let me help! Try this: ',
        "Here's a friendly nudge: ",
        'Stuck? No problem! Consider this: ',
      ],
      lessonComplete: [
        "🎊 WOOHOO! You completed the lesson! You're amazing!",
        "🏆 Lesson complete! You're officially awesome at this!",
        "🌟 Fantastic job! You've mastered another skill!",
        '🚀 Mission accomplished! Ready for your next adventure?',
      ],
    },
    inline: {
      addCodeFirst: "Let's add some code first! You can do it! 💪",
      codeError: "Your code has an error. Let's fix it together!",
      almostThere: "Not quite right yet, but you're close! Check the feedback below!",
      ranSuccess: 'Great job running your code! Keep going! 🌟',
      runtimeFallback: 'An error occurred',
    },
    guidance: {
      stepHeading: (n: number, title: string) => `Step ${n}: ${title}`,
      progress: (pct: number) => `Progress: ${pct}%`,
      needHint: 'Need a Hint?',
      whatToDo: 'What to do:',
      runCode: 'Run Code',
      checkSolution: 'Check Solution',
      placeholderOutput: 'Run your code to see output here!',
      errorOutputHeading: 'Error Output',
      outputHeading: 'Output',
      previous: 'Previous',
      next: 'Next',
      completeLesson: 'Complete Lesson',
    },
    completion: {
      heading: 'Lesson Complete! 🎉',
      continueNext: 'Continue to Next Lesson',
      buildGame: "I'm Ready to Build a Game!",
      viewAll: 'View All Lessons',
      // P4.14 — when a kid finishes the LAST lesson, the modal pivots
      // from "next lesson" to a celebration. The wizard becomes the
      // primary CTA (build a game with what you learned!); the lesson
      // index demotes to a secondary outline button.
      finishedAllHeading: 'You finished them all! 🏆',
      finishedAllBody: "You've cleared every lesson. Now build something amazing.",
    },
  },

  /* ─── Profile page (profile.tsx) ────────────────────────────────────── */
  profile: {
    pixelAlt: 'Pixel waving',
    pageTitle: 'Your Profile',
    nameSection: {
      heading: 'Your name',
      body: 'Pixel uses this to say hi. You can change it anytime.',
      placeholder: 'Type your name',
      ariaLabel: 'Your name',
      save: 'Save name',
      savedToast: 'Saved!',
      savedDescription: (name: string) => `Pixel will call you ${name}.`,
      invalidTitle: 'Pick a name first',
      invalidDescription: 'Pixel needs at least one letter.',
      // P4.19 — separate message when the kid pastes an oversized name.
      tooLongTitle: 'That name is a bit long',
      tooLongDescription: (max: number) =>
        `Pixel can only fit ${max} letters on the cabinet. Try a shorter one!`,
      since: (name: string, date: string) => `Hi ${name}! You started on ${date}.`,
      sinceFallbackDate: 'your first day',
    },
    // P4.32 — optional self-expression. Pronouns + emoji avatar are
    // strictly opt-in; defaults are "no choice" / no avatar emoji.
    expressionSection: {
      heading: 'Make it yours',
      body: 'Optional — pick how Pixel should refer to you and an emoji that feels like you.',
      pronounsLabel: 'Pronouns',
      pronounsAriaLabel: 'Pick your pronouns',
      pronounsNone: 'Not specified',
      pronounsCustom: 'Custom',
      pronounsCustomPlaceholder: 'Type your own',
      pronounsCustomAriaLabel: 'Custom pronouns',
      avatarLabel: 'Avatar emoji',
      avatarAriaLabel: (emoji: string) => `Pick ${emoji} as your avatar emoji`,
      avatarClear: 'Clear emoji',
      saveButton: 'Save',
      savedToast: 'Looking good!',
      savedDescription: 'Your profile is updated.',
    },
    completedSection: {
      heading: "Lessons you've finished",
      empty: {
        prefix: 'No lessons finished yet — head to the ',
        link: 'lessons page',
        suffix: ' to start one!',
      },
    },
    switchUser: {
      heading: 'Sharing this device?',
      bodyPrefix: 'Click ',
      bodyEmphasis: 'Switch user',
      bodySuffix:
        ' to clear the name and lesson progress so someone else can start fresh. Saved games stay so siblings can show each other what they made.',
      button: 'Switch user',
      confirmTitle: 'Clear name + lesson progress for this device?',
      confirmYes: 'Yes, switch user',
      confirmNo: 'Keep my stuff',
      errorTitle: "Couldn't switch users",
      errorBody: 'Try again — your stuff is still safe.',
      successTitle: 'All set!',
      successBody: 'Tell Pixel your name on the next screen.',
    },
    nav: {
      home: 'Back to Home',
      lessons: 'Go to Lessons',
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
    pixelAlt: 'Pixel',
    title: "Pixel's Command Center",
    welcome: 'Welcome back!',
    prompt: 'What would you like to do?',
    tabs: {
      actions: 'Quick Actions',
      history: 'Session History',
    },
    actions: {
      changeGame: 'Change Game',
      switchLesson: 'Switch Lesson',
      exportGame: 'Export Game',
      viewProgress: 'View Progress',
      voiceOn: 'Voice On',
      voiceOff: 'Voice Off',
      voiceTurnOn: 'Turn voice on',
      voiceTurnOff: 'Turn voice off',
      returnCurrent: 'Return to Current',
    },
    history: {
      empty: 'No actions yet this session',
      emptyHint: 'Start creating to see your history!',
      minutesAgo: (n: number) => `${n}m ago`,
      hoursAgo: (n: number) => `${n}h ago`,
      daysAgo: (n: number) => `${n}d ago`,
    },
    mockHistory: {
      gameCreatedTitle: 'Created RPG Adventure',
      gameCreatedDescription: 'Started building a fantasy RPG game',
      lessonCompletedTitle: 'Completed Python Basics',
      lessonCompletedDescription: 'Learned variables and functions',
      assetSelectedTitle: 'Selected Character Sprites',
      assetSelectedDescription: 'Added knight and wizard sprites',
    },
    swipeHint: 'Swipe down or tap outside to close',
  },

  /* ─── Floating feedback (floating-feedback.tsx) ────────────────────── */
  floatingFeedback: {
    headingComplete: 'Excellent Work! 🎉',
    headingGuidance: 'Step Guidance',
    stepCompleted: 'Step Completed!',
    encouragementLast:
      "Amazing job! You've mastered all the concepts in this lesson. Ready to complete it?",
    encouragementNext: "Great progress! You're ready to tackle the next challenge.",
    nextStep: 'Next Step',
    completeLesson: 'Complete Lesson',
    showSolution: 'Show Solution',
    hideSolution: 'Hide Solution',
    copySolution: 'Copy Solution',
    copied: 'Copied!',
    applyToEditor: 'Apply to Editor',
    copySuccessTitle: 'Solution copied!',
    copySuccessDescription: 'The solution has been copied to your clipboard.',
    copyErrorTitle: 'Failed to copy',
    copyErrorDescription: 'Please try selecting and copying the text manually.',
    applyTitle: 'Solution applied!',
    applyDescription: 'The solution has been added to the code editor.',
    dismissAriaLabel: 'Dismiss hint panel',
  },

  /* ─── Icon-only button labels (a11y, P4.24) ─────────────────────────── */
  iconButtons: {
    closePixelMenu: 'Close menu',
    closeAssetBrowser: 'Close asset browser',
    runnerEnterFullscreen: 'Enter fullscreen',
    runnerExitFullscreen: 'Exit fullscreen',
    runnerClose: 'Close runner',
  },

  /* ─── Live preview overlays (P4.28) ─────────────────────────────────── */
  livePreview: {
    pauseHeading: 'Game paused',
    // Reworded after task-028 review: "Tap Resume" misleads on tablets
    // when the Resume button is scrolled below the canvas. Lean on the
    // keyboard hint plus a generic "Resume button below" pointer.
    pauseHint: 'Press P or tap the Resume button below to keep playing',
    // P4.31 — "Expected output" / Alternative badge tooltip.
    alternativeBadge: 'Expected output',
    alternativeTooltip:
      'This is what your game should look like — compare it to your version on the left.',
    compareButtonTooltip: 'Show your game and the expected output side by side',
  },

  /* ─── Wizard (wizard/universal.tsx) ────────────────────────────────── */
  wizard: {
    defaultGameName: 'My Game',
    defaultExportTitle: 'My Pygame Game',
    minimizeMessages: {
      youGotThis: "You've got this! I'm here if you need me!",
      haveFun: 'Have fun creating! Click me if you need help!',
      lessonComplete: "Great job! I'll watch from here while you practice!",
    },
    play: {
      ariaLabel: 'Play your game',
      cta: '▶ Play your game!',
    },
    save: {
      toastTitle: 'Saved!',
      toastDescription: 'Your game is in My Games.',
    },
    export: {
      successTitle: 'Game exported!',
      successDescription: (filename: string) => `Saved as ${filename}.`,
      errorTitle: "Couldn't export your game",
      errorDescription: 'Something went wrong saving the ZIP — try again in a moment.',
    },
    reset: {
      progressConfirm:
        'Are you sure you want to reset your progress? This will clear all saved wizard data.',
      allDataConfirm:
        'Are you sure you want to clear ALL data including preferences? This action cannot be undone.',
    },
    back: {
      label: 'Back',
      ariaLabel: 'Go back to the previous step',
    },
    nameDialog: {
      title: 'Name Your Game',
      description: 'Give your game a unique name that captures its essence!',
      placeholder: 'Enter your game name...',
      submit: 'Create Game',
    },
  },

  /* ─── Code editor (code-editor.tsx) ────────────────────────────────── */
  codeEditor: {
    resetConfirm: {
      title: 'Reset your code?',
      body: "This puts the starter code back. Anything you've written in this step will be erased.",
      cancel: 'Keep my code',
      confirm: 'Reset',
    },
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
        a: 'If something keeps going wrong, ask a grown-up to refresh the page or check your internet connection together.',
      },
    },
  },
} as const;

export type Strings = typeof strings;
