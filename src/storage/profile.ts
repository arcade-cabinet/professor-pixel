// Player profile — persists the kid's name + creation timestamp so Pixel
// can address them by name throughout the wizard ("{name}" interpolation
// already exists in src/wizard/dialog.ts).
//
// We deliberately keep this tiny. Profile is opt-in: kids without a name set
// see Pixel's default copy ("you" / "friend") because the dialogue templates
// use neutral fallbacks. Setting a name is a single localStorage write.

const PROFILE_KEY = 'pp.profile';

export interface PlayerProfile {
  name: string;
  createdAt: string; // ISO timestamp
}

export class InvalidProfileError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidProfileError';
  }
}

export function loadProfile(): PlayerProfile | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (
      parsed &&
      typeof parsed === 'object' &&
      typeof (parsed as PlayerProfile).name === 'string' &&
      typeof (parsed as PlayerProfile).createdAt === 'string' &&
      // Reject blank-name profiles even if they slipped through an older
      // saveProfile path. Pixel's "Welcome back, !" copy with an empty
      // interpolation is worse than no profile at all.
      (parsed as PlayerProfile).name.trim().length > 0
    ) {
      return parsed as PlayerProfile;
    }
    return null;
  } catch {
    return null;
  }
}

// P4.19 — Visible to callers so the length validation message can be
// shaped by the catalog rather than hardcoded in two places. The cap
// is conservative (kids' names rarely need more, and the avatar
// chrome wraps badly past 24 chars at smaller widths).
export const PROFILE_NAME_MAX_LENGTH = 24;

export function saveProfile(name: string): PlayerProfile {
  // Trim before validating so leading/trailing whitespace doesn't pass an
  // "is non-empty?" check by accident. A kid hitting Save with all
  // whitespace gets rejected. Names longer than the cap are also
  // rejected so the caller can surface a clear "names can be at most N
  // characters" toast — silent truncation hides the constraint.
  const trimmed = name.trim();
  if (trimmed.length === 0) {
    throw new InvalidProfileError('Profile name cannot be empty');
  }
  if (trimmed.length > PROFILE_NAME_MAX_LENGTH) {
    throw new InvalidProfileError(
      `Profile name must be at most ${PROFILE_NAME_MAX_LENGTH} characters`
    );
  }
  const profile: PlayerProfile = {
    name: trimmed,
    createdAt: loadProfile()?.createdAt ?? new Date().toISOString(),
  };
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    } catch {
      // Quota / privacy mode — surfaced via the global toast system.
    }
  }
  return profile;
}

export function clearProfile(): void {
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.removeItem(PROFILE_KEY);
    } catch {
      // ignore
    }
  }
}
