// P7 — kid-facing profile page. Solves the sibling-shared-device case:
// Maya types her name during onboarding; her brother Jake opens the app and
// is greeted as Maya with no obvious way to switch. This page exposes:
//   - the kid's current display name with rename
//   - "Switch user" — a confirm-gated wipe that clears profile + progress
//     so Jake gets the fresh-onboarding experience
//   - a small completed-lessons summary so the kid feels seen
//
// Profile schema is single-user (saveProfile overwrites). That's fine for
// the v1 audience — the explicit reset gives sibling A a clean handoff to
// sibling B. We don't try to multiplex profiles by browser session.

import { useEffect, useMemo, useState } from 'react';
import { Link } from 'wouter';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@lib/hooks/use-toast';
import {
  loadProfile,
  saveProfile,
  clearProfile,
  InvalidProfileError,
  PROFILE_NAME_MAX_LENGTH,
  type PlayerProfile,
} from '@lib/storage/profile';
import { getClientStorage } from '@lib/storage/mode';
import { loadLessons } from '@lib/lessons';
import type { Lesson, UserProgress } from '@lib/types/schema';
import SafeImage from '@/components/ui/safe-image';
import pixelHappy from '@assets/pixel/Pixel_happy_excited_expression_22a41625.png';
import { strings } from '@lib/i18n';

const ONBOARDING_KEY = 'pp.onboardingComplete';

