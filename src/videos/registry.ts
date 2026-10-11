import type {TemplateMeta, VideoSchema} from './contract';
import {templateMeta} from './meta';
import {legacy} from './legacy';
import {currentVersion} from '../agent/versions';
import {remotionCompositions, type RemotionCompositionDef} from './remotionRegistry';
import {signalSchema} from './signal/schema';
import {ringstatSchema} from './ringstat/schema';
import {eventpassSchema} from './eventpass/schema';
import {pullquoteSchema} from './pullquote/schema';
import {pricedropSchema} from './pricedrop/schema';
import {hyperframesSources} from './hyperframesSources';

export type {RemotionCompositionDef};
export type HyperframesCompositionDef = TemplateMeta & {engine: 'hyperframes'; html: string; schema: VideoSchema};
export type CompositionDef = RemotionCompositionDef | HyperframesCompositionDef;
const hyperframes = (id: string, schema: unknown): HyperframesCompositionDef => ({...templateMeta[id], engine: 'hyperframes', html: hyperframesSources[id], schema: schema as VideoSchema});

// Catalog variants reference these by id and stay locked to that engine.
export const compositions: Record<string, CompositionDef> = {
  ...remotionCompositions,
  signal: hyperframes('signal', signalSchema), ringstat: hyperframes('ringstat', ringstatSchema),
  eventpass: hyperframes('eventpass', eventpassSchema), pullquote: hyperframes('pullquote', pullquoteSchema),
  pricedrop: hyperframes('pricedrop', pricedropSchema),
};

// Saved and shared videos keep the template version they were made with.
export function compositionFor(template: string, version = currentVersion(template)): CompositionDef {
  if (version === currentVersion(template)) return compositions[template];
  const old = legacy[template]?.[version];
  if (!old) throw new Error('This video uses a template version that this site no longer includes.');
  return {...old, engine: 'remotion'};
}
