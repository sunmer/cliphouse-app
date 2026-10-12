import manifest from './manifest.json';
import {templateMeta} from '../videos/meta';
import {SCENE_TYPES, type Role, type TemplateMeta, type Theme, type VideoProps} from '../videos/vocab';

export type Format = '16:9' | '9:16' | '1:1' | '4:5';
export type Tone = 'Dark' | 'Light';

type RawVariant = (typeof manifest.variants)[number];
export type Template = (typeof manifest.templates)[number] & {meta: TemplateMeta};

// A variant is what users browse: template + preset values + curated facets,
// joined with facts derived from the template code.
export type Variant = Omit<RawVariant, 'props'> & {
  props: VideoProps;
  tmpl: Template;
  format: Format;
  seconds: number;
  placement: string[];
  tone: Tone;
  roles: Role[];
  sceneLabels: string[];
  motion: string[];
  updatedAt: string;
};

export const vocab = manifest.vocab;

function formatOf(m: TemplateMeta): Format {
  const r = m.width / m.height;
  return r > 1.2 ? '16:9' : r < 0.7 ? '9:16' : r < 0.9 ? '4:5' : '1:1';
}

function luminance(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}

export const toneOf = (theme: Theme): Tone => (luminance(theme.background) > 0.4 ? 'Light' : 'Dark');

export const templates: Template[] = manifest.templates.map((t) => ({...t, meta: templateMeta[t.id]}));
const byId = new Map(templates.map((t) => [t.id, t]));

export const variants: Variant[] = manifest.variants.map((v) => {
  const tmpl = byId.get(v.template)!;
  const m = tmpl.meta;
  const format = formatOf(m);
  return {
    ...v,
    props: v.props as VideoProps,
    tmpl,
    format,
    seconds: Math.round(m.durationInFrames / m.fps),
    placement: (vocab.placement as Record<string, string[]>)[format] ?? [],
    tone: toneOf(v.props.theme as Theme),
    roles: Object.keys(v.props.texts) as Role[],
    sceneLabels: m.scenes.filter((s) => s.type !== 'transition').map((s) => SCENE_TYPES[s.type]),
    motion: m.motion,
    updatedAt: [v.createdAt, tmpl.createdAt].sort().at(-1)!,
  };
});

// Hidden variants keep old bookmarks, drafts, and share links resolvable.
export const galleryVariants = variants.filter((v) => !('hidden' in v && v.hidden));

// Analytics segment: directed music, directed silent (the v3 pilot), or legacy.
const DIRECTED_SILENT = new Set(['lowerthird', 'kinetic', 'endscreen', 'wordmark', 'ytintro']);
export const templateKind = (t: Template) =>
  (t as {music?: boolean}).music ? 'directed_music' : DIRECTED_SILENT.has(t.id) ? 'directed_silent' : 'legacy';

export function searchText(v: Variant) {
  return [
    v.title,
    v.creator,
    v.description,
    v.purpose,
    v.format,
    v.tone,
    v.tmpl.title,
    ...v.style,
    ...v.motion,
    ...v.placement,
    ...v.sceneLabels,
    ...v.keywords,
    ...Object.values(v.props.texts),
  ]
    .join(' ')
    .toLowerCase();
}
