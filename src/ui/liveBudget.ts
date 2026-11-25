// Client-side concurrency scheduler for live personalized gallery previews.
// Keeps desktop smooth (up to 4 live 2D cards + instant hover priority, max 1 hovered 3D card)
// and mobile safe (1 centered 2D card, 0 WebGL cards in the grid) with zero server rendering.

export const THREE_TEMPLATES = new Set([
  'chrome3d',
  'clay',
  'countdown3d',
  'iso3d',
  'logo3d',
  'orbit3d',
  'title3d',
  'turntable',
]);

type Entry = {
  id: string;
  el: HTMLElement;
  is3d: boolean;
  hovered: boolean;
  playing: boolean;
  onChange: (playing: boolean) => void;
};

const entries = new Map<string, Entry>();
let listenersAttached = false;
let scrollTimer: number | undefined;
let rafPending = false;

function isDesktop() {
  return typeof window !== 'undefined' && window.matchMedia('(pointer: fine) and (min-width: 901px)').matches;
}

function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function recompute() {
  rafPending = false;
  if (typeof window === 'undefined') return;
  if (document.hidden || prefersReducedMotion()) {
    for (const entry of entries.values()) {
      if (entry.playing) {
        entry.playing = false;
        entry.onChange(false);
      }
    }
    return;
  }

  const desktop = isDesktop();
  const max2d = desktop ? 4 : 1;
  const max3d = desktop ? 1 : 0;
  const vh = window.innerHeight || 900;
  // Bias slightly above vertical center so the first visible row plays immediately on page load.
  const focusY = desktop ? vh * 0.42 : vh * 0.48;

  const scored2d: Array<{entry: Entry; score: number}> = [];
  const scored3d: Array<{entry: Entry; score: number}> = [];

  for (const entry of entries.values()) {
    const rect = entry.el.getBoundingClientRect();
    if (rect.bottom <= 0 || rect.top >= vh || rect.width === 0 || rect.height === 0) continue;
    const centerY = rect.top + rect.height / 2;
    const dist = Math.abs(centerY - focusY);
    if (entry.is3d) {
      // 3D WebGL cards only take a live slot on desktop hover/focus so scrolling stays smooth.
      if (entry.hovered) scored3d.push({entry, score: dist});
    } else {
      // Hovered or focused cards always win first priority.
      scored2d.push({entry, score: entry.hovered ? -10_000 + dist : dist});
    }
  }

  scored2d.sort((a, b) => a.score - b.score);
  scored3d.sort((a, b) => a.score - b.score);

  const winners = new Set<string>();
  for (const item of scored2d.slice(0, max2d)) winners.add(item.entry.id);
  for (const item of scored3d.slice(0, max3d)) winners.add(item.entry.id);

  for (const entry of entries.values()) {
    const next = winners.has(entry.id);
    if (entry.playing !== next) {
      entry.playing = next;
      entry.onChange(next);
    }
  }
}

function scheduleImmediate() {
  if (rafPending || typeof window === 'undefined') return;
  rafPending = true;
  requestAnimationFrame(recompute);
}

function scheduleThrottled() {
  if (scrollTimer !== undefined || typeof window === 'undefined') return;
  scrollTimer = window.setTimeout(() => {
    scrollTimer = undefined;
    scheduleImmediate();
  }, 150);
}

function attachListeners() {
  if (listenersAttached || typeof window === 'undefined') return;
  listenersAttached = true;
  window.addEventListener('scroll', scheduleThrottled, {passive: true});
  window.addEventListener('resize', scheduleThrottled, {passive: true});
  document.addEventListener('visibilitychange', scheduleImmediate);
}

function detachIfEmpty() {
  if (entries.size > 0 || !listenersAttached || typeof window === 'undefined') return;
  listenersAttached = false;
  window.removeEventListener('scroll', scheduleThrottled);
  window.removeEventListener('resize', scheduleThrottled);
  document.removeEventListener('visibilitychange', scheduleImmediate);
  if (scrollTimer !== undefined) {
    window.clearTimeout(scrollTimer);
    scrollTimer = undefined;
  }
}

export function registerLiveCard(
  id: string,
  el: HTMLElement,
  is3d: boolean,
  hovered: boolean,
  onChange: (playing: boolean) => void,
) {
  attachListeners();
  const prev = entries.get(id);
  const entry: Entry = {id, el, is3d, hovered, playing: prev?.playing ?? false, onChange};
  entries.set(id, entry);
  scheduleImmediate();
  return {
    setHovered(next: boolean) {
      if (entry.hovered === next) return;
      entry.hovered = next;
      scheduleImmediate();
    },
    unregister() {
      if (entries.get(id) === entry) entries.delete(id);
      detachIfEmpty();
      if (entries.size > 0) scheduleImmediate();
    },
  };
}
