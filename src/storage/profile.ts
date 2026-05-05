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
  // P4.32 — optional self-expression. Pronouns are a free-string
  // (preset list, "Custom" lets a kid type their own); avatarEmoji
  // is a single grapheme cluster picked from a small palette. Both
  // are absent on profiles saved before P4.32; loadProfile returns
  // them as undefined and dialogue/UI code falls back to defaults.
  pronouns?: string;
  avatarEmoji?: string;
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
      const obj = parsed as PlayerProfile;
      // Surface the optional fields only when they're well-shaped
      // strings — a malformed avatarEmoji or pronouns key shouldn't
      // crash the wizard's interpolation.
      const out: PlayerProfile = { name: obj.name, createdAt: obj.createdAt };
      if (typeof obj.pronouns === 'string' && obj.pronouns.trim().length > 0) {
        out.pronouns = obj.pronouns;
      }
      if (typeof obj.avatarEmoji === 'string' && obj.avatarEmoji.length > 0) {
        out.avatarEmoji = obj.avatarEmoji;
      }
      return out;
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

export interface ProfilePatch {
  name: string;
  /** Optional. Pass `null` to clear an existing value, omit to leave unchanged. */
  pronouns?: string | null;
  /** Optional. Same null/omit semantics as pronouns. */
  avatarEmoji?: string | null;
}

/**
 * Persist a profile. Accepts either a bare name string (legacy callers
 * that only set the name) or a {@link ProfilePatch} with optional
 * pronouns + avatarEmoji.
 *
 * createdAt is preserved across saves so the profile's birthday is
 * stable. Empty/oversized names throw InvalidProfileError; callers
 * surface that as a toast.
 */
export function saveProfile(input: string | ProfilePatch): PlayerProfile {
  const patch: ProfilePatch = typeof input === 'string' ? { name: input } : input;
  const trimmed = patch.name.trim();
  if (trimmed.length === 0) {
    throw new InvalidProfileError('Profile name cannot be empty');
  }
  if (trimmed.length > PROFILE_NAME_MAX_LENGTH) {
    throw new InvalidProfileError(
      `Profile name must be at most ${PROFILE_NAME_MAX_LENGTH} characters`
    );
  }
  const existing = loadProfile();
  const profile: PlayerProfile = {
    name: trimmed,
    createdAt: existing?.createdAt ?? new Date().toISOString(),
  };
  // Pronouns: undefined → carry over previous, null → clear, string → set.
  if (patch.pronouns === null) {
    // explicit clear — drop the field
  } else if (typeof patch.pronouns === 'string' && patch.pronouns.trim().length > 0) {
    profile.pronouns = patch.pronouns.trim();
  } else if (existing?.pronouns) {
    profile.pronouns = existing.pronouns;
  }
  // Avatar emoji: same semantics.
  if (patch.avatarEmoji === null) {
    // clear
  } else if (typeof patch.avatarEmoji === 'string' && patch.avatarEmoji.length > 0) {
    profile.avatarEmoji = patch.avatarEmoji;
  } else if (existing?.avatarEmoji) {
    profile.avatarEmoji = existing.avatarEmoji;
  }
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
