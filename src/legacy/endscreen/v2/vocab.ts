// Shared vocabularies. Plain data with no imports, so Node scripts can read it too.

// `kit: false` roles hold per-video content, so the shared brand kit skips them.
// `pattern` roles hold structured text that templates parse (see shared/data.ts).
// `example` is a valid value used by tests and shown as a hint when a value does not match.
type RoleDef = {label: string; max: number; kit: boolean; pattern?: RegExp; hint?: string; example?: string};

const CHART_ITEM = String.raw`[^,]*[^,\d\s][^,]*?\s+-?\d+(?:\.\d+)?[%kKmMbB]?`;

export const ROLES = {
  brand: {label: 'Brand', max: 18, kit: true},
  headline: {label: 'Headline', max: 24, kit: true},
  subhead: {label: 'Subhead', max: 52, kit: true},
  point1: {label: 'Point 1', max: 16, kit: true},
  point2: {label: 'Point 2', max: 16, kit: true},
  point3: {label: 'Point 3', max: 16, kit: true},
  cta: {label: 'Call to action', max: 20, kit: true},
  quote: {label: 'Quote', max: 140, kit: false},
  author: {label: 'Author', max: 40, kit: false},
  attribution: {label: 'Attribution', max: 48, kit: false},
  date: {label: 'Date', max: 32, kit: false},
  price: {label: 'Price', max: 12, kit: false, pattern: /\d/, hint: 'Include a number, for example $29.', example: '$29'},
  priceNote: {label: 'Price note', max: 24, kit: false},
  stat: {label: 'Stat', max: 12, kit: false, pattern: /\d/, hint: 'Include a number, for example 12.4k or 98%.', example: '12.4k'},
  items: {label: 'List', max: 120, kit: false, pattern: /^[^,]*[^,\s][^,]*(,[^,]*[^,\s][^,]*){1,5}$/, hint: 'Separate 2 to 6 items with commas.', example: 'Design, Build, Launch'},
  chart: {label: 'Chart data', max: 96, kit: false, pattern: new RegExp(`^\\s*${CHART_ITEM}(\\s*,\\s*${CHART_ITEM}){1,5}\\s*$`), hint: 'Use 2 to 6 "Label 42" pairs separated by commas.', example: 'Q1 12, Q2 18, Q3 27'},
} satisfies Record<string, RoleDef>;

export type Role = keyof typeof ROLES;
export const ROLE_KEYS = Object.keys(ROLES) as Role[];
export const KIT_ROLE_KEYS = ROLE_KEYS.filter((role) => ROLES[role].kit);

const roleDef = (role: Role): RoleDef => ROLES[role];
// One rule set for the editor, schemas, build validation, and the share server.
export function roleError(role: Role, value: string): string | null {
  const def = roleDef(role);
  if (!value.trim()) return 'Required';
  if (value.length > def.max) return `Use ${def.max} characters or fewer`;
  if (def.pattern && !def.pattern.test(value)) return def.hint ?? 'Invalid format';
  return null;
}
export const roleExample = (role: Role) => roleDef(role).example;
export const roleHint = (role: Role) => roleDef(role).hint;
export const rolePattern = (role: Role) => roleDef(role).pattern;

export const THEME_ROLES = ['background', 'surface', 'foreground', 'accent', 'accent2'] as const;
export type ThemeRole = (typeof THEME_ROLES)[number];
export const THEME_LABELS: Record<ThemeRole, string> = {
  background: 'Background',
  surface: 'Surface',
  foreground: 'Text',
  accent: 'Accent',
  accent2: 'Accent 2',
};

export type Theme = Record<ThemeRole, string>;
export type VideoProps = {
  texts: Partial<Record<Role, string>>;
  theme: Theme;
};

export const SCENE_TYPES = {
  'title-reveal': 'Title reveal',
  'stat-cards': 'Stat cards',
  list: 'List',
  tagline: 'Tagline',
  'logo-lockup': 'Logo lockup',
  marquee: 'Marquee',
  typing: 'Typing',
  chart: 'Chart',
  quote: 'Quote',
  grid: 'Bento grid',
  'lower-third': 'Lower third',
  'end-screen': 'End screen',
  countdown: 'Countdown',
  byline: 'Byline',
  transition: 'Transition',
  announcement: 'Announcement',
  'price-reveal': 'Price reveal',
  'date-card': 'Date card',
  profile: 'Profile',
  timeline: 'Timeline',
  comparison: 'Comparison',
  question: 'Question',
  steps: 'Steps',
  counter: 'Counter',
  credits: 'Credits',
  greeting: 'Greeting',
} as const;
export type SceneType = keyof typeof SCENE_TYPES;

export const MOTION = [
  'Kinetic type',
  '3D cards',
  'Mask reveal',
  'Slide-in',
  'Wipes',
  'Orbit',
  'Circle reveal',
  'Split-flap',
  'Marquee',
  'Typewriter',
  'Glitch',
  'Line draw',
  'Bar chart',
  'Bento grid',
  'Liquid glass',
  'Variable type',
  'Halftone',
  'Scramble',
  'Collage',
  'Draw-on',
  'Cursor',
  'Spotlight',
  'Slice',
  'Swiss grid',
  'Lower thirds',
  'Countdown timer',
  'Waveform',
  'Counter',
  'Bar chart race',
  'Line chart',
  'Pie chart',
  'Progress bar',
  'Split screen',
  'Flip cards',
  'Stamp',
  'Confetti',
  'Route line',
  'Rolling credits',
  'Ticket stub',
  'Stagger list',
  'Zoom',
  'Parallax',
  'Pulse rings',
] as const;
export type Motion = (typeof MOTION)[number];

export type SceneDef = {
  type: SceneType;
  from: number;
  duration: number;
  /** Frame offset within the scene where its content is fully on screen. */
  focus: number;
  roles: Role[];
};

// Technical facts about a template. These come from code, never from tagging.
export type TemplateMeta = {
  id: string;
  name: string;
  width: number;
  height: number;
  fps: number;
  durationInFrames: number;
  posterFrame: number;
  motion: Motion[];
  scenes: SceneDef[];
};
