import {useSyncExternalStore} from 'react';
import {THEME_ROLES, type Theme, type VideoProps} from '../videos/vocab';

// Brand colors only: one 5-color theme, previewed on every template while the kit is on.
export type BrandKit = {
  enabled: boolean;
  theme: Theme | null;
};

// A new key: kits saved under the old `voodoo:brandkit` key (text and colors) are ignored.
const KEY = 'cliphouse:brandkit:colors';
const empty: BrandKit = {enabled: false, theme: null};
export const isHex = (value: string) => /^#[0-9a-f]{6}$/i.test(value);

function isTheme(value: unknown): value is Theme {
  return !!value && typeof value === 'object' && THEME_ROLES.every((r) => isHex(String((value as Record<string, unknown>)[r])));
}

function load(): BrandKit {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Partial<BrandKit> | null;
    if (!raw) return empty;
    const theme = isTheme(raw.theme) ? raw.theme : null;
    return {enabled: raw.enabled === true && !!theme, theme};
  } catch {
    return empty;
  }
}

let current = typeof window === 'undefined' ? empty : load();
const listeners = new Set<() => void>();

export function setBrandKit(next: BrandKit | ((k: BrandKit) => BrandKit)) {
  current = typeof next === 'function' ? next(current) : next;
  try { localStorage.setItem(KEY, JSON.stringify(current)); } catch { /* Storage is unavailable. */ }
  listeners.forEach((l) => l());
}

export function useBrandKit() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => current,
  );
}

export const kitActive = (k: BrandKit): k is BrandKit & {theme: Theme} => k.enabled && !!k.theme;

// The kit replaces only the theme. Text, images, hidden roles, and sound stay as they are.
export function applyKit<P extends VideoProps>(props: P, kit: BrandKit): P {
  return kitActive(kit) ? {...props, theme: {...kit.theme}} : props;
}
