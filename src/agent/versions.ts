import versionsJson from '../videos/versions.json' with {type: 'json'};

export const SITE = 'https://cliphou.se';
export const REPOSITORY = 'https://github.com/sunmer/cliphouse-app';
export const TEMPLATE_LICENSE = 'MIT-0';
/** Longest accepted encoded `props` value in a handoff URL. */
export const MAX_HANDOFF_CHARS = 8000;

export type TemplateVersion = {version: number; hash: string; sha256: string; createdAt: string};
// Written by `npm run sources`. Every entry has an immutable package in public/source.
export const versions = versionsJson as Record<string, TemplateVersion[]>;

export function templateVersion(template: string, version?: number): TemplateVersion {
  const list = versions[template];
  const entry = version === undefined ? list?.at(-1) : list?.find((v) => v.version === version);
  if (!entry) throw new Error(`Unknown version ${version ?? 'latest'} for template ${template}.`);
  return entry;
}
export const currentVersion = (template: string) => templateVersion(template).version;
export const sourcePath = (template: string, version: number) => `/source/${template}/v${version}.tar.gz`;
export const specPath = (variantId: string) => `/templates/${variantId}/agent.json`;
export const handoffPath = (variantId: string, props: unknown, version?: number) =>
  `/#/v/${variantId}?props=${encodeURIComponent(JSON.stringify(props))}${version ? `&v=${version}` : ''}`;
