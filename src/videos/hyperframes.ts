import type {Role, TemplateMeta, ThemeRole, VideoProps} from './vocab.ts';
import {ROLES, THEME_LABELS, THEME_ROLES} from './vocab.ts';

export const HYPERFRAMES_VERSION = '0.8.146';
export const GSAP_VERSION = '3.14.2';
export const RUNTIME_PATH = '/hyperframes/runtime/hyperframe.runtime.iife.js';

const textVariable = (role: Role) => `text_${role}`;
const themeVariable = (role: ThemeRole) => `theme_${role}`;

export function hyperframesVariables(props: VideoProps) {
  return {
    ...Object.fromEntries(Object.entries(props.texts).map(([role, value]) => [textVariable(role as Role), value])),
    ...Object.fromEntries(THEME_ROLES.map((role) => [themeVariable(role), props.theme[role]])),
  };
}

export function hyperframesDeclarations(props: VideoProps) {
  return [
    ...Object.entries(props.texts).map(([role, value]) => ({
      id: textVariable(role as Role), type: 'string', label: ROLES[role as Role].label, default: value,
      description: `Editable ${ROLES[role as Role].label.toLowerCase()} text, up to ${ROLES[role as Role].max} characters.`,
    })),
    ...THEME_ROLES.map((role) => ({id: themeVariable(role), type: 'color', label: THEME_LABELS[role], default: props.theme[role]})),
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
export function bindHyperframes({html, props, assetBase, runtime}: HyperframesProject) {
  const declarations = JSON.stringify(hyperframesDeclarations(props)).replace(/'/g, '&#39;');
  let out = html
    .replace(/data-composition-variables='[^']*'/, `data-composition-variables='${declarations}'`)
    .replaceAll('__ASSET_BASE__', assetBase.replace(/\/$/, ''));
  if (runtime) out = out.replace('</head>', `<script src="${runtime}"></script></head>`);
  return out;
}
