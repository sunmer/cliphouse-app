import type {Theme} from '../videos/vocab';

export const PRESETS: {name: string; colors: Theme}[] = [
  {name: 'Ember', colors: {background: '#07070b', surface: '#15151f', foreground: '#f4f2ee', accent: '#ff4d2e', accent2: '#3dd6c6'}},
  {name: 'Paper', colors: {background: '#f3f4f6', surface: '#ffffff', foreground: '#111827', accent: '#2563eb', accent2: '#16a34a'}},
  {name: 'Neon', colors: {background: '#0b0420', surface: '#1c0d3d', foreground: '#fdf4ff', accent: '#ff2bd6', accent2: '#facc15'}},
  {name: 'Forest', colors: {background: '#0f1f17', surface: '#183427', foreground: '#eef5ec', accent: '#9be15d', accent2: '#f2c14e'}},
  {name: 'Volt', colors: {background: '#111111', surface: '#1f1f1f', foreground: '#ffffff', accent: '#d4ff3a', accent2: '#ff5c39'}},
  {name: 'Linen', colors: {background: '#f5efe6', surface: '#ffffff', foreground: '#1d1b19', accent: '#c2410c', accent2: '#0f766e'}},
  {name: 'Ocean', colors: {background: '#04131f', surface: '#0b2536', foreground: '#e6f4ff', accent: '#38bdf8', accent2: '#fb7185'}},
  {name: 'Sorbet', colors: {background: '#fff1f2', surface: '#ffffff', foreground: '#3b0a1a', accent: '#e11d48', accent2: '#7c3aed'}},
];

// Original palette first, then curated presets that differ from it.
export function derivePalettes(original: Theme) {
  const same = (a: Theme) => JSON.stringify(a) === JSON.stringify(original);
  return [{name: 'Original', colors: original}, ...PRESETS.filter((p) => !same(p.colors))];
}

const hsl = (h: number, s: number, l: number) => {
  s /= 100; l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const channel = (n: number) => Math.round(255 * (l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))));
  return `#${[0, 8, 4].map((n) => channel(n).toString(16).padStart(2, '0')).join('')}`;
};
export const luminance = (hex: string) => {
  const values = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((v) => v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  return 0.2126 * values[0] + 0.7152 * values[1] + 0.0722 * values[2];
};
export const contrast = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

function hexToHsl(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l * 100];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === r ? ((g - b) / d + (g < b ? 6 : 0)) : max === g ? ((b - r) / d + 2) : ((r - g) / d + 4);
  return [h * 60, s * 100, l * 100];
}

function tuneAccent(accent: string, bg: string): string {
  if (contrast(accent, bg) >= 3.2) return accent;
  const [h, s, l] = hexToHsl(accent);
  const bgLight = luminance(bg) > 0.35;
  const sat = Math.max(s, 55);
  for (let step = 1; step <= 14; step++) {
    const nextL = bgLight ? Math.max(18, l - step * 5) : Math.min(84, l + step * 5);
    const candidate = hsl(h, sat, nextL);
    if (contrast(candidate, bg) >= 3.5) return candidate;
  }
  return hsl(h, sat, bgLight ? 32 : 70);
}

/**
 * Apply a brand palette while respecting each template's dark/light polarity.
 * Matching-tone templates take the full 5-color brand palette; opposite-tone templates
 * keep their curated background/surface/foreground and adopt contrast-checked brand accents.
 */
export function adaptBrandTheme(original: Theme, brand: Theme): Theme {
  const sameTone = (luminance(original.background) > 0.35) === (luminance(brand.background) > 0.35);
  if (sameTone) return {...brand};
  return {
    background: original.background,
    surface: original.surface,
    foreground: original.foreground,
    accent: tuneAccent(brand.accent, original.background),
    accent2: tuneAccent(brand.accent2, original.background),
  };
}
const between = (random: () => number, min: number, max: number) => min + random() * (max - min);
const hue = (value: number) => ((value % 360) + 360) % 360;
const NAMES = ['Signal', 'Studio', 'Bloom', 'Current', 'Atlas', 'Pop', 'Field', 'Vapor', 'Mono', 'Tide', 'Flare', 'Grove'];
const HARMONIES = [150, 180, 210, -150, 120, -120];

function generatePalette(index: number, random: () => number): Theme {
  for (let attempt = 0; attempt < 40; attempt++) {
    const base = random() * 360;
    const dark = index % 3 !== 1;
    const accentHue = hue(base + between(random, -18, 18));
    const accent2Hue = hue(accentHue + HARMONIES[Math.floor(random() * HARMONIES.length)] + between(random, -12, 12));
    const theme = dark ? {
      background: hsl(base, between(random, 18, 48), between(random, 4, 9)),
      surface: hsl(hue(base + between(random, -8, 8)), between(random, 18, 42), between(random, 12, 18)),
      foreground: hsl(base, between(random, 8, 28), between(random, 93, 97)),
      accent: hsl(accentHue, between(random, 78, 96), between(random, 54, 64)),
      accent2: hsl(accent2Hue, between(random, 68, 92), between(random, 56, 68)),
    } : {
      background: hsl(base, between(random, 18, 48), between(random, 93, 97)),
      surface: hsl(base, between(random, 20, 55), between(random, 98, 100)),
      foreground: hsl(base, between(random, 25, 55), between(random, 8, 14)),
      accent: hsl(accentHue, between(random, 72, 92), between(random, 38, 48)),
      accent2: hsl(accent2Hue, between(random, 62, 88), between(random, 32, 44)),
    };
    // Keep generated themes legible for text and distinct enough for accent roles.
    if (contrast(theme.foreground, theme.background) >= 12 && contrast(theme.foreground, theme.surface) >= 9 &&
      contrast(theme.accent, theme.background) >= 3 && contrast(theme.accent2, theme.background) >= 3) return theme;
  }
  return PRESETS[index % PRESETS.length].colors;
}

export function generatePalettes(original: Theme, count = PRESETS.length, random = Math.random) {
  const offset = Math.floor(random() * NAMES.length);
  return [{name: 'Original', colors: original}, ...Array.from({length: count}, (_, i) => ({
    name: `${NAMES[(offset + i) % NAMES.length]} ${i + 1}`,
    colors: generatePalette(i, random),
  }))];
}
