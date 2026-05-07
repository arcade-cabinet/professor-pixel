import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  dialogFlows,
  pixelPersonality,
  processDialogStep,
  createMessage,
  getDialogFlow,
  getPixelResponse,
  skillLevelResponses,
  PixelMood,
  getPixelMood,
} from '@lib/wizard/dialog';
import type { UserProfile } from '@lib/types/schema';

// dialog.ts is a pure-data + pure-functions module — no module state
// to reset, no async behavior. Tests focus on behavioral contracts of
// the public API: template substitution, conditional flow selection,
// id format, mood mapping.

function makeProfile(overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    id: 'u-1',
    name: 'Alex',
    firstVisitAt: new Date('2026-01-01'),
    lastVisitAt: new Date('2026-05-01'),
    skillLevel: 'beginner',
    interests: [],
    preferredGenres: [],
    completedLessons: [],
    mascotName: 'Pixel',
    onboardingComplete: false,
    ...overrides,
  };
}

describe('processDialogStep — template substitution', () => {
  it('returns empty string when step has no pixel field', () => {
    expect(processDialogStep({}, null)).toBe('');
    expect(processDialogStep({ getUserName: true }, null)).toBe('');
  });

  it('substitutes {name} from profile.name', () => {
    const result = processDialogStep({ pixel: 'Hello, {name}!' }, makeProfile({ name: 'Sam' }));
    expect(result).toBe('Hello, Sam!');
  });

  it('substitutes {currentProject} from profile, with fallback', () => {
    const withProject = processDialogStep(
      { pixel: 'Continue {currentProject}' },
      makeProfile({ currentProject: 'My Cool Game' })
    );
    expect(withProject).toBe('Continue My Cool Game');

    const withoutProject = processDialogStep(
      { pixel: 'Continue {currentProject}' },
      makeProfile({ currentProject: undefined })
    );
    expect(withoutProject).toBe('Continue your project');
  });

  it('substitutes {mascotName} from profile, with fallback to "Pixel"', () => {
    const renamed = processDialogStep(
      { pixel: 'Call me {mascotName}' },
      makeProfile({ mascotName: 'Ralphie' })
    );
    expect(renamed).toBe('Call me Ralphie');

    const defaulted = processDialogStep(
      { pixel: 'Call me {mascotName}' },
      makeProfile({ mascotName: '' })
    );
    expect(defaulted).toBe('Call me Pixel');
  });

  it('substitutes context variables when provided', () => {
    const result = processDialogStep({ pixel: 'You learned {concept}!' }, null, {
      concept: 'loops',
    });
    expect(result).toBe('You learned loops!');
  });

  it('handles missing/null context values as empty strings', () => {
    // Pin: undefined/null context values should become empty, not the
    // literal "undefined" string — that would corrupt user-facing UI.
    const result = processDialogStep({ pixel: 'Score: {points}' }, null, { points: null });
    expect(result).toBe('Score: ');
  });

  it('leaves unsubstituted placeholders alone when no context provides them', () => {
    // Pin: missing keys are preserved verbatim. This makes wizard
    // authoring easier — a typo'd placeholder is visible rather than
    // silently swallowed.
    const result = processDialogStep({ pixel: 'Hello {unknownVar}' }, null);
    expect(result).toBe('Hello {unknownVar}');
  });
});

describe('createMessage', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-07T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('creates a message with required fields and defaults role=pixel', () => {
    const msg = createMessage('Hello world');
    expect(msg.content).toBe('Hello world');
    expect(msg.role).toBe('pixel');
    expect(msg.id).toBeTruthy();
    expect(msg.timestamp).toBeInstanceOf(Date);
  });

  it('honors explicit role / quickReplies / actionType', () => {
    const msg = createMessage('hi', 'user', ['Yes', 'No'], 'lesson');
    expect(msg.role).toBe('user');
    expect(msg.quickReplies).toEqual(['Yes', 'No']);
    expect(msg.actionType).toBe('lesson');
  });

  it('id format is `msg-<timestamp>-<random>`', () => {
    const msg = createMessage('test');
    expect(msg.id).toMatch(/^msg-\d+-[a-z0-9]+$/);
  });
});

