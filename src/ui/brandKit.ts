import {useSyncExternalStore} from 'react';
import {KIT_ROLE_KEYS, THEME_ROLES, roleError, type Role, type Theme, type VideoProps} from '../videos/vocab';
import {LOGO_ID, type Logo} from '../videos/logo';
import {adaptBrandTheme} from './palettes';

// Brand colors, optional copy, and an optional logo, previewed on every template while the kit is on.
export type ColorMode = 'exact' | 'adaptive';
export type BrandKit = {
  enabled: boolean;
  theme: Theme | null;
  logo?: Logo | null;
  texts?: Partial<Record<Role, string>> | null;
  textsEnabled?: boolean;
  colorMode?: ColorMode;
};

// A new key: kits saved under the old `voodoo:brandkit` key (text and colors) are ignored.
const KEY = 'cliphouse:brandkit:colors';
const empty: BrandKit = {enabled: false, theme: null};
export const isHex = (value: string) => /^#[0-9a-f]{6}$/i.test(value);
const LOGO_KEY = 'cliphouse:brandkit:logo';
const TEXTS_KEY = 'cliphouse:brandkit:texts';
const isLogo = (value: unknown): value is Logo => !!value && typeof value === 'object' && LOGO_ID.test(String((value as Logo).id))
  && typeof (value as Logo).ratio === 'number' && typeof (value as Logo).mono === 'boolean';

function cleanTexts(value: unknown): Partial<Record<Role, string>> | null {
  if (!value || typeof value !== 'object') return null;
  const out: Partial<Record<Role, string>> = {};
  for (const role of KIT_ROLE_KEYS) {
    const v = (value as Record<string, unknown>)[role];
    if (typeof v === 'string' && !roleError(role, v)) out[role] = v;
  }
  return Object.keys(out).length ? out : null;
}

function isTheme(value: unknown): value is Theme {
  return !!value && typeof value === 'object' && THEME_ROLES.every((r) => isHex(String((value as Record<string, unknown>)[r])));
}

function load(): BrandKit {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Partial<BrandKit> | null;
    // The logo has its own key, so a logo set before any color choice is kept.
    const savedLogo = JSON.parse(localStorage.getItem(LOGO_KEY) ?? 'null') as unknown;
    const logo = isLogo(savedLogo) ? savedLogo : null;
    const texts = cleanTexts(JSON.parse(localStorage.getItem(TEXTS_KEY) ?? 'null'));
    if (!raw) return {...empty, logo, texts, textsEnabled: !!texts};
    const theme = isTheme(raw.theme) ? raw.theme : null;
    const textsEnabled = raw.textsEnabled !== false && !!texts;
    const colorMode: ColorMode = raw.colorMode === 'adaptive' ? 'adaptive' : 'exact';
    return {enabled: raw.enabled === true && !!theme, theme, logo, texts, textsEnabled, colorMode};
  } catch {
    return empty;
  }
}

let current = typeof window === 'undefined' ? empty : load();
const listeners = new Set<() => void>();

export function setBrandKit(next: BrandKit | ((k: BrandKit) => BrandKit)) {
  const value = typeof next === 'function' ? next(current) : next;
  const texts = value.texts === undefined ? current.texts : cleanTexts(value.texts);
  const textsEnabled = value.textsEnabled === undefined ? (texts ? current.textsEnabled !== false : false) : (value.textsEnabled && !!texts);
  const colorMode: ColorMode = value.colorMode ?? current.colorMode ?? 'exact';
  current = {
    ...value,
    logo: value.logo === undefined ? current.logo : value.logo,
    texts,
    textsEnabled,
    colorMode,
  };
  try {
    localStorage.setItem(KEY, JSON.stringify({enabled: current.enabled, theme: current.theme, textsEnabled: current.textsEnabled, colorMode: current.colorMode}));
    if (current.logo) localStorage.setItem(LOGO_KEY, JSON.stringify(current.logo)); else localStorage.removeItem(LOGO_KEY);
    if (current.texts) localStorage.setItem(TEXTS_KEY, JSON.stringify(current.texts)); else localStorage.removeItem(TEXTS_KEY);
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
export const kitHasTexts = (k: BrandKit): k is BrandKit & {texts: Partial<Record<Role, string>>} =>
  k.textsEnabled !== false && !!k.texts && Object.keys(k.texts).length > 0;
/** The kit changes previews when its colors or copy are on, or when it holds a logo. */
export const kitApplies = (k: BrandKit) => kitActive(k) || kitHasTexts(k) || !!k.logo;

// The kit replaces the theme while its colors are on, overlays shared kit text roles when active,
// and adds its logo to templates with a logo slot. Content roles, images, hidden roles, and sound stay as they are.
export function applyKit<P extends VideoProps>(props: P, kit: BrandKit, logoSlot = false): P {
  let out = kitActive(kit)
    ? {...props, theme: kit.colorMode === 'adaptive' ? adaptBrandTheme(props.theme, kit.theme) : {...kit.theme}}
    : props;
  if (kitHasTexts(kit) && kit.texts) {
    let texts: VideoProps['texts'] | null = null;
    for (const role of KIT_ROLE_KEYS) {
      const nextText = kit.texts[role];
      if (nextText !== undefined && role in out.texts && !roleError(role, nextText) && out.texts[role] !== nextText) {
        if (!texts) texts = {...out.texts};
        texts[role] = nextText;
      }
    }
    if (texts) out = {...out, texts};
  }
  if (logoSlot && kit.logo && !(props as {logo?: unknown}).logo) out = {...out, logo: {...kit.logo}};
  return out;
}
