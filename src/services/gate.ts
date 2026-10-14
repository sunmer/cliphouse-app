// Account gate for catalog videos opened in the editor.
// A conversion prompt, not a security control: clearing site data resets it.
export const FREE_VIDEOS = 3;
export const SOFT_PROMPT_AT = 2;
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

// Decide whether a signed-out visitor may open `variantId`. Videos already opened stay free.
// A blocked video is not recorded, so going back and reopening it still shows the gate.
export function checkOpen(variantId: string, store: Storage): GateResult {
  const opened = read(store);
  if (opened.includes(variantId)) return 'open';
  if (opened.length >= FREE_VIDEOS) return 'gate';
  opened.push(variantId);
  try { store.setItem(OPENED_KEY, JSON.stringify(opened)); } catch { return 'open'; }
  if (opened.length === SOFT_PROMPT_AT && store.getItem(PROMPTED_KEY) !== '1') {
    try { store.setItem(PROMPTED_KEY, '1'); } catch { /* still prompt once this session */ }
    return 'prompt';
  }
  return 'open';
}

export const looksAutomated = (nav: Pick<Navigator, 'webdriver' | 'userAgent'>) =>
  !!nav.webdriver || /bot|crawl|spider|slurp|preview|headless|lighthouse/i.test(nav.userAgent);
