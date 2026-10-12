import {z} from 'zod';
import manifest from '../catalog/manifest.json' with {type: 'json'};
import {templateMeta} from '../videos/meta.ts';
import {schemas} from '../videos/schemas.ts';
import {ENGINE_LABELS, engineOf} from '../videos/engine.ts';
import {ROLES, SCENE_TYPES, THEME_ROLES, roleHint, type Role, type VideoProps} from '../videos/vocab.ts';
import {mediaOf, mediaSlots, slotOptions} from '../videos/media/catalog.ts';
import {hideableRoles, isMusicSchema, scoreOf} from '../videos/music/schema.ts';
import {durationSeconds, scoreScenes} from '../videos/music/score.ts';
import {MAX_HANDOFF_CHARS, REPOSITORY, TEMPLATE_LICENSE, handoffPath, sourcePath, templateVersion} from './versions.ts';

type SpecInput = {
  site: string;
  kind: 'template' | 'share';
  id: string;
  url: string;
  title: string;
  variant: {id: string; template: string};
  props: VideoProps;
  version?: number;
  siteCommit?: string;
};

export function renderCommand(template: string) {
  // Music packages render silent video with their engine, then mux the generated score.
  if (scoreOf(templateMeta[template])) return engineOf(template) === 'hyperframes' ? 'node music/render.mjs' : 'npm ci && node music/render.mjs';
  return engineOf(template) === 'hyperframes'
    ? 'npx --yes hyperframes@0.8.146 render --variables-file variables.json --strict-variables -o out/video.mp4'
    : `npm ci && npx remotion render src/index.ts ${template} out/video.mp4 --props=props.json`;
}

