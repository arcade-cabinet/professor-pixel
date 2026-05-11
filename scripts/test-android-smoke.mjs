#!/usr/bin/env node
// Run the Maestro Android smoke flow if (and only if) the prerequisites
// are present:
//   1. `maestro` is on PATH (or at ~/.maestro/bin/maestro).
//   2. `adb devices` reports at least one connected device or running emulator.
//   3. The Capacitor APK has been built and is installed on the target.
//
// If any check fails, exit 0 with a friendly skip message rather than
// breaking CI. This script is opt-in via `pnpm test:android:smoke`; it is
// NOT wired into `pnpm test` because most contributors don't keep an
// emulator running.
//
// Triggered manually for now. A future CI job (self-hosted Android runner
// or matrix expansion of cd-mobile.yml) can call it once a runner exists.

import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { resolve } from 'node:path';

// All child processes spawned here use execFileSync with an args array
// (no shell). The maestro path is sourced from `homedir()` and the flow
// path from `process.cwd()` — both attacker-controllable in principle, so
// shell interpolation would be a CodeQL-flagged command-injection vector.
// execFile bypasses /bin/sh entirely: argv stays an array.

function maestroPath() {
  const candidates = ['maestro', resolve(homedir(), '.maestro', 'bin', 'maestro')];
  for (const c of candidates) {
    try {
      execFileSync(c, ['--version'], { stdio: 'ignore' });
      return c;
    } catch {
      // try next
    }
  }
  return null;
}

function adbDevices() {
  try {
    const out = execFileSync('adb', ['devices'], { encoding: 'utf8' });
    // First line is "List of devices attached"; subsequent non-blank lines
    // are "<serial>\t<state>". State `device` means ready; `offline` /
    // `unauthorized` means no.
    return out
      .split('\n')
      .slice(1)
      .map((l) => l.trim())
      .filter((l) => l.length > 0)
      .filter((l) => l.endsWith('device'));
  } catch {
    return [];
  }
}

const maestro = maestroPath();
if (!maestro) {
  console.log(
    '[android-smoke] skip — `maestro` is not on PATH and ~/.maestro/bin/maestro is absent.'
  );
  console.log(
    '[android-smoke] install: https://docs.maestro.dev/getting-started/installing-maestro'
  );
  process.exit(0);
}

const targets = adbDevices();
if (targets.length === 0) {
  console.log('[android-smoke] skip — `adb devices` reports zero connected devices/emulators.');
  console.log(
    '[android-smoke] start an emulator (`emulator @<avd-name>`) or plug in a device with USB debugging on.'
  );
  process.exit(0);
}

console.log(`[android-smoke] running .maestro/smoke.yaml against ${targets[0]}`);

const flowPath = resolve(process.cwd(), '.maestro', 'smoke.yaml');
if (!existsSync(flowPath)) {
  console.error('[android-smoke] no .maestro/smoke.yaml found — aborting.');
  process.exit(1);
}

try {
  execFileSync(maestro, ['test', flowPath], { stdio: 'inherit' });
  console.log('[android-smoke] flow finished. Screenshots: artifacts/screenshots/android/');
} catch (err) {
  console.error('[android-smoke] maestro test failed:', err.message);
  process.exit(1);
}
