import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { loadWizardState, saveWizardState } from '@lib/storage/persistence';
import {
  listWizardProjects,
  loadWizardProject,
  deleteWizardProject,
  renameWizardProject,
  cloneWizardProject,
} from '@lib/storage/projects';
import { exportSavedProject, slugify } from '@lib/pygame/runtime/exporter';
import { shouldWarnQuota, markQuotaWarned } from '@lib/storage/quota';
import { subscribeStorageEvents } from '@lib/storage/broadcast';
import { queryClient } from '@lib/net/query-client';
import UniversalWizard from '@/components/wizard/universal';
import { Button } from '@/components/ui/button';
import AudioToggle from '@/components/audio-toggle';
import OfflineBanner from '@/components/ui/offline-banner';
import StorageBlockedNotice from '@/components/ui/storage-blocked-notice';
import { useToast } from '@lib/hooks/use-toast';
import { strings } from '@lib/i18n';

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
  // Inline confirm replaces window.confirm — that blocks the main thread on
  // mobile Safari and is silently suppressed in some embedded contexts. We
  // track which project is awaiting confirmation; clicking Delete on a
  // different row swaps the target. Null = no pending confirmation.
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  // Inline rename: when this matches a project id, that row swaps the
  // name <p> for an <input> + Save / Cancel pair. Null = no row in
  // rename mode. We keep the draft text as a separate slice rather than
  // mutating the project list — react-query owns the canonical list.
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState('');
  // P4.17 — disables the Export button on the row currently mid-export so
  // a kid can't fire two ZIP builds in parallel (the second one would
  // race for the share sheet on iOS). Null = no export in flight.
  const [exportingId, setExportingId] = useState<string | null>(null);
  const { toast } = useToast();

  // P5 — My Games. ListWizardProjects reads from ClientStorage; if the wizard
  // hasn't yet persisted any project (P5.3 work), the list is empty and we
  // render an inviting placeholder rather than nothing.
  const { data: projects } = useQuery({
    queryKey: ['wizard-projects'],
    queryFn: () => listWizardProjects(),
  });

  const deleteProjectMutation = useMutation({
    mutationFn: (id: string) => deleteWizardProject(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wizard-projects'] });
      setConfirmDeleteId(null);
    },
    onError: (err) => {
      console.error('Failed to delete project:', err);
      toast({
        title: strings.home.project.deleteErrorTitle,
        description: strings.home.project.deleteErrorBody,
        variant: 'destructive',
      });
      setConfirmDeleteId(null);
    },
  });

  const renameProjectMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => renameWizardProject(id, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wizard-projects'] });
      setRenameId(null);
      setRenameDraft('');
    },
    onError: (err) => {
      console.error('Failed to rename project:', err);
      toast({
        title: strings.home.project.renameErrorTitle,
        description: strings.home.project.renameErrorBody,
        variant: 'destructive',
      });
    },
  });

  // P4.18 — Remix mutation. After the clone lands, the row list
  // refetches and the new project opens directly in the wizard so the
  // kid can start tweaking immediately. The activeProjectId hand-off
  // mirrors the openProject path so the wizard's first save targets
  // the clone (not the original).
  const remixProjectMutation = useMutation({
    mutationFn: (id: string) => cloneWizardProject(id),
    onSuccess: async (clone) => {
      queryClient.invalidateQueries({ queryKey: ['wizard-projects'] });
      try {
        const snapshot = await loadWizardProject(clone.id);
        if (snapshot) {
          saveWizardState(snapshot.wizardState);
        }
        localStorage.setItem('pp.activeProjectId', clone.id);
      } catch {
        // Quota or privacy mode — kid lands in wizard from a fresh
        // start; not the end of the world.
      }
      toast({
        title: strings.home.project.remixSuccessTitle,
        description: strings.home.project.remixSuccessBody(clone.name),
      });
      setSkipChooser(true);
    },
    onError: (err) => {
      console.error('Failed to remix project:', err);
      toast({
        title: strings.home.project.remixErrorTitle,
        description: strings.home.project.remixErrorBody,
        variant: 'destructive',
      });
    },
  });

  const openProject = async (id: string) => {
    try {
      const snapshot = await loadWizardProject(id);
      if (!snapshot) {
        setLocation('/wizard');
        return;
      }
      // Hydrate the wizard state from the project so the wizard resumes
      // where the kid left off, then route into the wizard. saveWizardState
      // merges, so we explicitly write the snapshot's full state (replacing
      // any prior singleton draft).
      saveWizardState(snapshot.wizardState);
      // Stash the project id under a hand-off key so the wizard can adopt
      // it as savedProjectIdRef on mount — without this, a resumed game
      // whose state already has gameAssembled=true would be saved as a
      // duplicate project (Gemini review feedback).
      try {
        localStorage.setItem('pp.activeProjectId', id);
      } catch {
        // Quota or privacy mode — duplicate-on-resume is the worst case.
      }
      setSkipChooser(true);
    } catch (err) {
      // loadWizardProject reaches into ClientStorage which can throw on
      // some edge browser states. Don't leave the click as an unhandled
      // rejection — toast + fall through to the wizard's normal start.
      console.error('Failed to open saved project:', err);
      toast({
        title: strings.home.project.openErrorTitle,
        description: strings.home.project.openErrorBody,
        variant: 'destructive',
      });
      setLocation('/wizard');
    }
  };

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

    // P4.20 — Warn if the kid is approaching the localStorage cap.
    // Fires at most once per tab session; subsequent visits to /home
    // in the same tab don't re-toast even if usage is still high.
    // Wrapped in a void IIFE so the async work doesn't block the mount.
    void (async () => {
      if (await shouldWarnQuota()) {
        toast({
          title: strings.home.quota.warningTitle,
          description: strings.home.quota.warningBody,
        });
        markQuotaWarned();
      }
    })();
  }, [setLocation, toast]);

  // P4.26 — Cross-tab sync. When another tab saves/deletes/renames a
  // project, invalidate the projects query so the My Games list
  // refreshes here without a manual reload. The subscriber drops the
  // tab's own messages (loop avoidance lives in broadcast.ts).
  useEffect(() => {
    return subscribeStorageEvents((event) => {
      if (event.type === 'projects.changed') {
        queryClient.invalidateQueries({ queryKey: ['wizard-projects'] });
      }
    });
  }, []);

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
      <StorageBlockedNotice />
      <OfflineBanner />
      <div className="absolute right-4 top-4 z-10">
        <AudioToggle />
      </div>
      <main className="mx-auto flex min-h-screen max-w-4xl flex-col items-center justify-center px-4 py-8">
        <header className="mb-12 text-center">
          <h1 className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-5xl font-bold text-transparent">
            {strings.home.title}
          </h1>
          <p className="mt-3 text-lg text-gray-700 dark:text-gray-300">{strings.home.tagline}</p>
        </header>

        {projects && projects.length > 0 && (
          <section
            aria-label={strings.home.sections.mySavedGamesLabel}
            className="mb-12 w-full"
            data-testid="my-games-section"
          >
            <h2 className="mb-4 text-2xl font-bold text-purple-700 dark:text-purple-300">
              {strings.home.sections.myGames}
            </h2>
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
              {projects.map((project) => (
                <li
                  key={project.id}
                  data-testid={`my-game-row-${project.id}`}
                  className="overflow-hidden rounded-xl bg-white shadow-md dark:bg-gray-800"
                >
                  {/* Thumbnail strip — captured from the wizard canvas at
                      save time (P4.9). For older projects without a
                      thumbnail, fall back to a soft purple/pink gradient
                      so the card layout doesn't jump between empty and
                      filled visuals. img is decorative, alt="" so screen
                      readers don't announce it (the project name does
                      that work below). */}
                  <div
                    className="aspect-video w-full bg-gradient-to-br from-purple-200 via-pink-200 to-blue-200 dark:from-purple-800 dark:via-pink-800 dark:to-blue-800"
                    data-testid={`my-game-thumb-${project.id}`}
                  >
                    {project.thumbnailDataUrl ? (
                      <img
                        src={project.thumbnailDataUrl}
                        alt=""
                        className="h-full w-full object-cover"
                        data-testid={`my-game-thumb-img-${project.id}`}
                      />
                    ) : null}
                  </div>
                  <div className="p-4">
                    {renameId === project.id ? (
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          // Mirror the Save button's disabled guard inside
                          // the submit handler — the disabled prop only
                          // gates pointer events, so pressing Enter in the
                          // input would otherwise send empty / unchanged /
                          // mid-flight names through to the mutation,
                          // surfacing a noisy error toast for empty values
                          // and a wasted write for unchanged ones.
                          const trimmed = renameDraft.trim();
                          if (
                            trimmed.length === 0 ||
                            trimmed === project.name ||
                            renameProjectMutation.isPending
                          ) {
                            return;
                          }
                          // Pass `trimmed` rather than `renameDraft`.
                          // renameWizardProject does its own trim, but
                          // threading the trimmed value through keeps
                          // the value sent to storage matched to the
                          // value the guard validated against, so
                          // future changes in trim semantics stay
                          // consistent across both call sites.
                          renameProjectMutation.mutate({
                            id: project.id,
                            name: trimmed,
                          });
                        }}
                        className="flex flex-col gap-2"
                      >
                        <label htmlFor={`my-game-rename-input-${project.id}`} className="sr-only">
                          {strings.home.project.renameInputAriaLabel(project.name)}
                        </label>
                        <input
                          id={`my-game-rename-input-${project.id}`}
                          type="text"
                          value={renameDraft}
                          onChange={(e) => setRenameDraft(e.target.value)}
                          // eslint-disable-next-line jsx-a11y/no-autofocus
                          autoFocus
                          maxLength={64}
                          data-testid={`my-game-rename-input-${project.id}`}
                          className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-400 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
                        />
                        <div className="flex gap-2">
                          <Button
                            type="submit"
                            size="sm"
                            disabled={
                              renameDraft.trim().length === 0 ||
                              renameDraft.trim() === project.name ||
                              renameProjectMutation.isPending
                            }
                            data-testid={`my-game-rename-save-${project.id}`}
                            className="bg-gradient-to-r from-purple-500 to-pink-500"
                          >
                            {strings.home.project.saveRename}
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setRenameId(null);
                              setRenameDraft('');
                            }}
                            data-testid={`my-game-rename-cancel-${project.id}`}
                          >
                            {strings.home.project.cancelRename}
                          </Button>
                        </div>
                      </form>
                    ) : (
                      <p className="font-bold text-gray-900 dark:text-gray-100 truncate">
                        {project.name}
                      </p>
                    )}
                    <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                      {project.createdAt
                        ? new Date(project.createdAt).toLocaleDateString()
                        : strings.home.project.recently}
                    </p>
                    <div className="mt-3 flex gap-2">
                      <Button
                        onClick={() => setLocation(`/play/${project.id}`)}
                        data-testid={`my-game-play-${project.id}`}
                        className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500"
                      >
                        {strings.home.project.play ?? '▶ Play'}
                      </Button>
                      <Button
                        onClick={() => openProject(project.id)}
                        data-testid={`my-game-open-${project.id}`}
                        variant="outline"
                      >
                        {strings.home.project.open}
                      </Button>
                      {renameId !== project.id && (
                        <Button
                          onClick={() => {
                            setRenameId(project.id);
                            setRenameDraft(project.name);
                          }}
                          variant="outline"
                          data-testid={`my-game-rename-${project.id}`}
                          aria-label={strings.home.project.renameAriaLabel(project.name)}
                        >
                          ✏️
                        </Button>
                      )}
                      <Button
                        onClick={async () => {
                          // P4.17 — Build a self-contained ZIP for sharing.
                          // The exportSavedProject helper hydrates assets,
                          // generates the python source, and either fires
                          // navigator.share (mobile) or downloads (desktop).
                          // Errors fall to a toast — never crash the row.
                          setExportingId(project.id);
                          try {
                            const action = await exportSavedProject(project.id);
                            if (action === 'shared') {
                              toast({
                                title: strings.home.project.exportSharedTitle,
                              });
                            } else if (action === 'downloaded') {
                              // Mirror the exporter's slugify so the toast
                              // names the exact file that landed in Downloads.
                              const filename = `${slugify(project.name)}.zip`;
                              toast({
                                title: strings.home.project.exportSuccessTitle,
                                description: strings.home.project.exportSuccessBody(filename),
                              });
                            } else {
                              toast({
                                title: strings.home.project.exportCancelledTitle,
                                description: strings.home.project.exportCancelledBody,
                              });
                            }
                          } catch (err) {
                            console.error('Failed to export project:', err);
                            toast({
                              title: strings.home.project.exportErrorTitle,
                              description: strings.home.project.exportErrorBody,
                              variant: 'destructive',
                            });
                          } finally {
                            setExportingId(null);
                          }
                        }}
                        disabled={exportingId !== null}
                        variant="outline"
                        data-testid={`my-game-export-${project.id}`}
                        aria-label={strings.home.project.exportAriaLabel(project.name)}
                      >
                        {exportingId === project.id ? strings.home.project.exporting : '📦'}
                      </Button>
                      <Button
                        onClick={() => remixProjectMutation.mutate(project.id)}
                        disabled={
                          remixProjectMutation.isPending &&
                          remixProjectMutation.variables === project.id
                        }
                        variant="outline"
                        data-testid={`my-game-remix-${project.id}`}
                        aria-label={strings.home.project.remixAriaLabel(project.name)}
                      >
                        {remixProjectMutation.isPending &&
                        remixProjectMutation.variables === project.id
                          ? strings.home.project.remixing
                          : '🎨'}
                      </Button>
                      <Button
                        onClick={() => setConfirmDeleteId(project.id)}
                        variant="outline"
                        data-testid={`my-game-delete-${project.id}`}
                        aria-label={strings.home.project.deleteAriaLabel(project.name)}
                      >
                        🗑️
                      </Button>
                    </div>
                    {confirmDeleteId === project.id && (
                      <div
                        role="alertdialog"
                        aria-labelledby={`confirm-${project.id}-label`}
                        className="mt-3 rounded-lg border-2 border-red-300 bg-red-50 p-3 text-left dark:border-red-700 dark:bg-red-900/30"
                      >
                        <p
                          id={`confirm-${project.id}-label`}
                          className="text-sm font-bold text-red-800 dark:text-red-200"
                        >
                          {strings.home.project.confirmDelete(project.name)}
                        </p>
                        <div className="mt-2 flex gap-2">
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => deleteProjectMutation.mutate(project.id)}
                            disabled={deleteProjectMutation.isPending}
                            data-testid={`my-game-confirm-delete-${project.id}`}
                          >
                            {deleteProjectMutation.isPending
                              ? strings.home.project.deleting
                              : strings.home.project.delete}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setConfirmDeleteId(null)}
                            data-testid={`my-game-cancel-delete-${project.id}`}
                          >
                            {strings.home.project.keep}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section
          aria-label={strings.home.sections.choosePathLabel}
          className="grid w-full grid-cols-1 gap-6 md:grid-cols-2"
        >
          <button
            type="button"
            onClick={() => choose('wizard')}
            data-testid="landing-choose-wizard"
            aria-label={strings.home.cards.build.ariaLabel}
            className="group rounded-2xl bg-white p-8 text-left shadow-lg transition-all hover:scale-105 hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-purple-300 dark:bg-gray-800"
          >
            <div className="mb-4 text-6xl" aria-hidden="true">
              🎮
            </div>
            <h2 className="mb-2 text-2xl font-bold text-purple-700 dark:text-purple-300">
              {strings.home.cards.build.heading}
            </h2>
            <p className="text-gray-600 dark:text-gray-400">{strings.home.cards.build.body}</p>
            <span className="mt-4 inline-block font-bold text-pink-600 group-hover:underline">
              {strings.home.cards.build.cta}
            </span>
          </button>

          <button
            type="button"
            onClick={() => choose('lessons')}
            data-testid="landing-choose-lessons"
            aria-label={strings.home.cards.lessons.ariaLabel}
            className="group rounded-2xl bg-white p-8 text-left shadow-lg transition-all hover:scale-105 hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-pink-300 dark:bg-gray-800"
          >
            <div className="mb-4 text-6xl" aria-hidden="true">
              📚
            </div>
            <h2 className="mb-2 text-2xl font-bold text-pink-700 dark:text-pink-300">
              {strings.home.cards.lessons.heading}
            </h2>
            <p className="text-gray-600 dark:text-gray-400">{strings.home.cards.lessons.body}</p>
            <span className="mt-4 inline-block font-bold text-purple-600 group-hover:underline">
              {strings.home.cards.lessons.cta}
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
              {strings.home.intro.heading}
            </h3>
            <p className="mt-2 text-gray-700 dark:text-gray-300">
              {strings.home.intro.bodyPrefix}
              <strong>{strings.home.intro.bodyBuildEmphasis}</strong>
              {strings.home.intro.bodyMiddle}
              <strong>{strings.home.intro.bodyLessonEmphasis}</strong>
              {strings.home.intro.bodySuffix}
            </p>
            <button
              type="button"
              onClick={dismissIntro}
              data-testid="landing-intro-dismiss"
              className="mt-4 rounded-lg bg-purple-600 px-4 py-2 font-semibold text-white hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-300"
            >
              {strings.home.intro.dismiss}
            </button>
          </aside>
        )}
      </main>
    </div>
  );
}