// One machine-readable contract for templates and published shares. Agents can read it without JavaScript.
export function agentSpec({site, kind, id, url, title, variant, props, version, siteCommit}: SpecInput) {
  const meta = templateMeta[variant.template];
  const schema = schemas[variant.template];
  const engine = engineOf(variant.template);
  const pinned = templateVersion(variant.template, version);
  const latest = templateVersion(variant.template);
  const ratio = meta.width / meta.height;
  const texts = Object.fromEntries((Object.keys(schema.shape.texts.shape) as Role[]).map((role) =>
    [role, {label: ROLES[role].label, maxLength: ROLES[role].max, ...(roleHint(role) ? {format: roleHint(role)} : {}), current: props.texts[role]}]));
  const pkg = `${site}${sourcePath(variant.template, pinned.version)}`;
  const slots = mediaSlots(schema);
  const score = scoreOf(meta);
  const music = isMusicSchema(schema);
  const generation = manifest.templates.find((t) => t.id === variant.template)?.generation;
  if (!generation) throw new Error(`Missing generation metadata for template ${variant.template}.`);
  const old = pinned.version !== latest.version ? `&v=${pinned.version}` : '';
  return {
    schemaVersion: '1.3', kind, id, variantId: variant.id, template: variant.template, engine, engineLabel: ENGINE_LABELS[engine], title, url,
    editorUrl: `${site}/#/v/${variant.id}`,
    templateVersion: pinned.version, latestTemplateVersion: latest.version, sourceHash: pinned.hash,
    generation,
    ...(siteCommit ? {siteCommit} : {}),
    license: TEMPLATE_LICENSE, licenseUrl: `${site}/license/`, price: 'Free', attributionRequired: false,
    format: {
      aspectRatio: ratio > 1.2 ? '16:9' : ratio < 0.7 ? '9:16' : ratio < 0.9 ? '4:5' : '1:1',
      width: meta.width, height: meta.height, fps: meta.fps, durationInFrames: meta.durationInFrames,
      seconds: Math.round(meta.durationInFrames / meta.fps),
    },
    scenes: meta.scenes.map((s) => ({type: s.type, label: SCENE_TYPES[s.type], from: s.from, duration: s.duration, roles: s.roles})),
    props,
    editableFields: {
      texts,
      theme: Object.fromEntries(THEME_ROLES.map((role) => [role, {format: '#RRGGBB', current: props.theme[role]}])),
      ...(slots.length ? {media: Object.fromEntries(slots.map((slot) => [slot, {
        format: 'Image ID', options: slotOptions(schema, slot), current: mediaOf(props)?.[slot],
      }]))} : {}),
      ...(music ? {
        hidden: {format: 'List of optional text roles', options: hideableRoles(schema), current: (props as {hidden?: string[]}).hidden ?? [],
          note: 'Hidden roles disappear with their accent notes. brand, headline, and cta cannot be hidden.'},
        audio: {format: '{"enabled": boolean}', current: (props as {audio?: {enabled: boolean}}).audio ?? {enabled: true},
          note: 'When enabled, the MP4 includes the generated score as AAC 48 kHz stereo audio.'},
      } : {}),
    },
    ...(score ? {
      music: {
        bpm: score.bpm, meter: `${score.meter}/4`, bars: score.scenes.reduce((n, s) => n + s.bars, 0), seconds: durationSeconds(score),
        scenes: scoreScenes(score).map((s, i) => ({type: s.type, bars: score.scenes[i].bars, roles: s.roles})),
        accentSlots: score.slots.map((s) => ({role: s.role, scene: s.scene, beat: s.beat, beats: s.beats, maxHits: s.maxHits})),
        loudness: '-14 LUFS integrated, -1 dBTP ceiling', sampleRate: 48000,
        note: 'Text edits change only accent notes inside each role\'s slot. Tempo, bars, scene timing, and length never change.',
      },
    } : {}),
    jsonSchema: z.toJSONSchema(schema),
    handoff: {
      urlTemplate: `${site}/#/v/${variant.id}?props=<url-encoded props JSON>${old}`,
      example: `${site}${handoffPath(variant.id, props, old ? pinned.version : undefined)}`,
      maxEncodedLength: MAX_HANDOFF_CHARS,
      note: 'cliphou.se validates the props before it opens them. Invalid props are rejected and never saved.',
    },
    source: {
      package: pkg, packageSha256: pinned.sha256, templateVersion: pinned.version,
      renderCommand: renderCommand(variant.template),
      repository: REPOSITORY, path: engine === 'hyperframes' ? `src/hyperframes/${variant.template}/` : `src/videos/${variant.template}/`,
      contents: engine === 'hyperframes'
        ? `Native HyperFrames HTML composition, declared variables, local GSAP, local fonts, example variables, ${score ? 'the score, audio generator, generated WAV, render script, ' : ''}README, and MIT-0 license.`
        : `Remotion component, schema, scene metadata, shared helpers, exact dependency versions, lockfile, example props, ${score ? 'the score, audio generator, generated WAV, render script, ' : ''}and MIT-0 license. Fonts install from pinned Fontsource packages.`,
      note: engine === 'hyperframes'
        ? 'Rendering uses HyperFrames 0.8.146. GSAP and fonts keep their own licenses.'
        : 'Rendering uses Remotion, which has separate license terms: https://remotion.dev/license',
    },
    instructions: [
      'For text, color, and image edits, change only props.texts, props.theme, and props.media when present. Keep each text within maxLength, each color as #RRGGBB, and each image as one of its listed options.',
      ...(music ? ['For music templates, props.hidden lists optional roles to remove and props.audio.enabled turns the score on or off in the MP4.'] : []),
      'Return text and color edits as handoff.urlTemplate with the props JSON URL-encoded.',
      'For layout, motion, timing, or scene edits, download source.package, extract it, and edit the code.',
      engine === 'hyperframes'
        ? 'Render the source package with source.renderCommand. Edit variables.json to change text and colors.'
        : 'Render the source package with source.renderCommand. Edit props.json to change text and colors.',
      'Never send code through the handoff URL. It accepts props only.',
    ],
  };
}
