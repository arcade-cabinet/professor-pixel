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
import { loadLessons } from '@lib/lessons';
import { getClientStorage } from '@lib/storage/mode';
import { loadProfile, saveProfile } from '@lib/storage/profile';
import type { Lesson, UserProgress } from '@lib/types/schema';

export interface LessonRowState {
  state: 'completed' | 'in-progress' | 'not-started';
  pct: number; // 0..100 — how far through the lesson's steps
}

export function statusFor(lesson: Lesson, progress: UserProgress | undefined): LessonRowState {
  if (!progress) return { state: 'not-started', pct: 0 };
  if (progress.completed) return { state: 'completed', pct: 100 };
  const total = lesson.content.steps.length;
  const pct = total > 0 ? Math.round((progress.currentStep / total) * 100) : 0;
  return { state: 'in-progress', pct };
}

export default function LessonsIndex() {
  const [profile, setProfile] = useState(() => loadProfile());
  const [nameDraft, setNameDraft] = useState('');

  const { data: lessons, isLoading: lessonsLoading } = useQuery<Lesson[]>({
    queryKey: ['lessons'],
    queryFn: () => loadLessons(),
  });

  const { data: allProgress } = useQuery<UserProgress[]>({
    queryKey: ['progress'],
    queryFn: async () => {
      const storage = getClientStorage();
      return storage.getUserProgress('anonymous-user');
    },
  });

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

  if (lessonsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-pink-50 dark:from-gray-900 dark:to-purple-950">
        <p className="text-gray-700 dark:text-gray-300">Loading lessons…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 dark:from-gray-900 dark:to-purple-950 px-4 py-8">
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
                if (!nameDraft.trim()) return;
                const saved = saveProfile(nameDraft);
                setProfile(saved);
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
    </div>
  );
}
