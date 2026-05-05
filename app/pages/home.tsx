import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { loadWizardState } from '@lib/storage/persistence';
import UniversalWizard from '@/components/wizard/universal';

const INTRO_SEEN_KEY = 'pp.hasSeenIntro';
const LANDING_PATH_KEY = 'pp.lastLandingPath';

type LandingPath = 'wizard' | 'lessons';

function readLastLandingPath(): LandingPath | null {
  try {
    const stored = localStorage.getItem(LANDING_PATH_KEY);
    return stored === 'wizard' || stored === 'lessons' ? stored : null;
  } catch {
    return null;
  }
}

function writeLastLandingPath(path: LandingPath): void {
  try {
    localStorage.setItem(LANDING_PATH_KEY, path);
  } catch {
    // QuotaExceededError or similar — fail silently; chooser still works.
  }
}

function readHasSeenIntro(): boolean {
  try {
    return localStorage.getItem(INTRO_SEEN_KEY) === '1';
  } catch {
    return false;
  }
}

function writeHasSeenIntro(): void {
  try {
    localStorage.setItem(INTRO_SEEN_KEY, '1');
  } catch {
    // ignore
  }
}

/**
 * Home — the landing chooser.
 *
 * Returning users (anyone with prior wizard or lesson state) skip the chooser
 * and go straight back into their last path. New users see two clear CTAs.
 *
 * P2.1 + P2.3 from the player-experience pillar PRQ.
 */
export default function Home() {
  const [, setLocation] = useLocation();
  const [showIntroCard, setShowIntroCard] = useState(false);
  const [skipChooser, setSkipChooser] = useState(false);

  useEffect(() => {
    // Returning user — route them back to whatever surface they were using.
    // The lastPath check has to come BEFORE the persisted-wizard branch:
    // a kid can have persisted wizard state AND have chosen Lessons last;
    // we want to honor the explicit Lessons choice over the implicit
    // "you have a wizard in flight" assumption.
    const persisted = loadWizardState();
    const lastPath = readLastLandingPath();
    if (lastPath === 'lessons') {
      setLocation('/lessons');
      return;
    }
    if (persisted || lastPath === 'wizard') {
      setSkipChooser(true);
      return;
    }
    // First-visit micro-tutorial card
    if (!readHasSeenIntro()) {
      setShowIntroCard(true);
    }
  }, [setLocation]);

  const dismissIntro = () => {
    writeHasSeenIntro();
    setShowIntroCard(false);
  };

  const choose = (path: LandingPath) => {
    writeLastLandingPath(path);
    if (path === 'wizard') {
      setSkipChooser(true);
    } else {
      setLocation('/lessons');
    }
  };

  if (skipChooser) {
    return <UniversalWizard />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 dark:from-gray-900 dark:to-purple-950">
      <main className="mx-auto flex min-h-screen max-w-4xl flex-col items-center justify-center px-4 py-8">
        <header className="mb-12 text-center">
          <h1 className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-5xl font-bold text-transparent">
            Pixel's PyGame Palace
          </h1>
          <p className="mt-3 text-lg text-gray-700 dark:text-gray-300">
            Make your own games with Python — no install needed!
          </p>
        </header>

        <section
          aria-label="Choose your path"
          className="grid w-full grid-cols-1 gap-6 md:grid-cols-2"
        >
          <button
            type="button"
            onClick={() => choose('wizard')}
            data-testid="landing-choose-wizard"
            aria-label="Build a game with Pixel — start the wizard"
            className="group rounded-2xl bg-white p-8 text-left shadow-lg transition-all hover:scale-105 hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-purple-300 dark:bg-gray-800"
          >
            <div className="mb-4 text-6xl" aria-hidden="true">
              🎮
            </div>
            <h2 className="mb-2 text-2xl font-bold text-purple-700 dark:text-purple-300">
              Build a game with Pixel
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Pixel will guide you step-by-step. Pick a game type, choose your characters and
              backgrounds, and play your creation!
            </p>
            <span className="mt-4 inline-block font-bold text-pink-600 group-hover:underline">
              Start building →
            </span>
          </button>

          <button
            type="button"
            onClick={() => choose('lessons')}
            data-testid="landing-choose-lessons"
            aria-label="Try a Python lesson — learn step by step"
            className="group rounded-2xl bg-white p-8 text-left shadow-lg transition-all hover:scale-105 hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-pink-300 dark:bg-gray-800"
          >
            <div className="mb-4 text-6xl" aria-hidden="true">
              📚
            </div>
            <h2 className="mb-2 text-2xl font-bold text-pink-700 dark:text-pink-300">
              Try a Python lesson
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Learn Python one concept at a time — variables, loops, classes. Each lesson is a
              short, friendly step-by-step.
            </p>
            <span className="mt-4 inline-block font-bold text-purple-600 group-hover:underline">
              Start learning →
            </span>
          </button>
        </section>

        {showIntroCard && (
          <aside
            role="dialog"
            aria-labelledby="intro-card-title"
            data-testid="landing-intro-card"
            className="mt-12 max-w-2xl rounded-xl border-2 border-purple-300 bg-purple-50 p-6 dark:border-purple-700 dark:bg-purple-900/30"
          >
            <h3
              id="intro-card-title"
              className="text-lg font-bold text-purple-800 dark:text-purple-200"
            >
              👋 Welcome!
            </h3>
            <p className="mt-2 text-gray-700 dark:text-gray-300">
              Not sure where to start? <strong>Build a game</strong> if you want to make something
              fast. <strong>Try a lesson</strong> if you want to learn Python first. You can always
              switch between them.
            </p>
            <button
              type="button"
              onClick={dismissIntro}
              data-testid="landing-intro-dismiss"
              className="mt-4 rounded-lg bg-purple-600 px-4 py-2 font-semibold text-white hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-300"
            >
              Got it!
            </button>
          </aside>
        )}
      </main>
    </div>
  );
}
