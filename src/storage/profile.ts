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

export function saveProfile(name: string): PlayerProfile {
  // Trim and cap before validating so leading/trailing whitespace doesn't
  // pass an "is non-empty?" check by accident. A kid pasting Tolstoy gets
  // truncated; a kid hitting Save with all whitespace gets rejected
  // (caller must show a "name required" message rather than persist garbage).
  const trimmed = name.trim().slice(0, 32);
  if (trimmed.length === 0) {
    throw new InvalidProfileError('Profile name cannot be empty');
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
