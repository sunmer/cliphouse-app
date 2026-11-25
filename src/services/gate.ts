// Browsing and editing catalog videos is unlimited without an account.
// Sign-in is requested only for cloud actions (MP4 export, save, publish, stars, logo upload).
export const FREE_VIDEOS = Infinity;
export const SOFT_PROMPT_AT = Infinity;
export const OPENED_KEY = 'cliphouse:opened-videos';
const PROMPTED_KEY = 'cliphouse:signup-prompted';

export type GateResult = 'open' | 'prompt' | 'gate';
type Storage = Pick<globalThis.Storage, 'getItem' | 'setItem'>;

function read(store: Storage): string[] {
  try {
    const value = JSON.parse(store.getItem(OPENED_KEY) ?? '[]');
    return Array.isArray(value) ? value.filter((id): id is string => typeof id === 'string') : [];
  } catch { return []; }
}

// Track opened catalog videos without blocking exploration.
export function checkOpen(variantId: string, store: Storage): GateResult {
  const opened = read(store);
  if (opened.includes(variantId)) return 'open';
  opened.push(variantId);
  try { store.setItem(OPENED_KEY, JSON.stringify(opened)); } catch { return 'open'; }
  void PROMPTED_KEY;
  return 'open';
}

export const looksAutomated = (nav: Pick<Navigator, 'webdriver' | 'userAgent'>) =>
  !!nav.webdriver || /bot|crawl|spider|slurp|preview|headless|lighthouse/i.test(nav.userAgent);
