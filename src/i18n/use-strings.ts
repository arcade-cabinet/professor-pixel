import { strings, type Strings } from './strings';

/**
 * Returns the active locale's string catalog. Currently English-only;
 * the indirection lets components participate in i18n without rewriting
 * their imports when locales are added.
 *
 * Components that don't need React reactivity (no locale switching at
 * runtime) can also import `strings` directly from `./strings` — both
 * resolve to the same object today. The hook form is the right default
 * because it's where locale switching will plug in.
 */
export function useStrings(): Strings {
  return strings;
}
