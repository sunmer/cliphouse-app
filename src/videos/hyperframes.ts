import type {Role, TemplateMeta, ThemeRole, VideoProps} from './vocab.ts';
import {ROLES, THEME_LABELS, THEME_ROLES} from './vocab.ts';
import type {Score} from './music/score.ts';

export const HYPERFRAMES_VERSION = '0.8.146';
export const GSAP_VERSION = '3.14.2';
export const RUNTIME_PATH = '/hyperframes/runtime/hyperframe.runtime.iife.js';

const textVariable = (role: Role) => `text_${role}`;
const themeVariable = (role: ThemeRole) => `theme_${role}`;
const hideVariable = (role: Role) => `hide_${role}`;
const scoreOf = (meta?: TemplateMeta) => (meta as {score?: Score} | undefined)?.score;
const hiddenOf = (props: VideoProps) => (props as {hidden?: Role[]}).hidden ?? [];

// Music templates add one boolean per optional role. Sound is not a variable: the composition renders silent video.
export function hyperframesVariables(props: VideoProps, meta?: TemplateMeta) {
  const score = scoreOf(meta);
  return {
    ...Object.fromEntries(Object.entries(props.texts).map(([role, value]) => [textVariable(role as Role), value])),
    ...Object.fromEntries(THEME_ROLES.map((role) => [themeVariable(role), props.theme[role]])),
    ...(score ? Object.fromEntries(score.optional.map((role) => [hideVariable(role), hiddenOf(props).includes(role)])) : {}),
  };
}

export function hyperframesDeclarations(props: VideoProps, meta?: TemplateMeta) {
  const score = scoreOf(meta);
  return [
    ...Object.entries(props.texts).map(([role, value]) => ({
      id: textVariable(role as Role), type: 'string', label: ROLES[role as Role].label, default: value,
      description: `Editable ${ROLES[role as Role].label.toLowerCase()} text, up to ${ROLES[role as Role].max} characters.`,
    })),
    ...THEME_ROLES.map((role) => ({id: themeVariable(role), type: 'color', label: THEME_LABELS[role], default: props.theme[role]})),
    ...(score ? score.optional.map((role) => ({
      id: hideVariable(role), type: 'boolean', label: `Hide ${ROLES[role].label.toLowerCase()}`, default: hiddenOf(props).includes(role),
      description: `Remove the ${ROLES[role].label.toLowerCase()} and its accents. Timing and length stay the same.`,
    })) : []),
  ];
}

export type HyperframesProject = {
  html: string;
  meta: TemplateMeta;
  props: VideoProps;
  assetBase: string;
  runtime?: string;
};

// The source keeps native HyperFrames variables. This only replaces defaults for a concrete edit.
export function bindHyperframes({html, meta, props, assetBase, runtime}: HyperframesProject) {
  const declarations = JSON.stringify(hyperframesDeclarations(props, meta)).replace(/'/g, '&#39;');
  const score = scoreOf(meta);
  let out = html
    .replace(/data-composition-variables='[^']*'/, `data-composition-variables='${declarations}'`)
    .replaceAll('__ASSET_BASE__', assetBase.replace(/\/$/, ''));
  // A function replacer inserts the text literally; "$" sequences in it are not patterns.
  if (score) out = out.replace('__SCORE__', () => JSON.stringify(score).replace(/</g, '\\u003c'));
  if (runtime) out = out.replace('</head>', `<script src="${runtime}"></script></head>`);
  return out;
}
