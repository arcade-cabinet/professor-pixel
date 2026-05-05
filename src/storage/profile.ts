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
      typeof (parsed as PlayerProfile).createdAt === 'string'
    ) {
      return parsed as PlayerProfile;
    }
    return null;
  } catch {
    return null;
  }
}

export function saveProfile(name: string): PlayerProfile {
  const profile: PlayerProfile = {
    name: name.trim().slice(0, 32), // cap length so a kid pasting Tolstoy doesn't break the UI
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
