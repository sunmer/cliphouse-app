import {useSyncExternalStore} from 'react';
import {ROLES, type Role, type Theme, type VideoProps} from '../videos/vocab';

// One set of brand values, applied to every template through the shared roles.
export type BrandKit = {
  enabled: boolean;
  texts: Partial<Record<Role, string>>;
  theme: Theme | null;
};

const KEY = 'voodoo:brandkit';
const empty: BrandKit = {enabled: false, texts: {}, theme: null};

function load(): BrandKit {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? {...empty, ...JSON.parse(raw)} : empty;
  } catch {
    return empty;
  }
}

let current = load();
const listeners = new Set<() => void>();

export function setBrandKit(next: BrandKit | ((k: BrandKit) => BrandKit)) {
  current = typeof next === 'function' ? next(current) : next;
  localStorage.setItem(KEY, JSON.stringify(current));
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

export const kitHasValues = (k: BrandKit) => Boolean(k.theme) || Object.values(k.texts).some((v) => v?.trim());
export const kitActive = (k: BrandKit) => k.enabled && kitHasValues(k);

// Fill only roles the template uses; skip values that exceed that role's limit.
export function applyKit(props: VideoProps, kit: BrandKit): VideoProps {
  const texts = {...props.texts};
  for (const role of Object.keys(texts) as Role[]) {
    const v = ROLES[role].kit ? kit.texts[role]?.trim() : undefined;
    if (v && v.length <= ROLES[role].max) texts[role] = v;
  }
  // Keep image choices, hidden roles, and the sound switch; the kit only sets text and color.
  return {...props, texts, theme: kit.theme ?? props.theme};
}