export default function Profile() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [profile, setProfile] = useState<PlayerProfile | null>(() => loadProfile());
  const [nameDraft, setNameDraft] = useState(profile?.name ?? '');
  const [confirmingSwitch, setConfirmingSwitch] = useState(false);
  // P4.32 — pronouns + emoji avatar drafts. Initial values from the
  // existing profile; "" means "not set" (saveProfile clears the field
  // when the trimmed value is empty AND no existing value would be
  // carried over). The "custom" radio is implicit: any value not in
  // PRONOUN_PRESETS is treated as a custom string and rendered in the
  // text input.
  const [pronounsDraft, setPronounsDraft] = useState<string>(profile?.pronouns ?? '');
  const [emojiDraft, setEmojiDraft] = useState<string>(profile?.avatarEmoji ?? '');

  // Keep the form in sync if profile changes (e.g., after a switch-user wipe).
  useEffect(() => {
    setNameDraft(profile?.name ?? '');
    setPronounsDraft(profile?.pronouns ?? '');
    setEmojiDraft(profile?.avatarEmoji ?? '');
  }, [profile]);

  // Pronoun presets — common kid-friendly options plus a "Custom" escape
  // hatch. The catalog references this list via index, but the strings
  // themselves are user-facing labels not localized text (they're the
  // English-language pronouns being chosen). If we ever add Spanish,
  // a different preset list will live alongside.
  const PRONOUN_PRESETS = ['', 'she/her', 'he/him', 'they/them', 'CUSTOM'];
  const isCustomPronouns = pronounsDraft.length > 0 && !PRONOUN_PRESETS.includes(pronounsDraft);
  const pronounsRadioValue =
    pronounsDraft === '' ? '' : isCustomPronouns ? 'CUSTOM' : pronounsDraft;

  // Emoji palette — small, kid-friendly set. A kid wanting something
  // off-list can paste into the system emoji picker via mobile
  // keyboard, but the curated palette is the primary affordance.
  const AVATAR_EMOJI = ['🦊', '🐼', '🐢', '🦄', '🐙', '🦖', '🐝', '🌟', '🚀', '🎮'];

  const handleSaveExpression = () => {
    try {
      const next = saveProfile({
        name: profile?.name ?? nameDraft,
        // null clears, undefined leaves alone, string sets.
        pronouns: pronounsDraft.trim().length === 0 ? null : pronounsDraft.trim(),
        avatarEmoji: emojiDraft.length === 0 ? null : emojiDraft,
      });
      setProfile(next);
      toast({
        title: strings.profile.expressionSection.savedToast,
        description: strings.profile.expressionSection.savedDescription,
      });
    } catch (err) {
      if (err instanceof InvalidProfileError) {
        // Same path as name save — surface the constraint to the kid.
        toast({
          title: strings.profile.nameSection.invalidTitle,
          description: strings.profile.nameSection.invalidDescription,
          variant: 'destructive',
        });
        return;
      }
      throw err;
    }
  };

  const { data: lessons } = useQuery<Lesson[]>({
    queryKey: ['lessons'],
    queryFn: () => loadLessons(),
  });

  const { data: progress } = useQuery<UserProgress[]>({
    queryKey: ['progress'],
    queryFn: async () => getClientStorage().getUserProgress('anonymous-user'),
  });

  const completedTitles = useMemo(() => {
    if (!lessons || !progress) return [];
    const completedIds = new Set(progress.filter((p) => p.completed).map((p) => p.lessonId));
    return lessons.filter((l) => completedIds.has(l.id)).map((l) => l.title);
  }, [lessons, progress]);

  const handleRename = () => {
    try {
      const next = saveProfile(nameDraft);
      setProfile(next);
      toast({
        title: strings.profile.nameSection.savedToast,
        description: strings.profile.nameSection.savedDescription(next.name),
      });
    } catch (err) {
      if (err instanceof InvalidProfileError) {
        // Two distinct destructive toasts — empty input vs too-long
        // input — so the kid sees what specifically went wrong instead
        // of one generic "Pick a name first" message that doesn't
        // explain a 50-character paste being rejected.
        const trimmedLength = nameDraft.trim().length;
        if (trimmedLength === 0) {
          toast({
            title: strings.profile.nameSection.invalidTitle,
            description: strings.profile.nameSection.invalidDescription,
            variant: 'destructive',
          });
        } else {
          toast({
            title: strings.profile.nameSection.tooLongTitle,
            description: strings.profile.nameSection.tooLongDescription(PROFILE_NAME_MAX_LENGTH),
            variant: 'destructive',
          });
        }
        return;
      }
      throw err;
    }
  };

  // Switch-user is destructive: it wipes the profile, the onboarding flag,
  // and ALL lesson progress for the anonymous user. Wizard projects in
  // ClientStorage are NOT touched — the My Games list is intentionally
  // shared on a household device. (A kid with their own device should
  // bookmark their own profile URL.) Confirmed via a two-step button.
  //
  // Order of operations matters: the storage wipe is awaited FIRST so a
  // failure leaves both profile and progress intact (CR feedback).
  // Previously clearProfile() ran before the storage call, so a thrown
  // clearUserProgress would leave the kid in a half-applied state with
  // their name gone but the previous user's lesson progress still active.
  const handleSwitchUser = async () => {
    try {
      await getClientStorage().clearUserProgress('anonymous-user');
    } catch (err) {
      console.error('Failed to clear lesson progress:', err);
      toast({
        title: strings.profile.switchUser.errorTitle,
        description: strings.profile.switchUser.errorBody,
        variant: 'destructive',
      });
      return;
    }
    clearProfile();
    try {
      localStorage.removeItem(ONBOARDING_KEY);
    } catch {
      // ignore — onboarding flag is a hint, not load-bearing
    }
    // Stale progress in the React Query cache would otherwise show the
    // outgoing kid's completed lessons until the cache turned over. Force
    // a refetch so the lessons-finished list re-renders empty immediately.
    queryClient.invalidateQueries({ queryKey: ['progress'] });
    setProfile(null);
    setConfirmingSwitch(false);
    toast({
      title: strings.profile.switchUser.successTitle,
      description: strings.profile.switchUser.successBody,
    });
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-purple-50 to-pink-50 dark:from-gray-900 dark:to-purple-950 px-4 py-8">
      <div className="mx-auto max-w-2xl space-y-6">
        <header className="text-center">
          <SafeImage
            src={pixelHappy}
            alt={strings.profile.pixelAlt}
            fallbackEmoji="👋"
            className="mx-auto h-24 w-24"
            data-testid="profile-pixel-image"
          />
          <h1 className="mt-2 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-3xl font-bold text-transparent">
            {strings.profile.pageTitle}
          </h1>
        </header>

        <Card className="p-6 bg-white/90 dark:bg-gray-800/90">
          <h2 className="mb-3 text-xl font-bold text-gray-900 dark:text-gray-100">
            {strings.profile.nameSection.heading}
          </h2>
          <p className="mb-3 text-sm text-gray-700 dark:text-gray-300">
            {strings.profile.nameSection.body}
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Input
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              maxLength={PROFILE_NAME_MAX_LENGTH}
              aria-label={strings.profile.nameSection.ariaLabel}
              data-testid="profile-name-input"
              placeholder={strings.profile.nameSection.placeholder}
              className="flex-1"
            />
            <Button
              onClick={handleRename}
              disabled={nameDraft.trim().length === 0 || nameDraft.trim() === profile?.name}
              data-testid="profile-save-name"
              className="bg-gradient-to-r from-purple-500 to-pink-500"
            >
              {strings.profile.nameSection.save}
            </Button>
          </div>
          {profile && (
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              {strings.profile.nameSection.since(
                profile.name,
                profile.createdAt
                  ? new Date(profile.createdAt).toLocaleDateString()
                  : strings.profile.nameSection.sinceFallbackDate
              )}
            </p>
          )}
        </Card>

        {/* P4.32 — optional pronouns + emoji avatar */}
        <Card className="p-6 bg-white/90 dark:bg-gray-800/90">
          <h2 className="mb-3 text-xl font-bold text-gray-900 dark:text-gray-100">
            {strings.profile.expressionSection.heading}
          </h2>
          <p className="mb-4 text-sm text-gray-700 dark:text-gray-300">
            {strings.profile.expressionSection.body}
          </p>

          <fieldset className="mb-4">
            <legend className="mb-2 text-sm font-semibold text-gray-800 dark:text-gray-200">
              {strings.profile.expressionSection.pronounsLabel}
            </legend>
            <div className="flex flex-wrap gap-3">
              {PRONOUN_PRESETS.map((preset) => {
                const label =
                  preset === ''
                    ? strings.profile.expressionSection.pronounsNone
                    : preset === 'CUSTOM'
                      ? strings.profile.expressionSection.pronounsCustom
                      : preset;
                const checked = pronounsRadioValue === preset;
                return (
                  <label
                    key={preset || 'none'}
                    className={`cursor-pointer rounded-md border px-3 py-1 text-sm focus-within:ring-2 focus-within:ring-purple-400 focus-within:ring-offset-1 ${
                      checked
                        ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/30'
                        : 'border-gray-300 dark:border-gray-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="pronouns"
                      value={preset}
                      checked={checked}
                      onChange={() => {
                        if (preset === 'CUSTOM') {
                          // Keep any existing custom string; if switching from
                          // a preset, start blank so the input has focus to fill.
                          if (!isCustomPronouns) setPronounsDraft('');
                        } else {
                          setPronounsDraft(preset);
                        }
                      }}
                      className="sr-only"
                      data-testid={`pronouns-radio-${preset || 'none'}`}
                    />
                    {label}
                  </label>
                );
              })}
            </div>
            {pronounsRadioValue === 'CUSTOM' && (
              <Input
                value={pronounsDraft}
                onChange={(e) => setPronounsDraft(e.target.value)}
                placeholder={strings.profile.expressionSection.pronounsCustomPlaceholder}
                aria-label={strings.profile.expressionSection.pronounsCustomAriaLabel}
                data-testid="pronouns-custom-input"
                className="mt-2"
                maxLength={32}
              />
            )}
          </fieldset>

          <fieldset className="mb-4">
            <legend className="mb-2 text-sm font-semibold text-gray-800 dark:text-gray-200">
              {strings.profile.expressionSection.avatarLabel}
            </legend>
            <div className="flex flex-wrap gap-2">
              {AVATAR_EMOJI.map((emoji) => {
                const selected = emojiDraft === emoji;
                return (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => setEmojiDraft(selected ? '' : emoji)}
                    aria-label={strings.profile.expressionSection.avatarAriaLabel(emoji)}
                    aria-pressed={selected}
                    data-testid={`avatar-emoji-${emoji}`}
                    className={`flex h-10 w-10 items-center justify-center rounded-md border text-2xl transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 focus-visible:ring-offset-1 ${
                      selected
                        ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/30'
                        : 'border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}
                  >
                    {emoji}
                  </button>
                );
              })}
              {emojiDraft && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setEmojiDraft('')}
                  data-testid="avatar-clear"
                >
                  {strings.profile.expressionSection.avatarClear}
                </Button>
              )}
            </div>
          </fieldset>

          <Button
            onClick={handleSaveExpression}
            data-testid="profile-save-expression"
            className="bg-gradient-to-r from-purple-500 to-pink-500"
            disabled={
              pronounsDraft === (profile?.pronouns ?? '') &&
              emojiDraft === (profile?.avatarEmoji ?? '')
            }
          >
            {strings.profile.expressionSection.saveButton}
          </Button>
        </Card>

        <Card className="p-6 bg-white/90 dark:bg-gray-800/90">
          <h2 className="mb-3 text-xl font-bold text-gray-900 dark:text-gray-100">
            {strings.profile.completedSection.heading}
          </h2>
          {completedTitles.length === 0 ? (
            <p className="text-sm text-gray-700 dark:text-gray-300">
              {strings.profile.completedSection.empty.prefix}
              <Link href="/lessons" className="text-purple-700 underline dark:text-purple-300">
                {strings.profile.completedSection.empty.link}
              </Link>
              {strings.profile.completedSection.empty.suffix}
            </p>
          ) : (
            <ul className="list-inside list-disc space-y-1 text-sm text-gray-800 dark:text-gray-200">
              {completedTitles.map((title) => (
                <li key={title} data-testid={`profile-completed-${title}`}>
                  {title}
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="border-2 border-amber-300 bg-amber-50 p-6 dark:border-amber-700 dark:bg-amber-900/30">
          <h2 className="mb-2 text-lg font-bold text-amber-900 dark:text-amber-100">
            {strings.profile.switchUser.heading}
          </h2>
          <p className="mb-3 text-sm text-amber-800 dark:text-amber-200">
            {strings.profile.switchUser.bodyPrefix}
            <strong>{strings.profile.switchUser.bodyEmphasis}</strong>
            {strings.profile.switchUser.bodySuffix}
          </p>
          {!confirmingSwitch ? (
            <Button
              variant="outline"
              onClick={() => setConfirmingSwitch(true)}
              data-testid="profile-switch-user"
            >
              {strings.profile.switchUser.button}
            </Button>
          ) : (
            <div
              role="alertdialog"
              aria-labelledby="switch-confirm-label"
              className="rounded-lg border-2 border-red-300 bg-red-50 p-3 dark:border-red-700 dark:bg-red-900/30"
            >
              <p
                id="switch-confirm-label"
                className="text-sm font-bold text-red-800 dark:text-red-200"
              >
                {strings.profile.switchUser.confirmTitle}
              </p>
              <div className="mt-2 flex gap-2">
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={handleSwitchUser}
                  data-testid="profile-switch-confirm"
                >
                  {strings.profile.switchUser.confirmYes}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setConfirmingSwitch(false)}
                  data-testid="profile-switch-cancel"
                >
                  {strings.profile.switchUser.confirmNo}
                </Button>
              </div>
            </div>
          )}
        </Card>

        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          {/* Use Button asChild + Link as the rendered element so the DOM
              has a single interactive node per CTA — wouter Link wrapping
              a real button produces nested interactives, which trip
              keyboard + screen-reader heuristics. */}
          <Button asChild variant="outline" data-testid="profile-back-home">
            <Link href="/">{strings.profile.nav.home}</Link>
          </Button>
          <Button asChild variant="outline" data-testid="profile-go-lessons">
            <Link href="/lessons">{strings.profile.nav.lessons}</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