describe('getDialogFlow — state routing', () => {
  it('returns firstVisit when no profile', () => {
    expect(getDialogFlow('any', null)).toBe(dialogFlows.firstVisit);
  });

  it('returns firstVisit when onboarding incomplete', () => {
    const flow = getDialogFlow('returning', makeProfile({ onboardingComplete: false }));
    expect(flow).toBe(dialogFlows.firstVisit);
  });

  it.each([
    ['returning', dialogFlows.returningUser],
    ['gameSelection', dialogFlows.gameSelection],
    ['lessonSuggestion', dialogFlows.lessonSuggestion],
    ['projectComplete', dialogFlows.projectComplete],
    ['help', dialogFlows.helpOffered],
    ['rename', dialogFlows.renamePixel],
  ])('routes onboarded user state %s to expected flow', (state, expected) => {
    const flow = getDialogFlow(state, makeProfile({ onboardingComplete: true }));
    expect(flow).toBe(expected);
  });

  it('falls back to returningUser for unknown states (onboarded user)', () => {
    const flow = getDialogFlow('weird-future-state', makeProfile({ onboardingComplete: true }));
    expect(flow).toBe(dialogFlows.returningUser);
  });
});

describe('getPixelResponse', () => {
  it('returns a string from the matching personality category', () => {
    const greeting = getPixelResponse('greetings');
    expect(pixelPersonality.greetings).toContain(greeting);
  });

  it('handles all four personality categories', () => {
    const types: Array<keyof typeof pixelPersonality> = [
      'greetings',
      'encouragements',
      'hints',
      'celebrations',
      'thinking',
    ];
    for (const type of types) {
      const response = getPixelResponse(type);
      expect(typeof response).toBe('string');
      expect(response.length).toBeGreaterThan(0);
    }
  });

  it('uses Math.random for selection (covers both ends of the array)', () => {
    // Stub Math.random to deterministically pick first and last entries.
    const arr = pixelPersonality.greetings;
    vi.spyOn(Math, 'random').mockReturnValue(0);
    expect(getPixelResponse('greetings')).toBe(arr[0]);
    vi.spyOn(Math, 'random').mockReturnValue(0.999);
    expect(getPixelResponse('greetings')).toBe(arr[arr.length - 1]);
    vi.restoreAllMocks();
  });
});

describe('dialogFlows — structural invariants', () => {
  it('every flow is a non-empty array of DialogStep', () => {
    for (const [name, flow] of Object.entries(dialogFlows)) {
      expect(Array.isArray(flow), `${name} should be an array`).toBe(true);
      expect((flow as unknown[]).length, `${name} should be non-empty`).toBeGreaterThan(0);
    }
  });

  it('returningUser conditional step references currentProject', () => {
    // Pin the conditional contract — UI relies on this branch.
    const conditional = dialogFlows.returningUser.find((s) => s.condition);
    expect(conditional).toBeDefined();
    expect(conditional?.condition?.(makeProfile({ currentProject: 'GameX' }))).toBe(true);
    expect(conditional?.condition?.(makeProfile({ currentProject: undefined }))).toBe(false);
    expect(conditional?.condition?.(null)).toBe(false);
  });

  it('renamePixel flow includes a getInput step for mascotName', () => {
    const inputStep = dialogFlows.renamePixel.find((s) => s.getInput);
    expect(inputStep?.getInput).toBe('mascotName');
  });
});

describe('skillLevelResponses', () => {
  it('has entries for all four skill levels', () => {
    expect(skillLevelResponses.beginner).toBeDefined();
    expect(skillLevelResponses.learning).toBeDefined();
    expect(skillLevelResponses.confident).toBeDefined();
    expect(skillLevelResponses.pro).toBeDefined();
  });

  it('each entry has pace, explanation, examples fields', () => {
    for (const level of ['beginner', 'learning', 'confident', 'pro'] as const) {
      const entry = skillLevelResponses[level];
      expect(entry.pace).toBeTruthy();
      expect(entry.explanation).toBeTruthy();
      expect(entry.examples).toBeTruthy();
    }
  });
});

describe('getPixelMood', () => {
  it.each([
    ['greeting', PixelMood.Happy],
    ['question', PixelMood.Curious],
    ['success', PixelMood.Celebrating],
    ['help', PixelMood.Helpful],
    ['encouragement', PixelMood.Encouraging],
    ['thinking', PixelMood.Thinking],
    ['achievement', PixelMood.Proud],
    ['excited', PixelMood.Excited],
  ])('maps context %s to %s', (context, expected) => {
    expect(getPixelMood(context)).toBe(expected);
  });

  it('falls back to Happy for unknown context', () => {
    expect(getPixelMood('totally-unknown-context')).toBe(PixelMood.Happy);
    expect(getPixelMood('')).toBe(PixelMood.Happy);
  });
});
