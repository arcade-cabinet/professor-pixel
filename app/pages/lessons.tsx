// /lessons — overview page that shows all lessons with progress visualization.
//
// P8 of player-experience-pillar.prq.md. The previous behavior had no
// "list of lessons" view — kids navigated by URL or by following the wizard's
// "next lesson" link. That meant a kid who wanted to see "what have I done so
// far?" had no way to find out, and "View Progress" in the PixelMenu pointed
// at lesson-1 with no progress visible.
//
// This page solves both: it shows every lesson, marks completed/in-progress/
// not-started, surfaces a progress percentage, and lets the kid jump to any
// lesson directly.

import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import { useMemo, useState } from 'react';
import { CheckCircle2, Circle, PlayCircle, Trophy, User } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import OfflineBanner from '@/components/ui/offline-banner';
import StorageBlockedNotice from '@/components/ui/storage-blocked-notice';
import { loadLessons, statusFor } from '@lib/lessons';
import { getClientStorage } from '@lib/storage/mode';
import { loadProfile, saveProfile } from '@lib/storage/profile';
import type { Lesson, UserProgress } from '@lib/types/schema';

export default function LessonsIndex() {
  const [profile, setProfile] = useState(() => loadProfile());
  const [nameDraft, setNameDraft] = useState('');

  const {
    data: lessons,
    isLoading: lessonsLoading,
    error: lessonsError,
  } = useQuery<Lesson[]>({
    queryKey: ['lessons'],
    queryFn: () => loadLessons(),
  });

  const {
    data: allProgress,
    error: progressError,
    isLoading: progressLoading,
  } = useQuery<UserProgress[]>({
    queryKey: ['progress'],
    queryFn: async () => {
      const storage = getClientStorage();
      return storage.getUserProgress('anonymous-user');
    },
  });

  // CR review feedback: progress fetch failure no longer throws to the
  // boundary. Without progress data the per-lesson row state is just
  // ungated (everything looks not-yet-started, which is harmless), and
  // a friendly in-page error gives the kid a Refresh + Skip path. The
  // boundary throw was a worse experience — full page crash for a
  // recoverable storage hiccup.

  const progressByLesson = useMemo(() => {
    const m = new Map<string, UserProgress>();
    (allProgress ?? []).forEach((p) => m.set(p.lessonId, p));
    return m;
  }, [allProgress]);

  const overallPct = useMemo(() => {
    if (!lessons || lessons.length === 0) return 0;
    const completedCount = lessons.filter((l) => progressByLesson.get(l.id)?.completed).length;
    return Math.round((completedCount / lessons.length) * 100);
  }, [lessons, progressByLesson]);

  if (lessonsLoading || progressLoading) {
    return (
      <LessonsShell centered>
        <p className="text-gray-700 dark:text-gray-300">Loading lessons…</p>
      </LessonsShell>
    );
  }

  // Distinguish "fetch blew up" (couldn't reach the JSON catalog) from "fetch
  // returned an empty list" (deploy ran but lessons.json is empty). Same
  // gradient + Pixel framing as the rest of the app; two recovery paths so
  // a kid is never stuck staring at a blank screen.
  if (lessonsError || progressError) {
    return (
      <LessonsShell centered data-testid="lessons-error-state">
        <Card className="max-w-md w-full p-8 bg-white/90 dark:bg-gray-800/90 text-center">
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            We couldn&apos;t reach the lesson library
          </p>
          <p className="text-gray-700 dark:text-gray-300 mb-6">
            Check your internet connection and try again — Pixel will be right here.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              onClick={() => window.location.reload()}
              className="bg-gradient-to-r from-purple-500 to-pink-500"
              data-testid="lessons-error-refresh"
            >
              Refresh
            </Button>
            <Link href="/wizard">
              <Button variant="outline" data-testid="lessons-error-skip">
                Skip to the wizard
              </Button>
            </Link>
          </div>
        </Card>
      </LessonsShell>
    );
  }

  if (!lessons || lessons.length === 0) {
    return (
      <LessonsShell centered data-testid="lessons-empty-state">
        <Card className="max-w-md w-full p-8 bg-white/90 dark:bg-gray-800/90 text-center">
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            No lessons available yet
          </p>
          <p className="text-gray-700 dark:text-gray-300 mb-6">
            We&apos;ll add some soon! In the meantime, you can build a game from scratch.
          </p>
          <Link href="/wizard">
            <Button
              className="bg-gradient-to-r from-purple-500 to-pink-500"
              data-testid="lessons-empty-skip"
            >
              Start the wizard
            </Button>
          </Link>
        </Card>
      </LessonsShell>
    );
  }

  return (
    <LessonsShell>
      <main className="mx-auto max-w-4xl">
        <header className="mb-8 text-center">
          <h1 className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-4xl font-bold text-transparent">
            Your Python Lessons
          </h1>
          <p className="mt-2 text-gray-700 dark:text-gray-300">
            Pick where you left off, or start a new lesson!
          </p>
        </header>

        {profile ? (
          <p
            className="mb-4 text-center text-gray-700 dark:text-gray-300"
            data-testid="profile-greeting"
          >
            Hi, <strong>{profile.name}</strong>! Pixel is glad you&apos;re back.
          </p>
        ) : (
          <Card
            className="mb-6 p-6 bg-white dark:bg-gray-800"
            data-testid="profile-name-card"
            aria-label="Set your name"
          >
            <div className="flex items-center gap-3 mb-3">
              <User className="h-6 w-6 text-purple-600" aria-hidden="true" />
              <p className="font-bold text-gray-900 dark:text-gray-100">
                What should Pixel call you?
              </p>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              Pixel will use your name throughout the lessons. (You can skip this — Pixel will just
              say &quot;you.&quot;)
            </p>
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                // saveProfile throws InvalidProfileError on blank/whitespace
                // input. The trim guard above + the disabled submit button
                // make this unreachable through the UI, but if a future
                // refactor breaks the guard we'd rather no-op than crash.
                if (!nameDraft.trim()) return;
                try {
                  const saved = saveProfile(nameDraft);
                  setProfile(saved);
                } catch {
                  // Already filtered above — silent fallthrough.
                }
              }}
            >
              <Input
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                placeholder="Your name"
                aria-label="Your name"
                maxLength={32}
                data-testid="profile-name-input"
              />
              <Button type="submit" data-testid="profile-name-save" disabled={!nameDraft.trim()}>
                Save
              </Button>
            </form>
          </Card>
        )}

        <Card
          className="mb-6 p-6 bg-white dark:bg-gray-800"
          aria-label="Overall lesson progress"
          data-testid="overall-progress-card"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <Trophy className="h-8 w-8 text-yellow-500" aria-hidden="true" />
              <div>
                <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                  Overall progress
                </p>
                <p
                  className="text-sm text-gray-600 dark:text-gray-400"
                  data-testid="overall-progress-text"
                >
                  {overallPct === 100
                    ? 'You finished every lesson!'
                    : `${overallPct}% — keep going!`}
                </p>
              </div>
            </div>
            <span
              className="text-3xl font-bold text-purple-600 dark:text-purple-400"
              aria-hidden="true"
            >
              {overallPct}%
            </span>
          </div>
          <Progress
            value={overallPct}
            aria-valuenow={overallPct}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </Card>

        <ul className="space-y-3" aria-label="Lessons">
          {(lessons ?? []).map((lesson, idx) => {
            const status = statusFor(lesson, progressByLesson.get(lesson.id));
            const Icon =
              status.state === 'completed'
                ? CheckCircle2
                : status.state === 'in-progress'
                  ? PlayCircle
                  : Circle;
            const iconColor =
              status.state === 'completed'
                ? 'text-green-500'
                : status.state === 'in-progress'
                  ? 'text-purple-500'
                  : 'text-gray-300 dark:text-gray-600';
            const stateLabel =
              status.state === 'completed'
                ? 'Completed'
                : status.state === 'in-progress'
                  ? `In progress, ${status.pct}%`
                  : 'Not started';

            return (
              <li key={lesson.id}>
                <Link
                  href={`/lesson/${lesson.id}`}
                  data-testid={`lesson-row-${lesson.id}`}
                  aria-label={`${lesson.title}. ${stateLabel}.`}
                >
                  <Card className="p-4 hover:shadow-md hover:scale-[1.01] transition-all cursor-pointer flex items-center gap-4">
                    <Icon className={`h-8 w-8 flex-shrink-0 ${iconColor}`} aria-hidden="true" />
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-900 dark:text-gray-100 truncate">
                        {idx + 1}. {lesson.title}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                        {stateLabel}
                      </p>
                      {status.state === 'in-progress' && (
                        <Progress value={status.pct} className="mt-2 h-1.5" />
                      )}
                    </div>
                  </Card>
                </Link>
              </li>
            );
          })}
        </ul>
      </main>
    </LessonsShell>
  );
}

// Shared chrome — keeps StorageBlockedNotice + OfflineBanner visible across
// loading / error / empty / success branches so kids on a bad network or in
// a private-mode browser see the cause as soon as a render happens, not only
// when the success path eventually renders. Pulled out per CodeRabbit
// PR-#27 review feedback.
function LessonsShell({
  children,
  centered,
  ...rest
}: {
  children: React.ReactNode;
  centered?: boolean;
} & React.HTMLAttributes<HTMLDivElement>) {
  const layout = centered
    ? 'min-h-screen flex flex-col bg-gradient-to-br from-purple-50 to-pink-50 dark:from-gray-900 dark:to-purple-950 px-4'
    : 'min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 dark:from-gray-900 dark:to-purple-950 px-4 py-8';
  return (
    <div className={layout} {...rest}>
      <StorageBlockedNotice />
      <OfflineBanner className={centered ? '' : '-mx-4 -mt-8 mb-4'} />
      {centered ? (
        <div className="flex-1 flex items-center justify-center">{children}</div>
      ) : (
        children
      )}
    </div>
  );
}
