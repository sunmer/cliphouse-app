import {useSyncExternalStore} from 'react';
import {THEME_ROLES, type Theme, type VideoProps} from '../videos/vocab';
import {LOGO_ID, type Logo} from '../videos/logo';

// Brand colors and an optional logo, previewed on every template while the kit is on.
export type BrandKit = {
  enabled: boolean;
  theme: Theme | null;
  logo?: Logo | null;
};

// A new key: kits saved under the old `voodoo:brandkit` key (text and colors) are ignored.
const KEY = 'cliphouse:brandkit:colors';
const empty: BrandKit = {enabled: false, theme: null};
export const isHex = (value: string) => /^#[0-9a-f]{6}$/i.test(value);
const LOGO_KEY = 'cliphouse:brandkit:logo';
const isLogo = (value: unknown): value is Logo => !!value && typeof value === 'object' && LOGO_ID.test(String((value as Logo).id))
  && typeof (value as Logo).ratio === 'number' && typeof (value as Logo).mono === 'boolean';

function isTheme(value: unknown): value is Theme {
  return !!value && typeof value === 'object' && THEME_ROLES.every((r) => isHex(String((value as Record<string, unknown>)[r])));
}

function load(): BrandKit {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Partial<BrandKit> | null;
    // The logo has its own key, so a logo set before any color choice is kept.
    const savedLogo = JSON.parse(localStorage.getItem(LOGO_KEY) ?? 'null') as unknown;
    const logo = isLogo(savedLogo) ? savedLogo : null;
    if (!raw) return {...empty, logo};
    const theme = isTheme(raw.theme) ? raw.theme : null;
    return {enabled: raw.enabled === true && !!theme, theme, logo};
  } catch {
    return empty;
  }
}

let current = typeof window === 'undefined' ? empty : load();
const listeners = new Set<() => void>();

export function setBrandKit(next: BrandKit | ((k: BrandKit) => BrandKit)) {
  const value = typeof next === 'function' ? next(current) : next;
  current = {...value, logo: value.logo === undefined ? current.logo : value.logo};
  try {
    localStorage.setItem(KEY, JSON.stringify({enabled: current.enabled, theme: current.theme}));
    if (current.logo) localStorage.setItem(LOGO_KEY, JSON.stringify(current.logo)); else localStorage.removeItem(LOGO_KEY);
  } catch { /* Storage is unavailable. */ }
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
/** The kit changes previews when its colors are on, or when it holds a logo. */
export const kitApplies = (k: BrandKit) => kitActive(k) || !!k.logo;

// The kit replaces the theme while its colors are on, and adds its logo to templates with a logo slot.
// Text, images, hidden roles, and sound stay as they are.
export function applyKit<P extends VideoProps>(props: P, kit: BrandKit, logoSlot = false): P {
  let out = kitActive(kit) ? {...props, theme: {...kit.theme}} : props;
  if (logoSlot && kit.logo && !(props as {logo?: unknown}).logo) out = {...out, logo: {...kit.logo}};
  return out;
}
