import type {TemplateMeta, VideoSchema} from './contract';
import {templateMeta} from './meta';
import {currentVersion} from '../agent/versions';
import {remotionCompositions, type RemotionCompositionDef} from './remotionRegistry';
import {signalSchema} from './signal/schema';
import {ringstatSchema} from './ringstat/schema';
import {eventpassSchema} from './eventpass/schema';
import {pullquoteSchema} from './pullquote/schema';
import {pricedropSchema} from './pricedrop/schema';
import {featuredropSchema} from './featuredrop/schema';
import {eventcountdownSchema} from './eventcountdown/schema';
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
  featuredrop: hyperframes('featuredrop', featuredropSchema), eventcountdown: hyperframes('eventcountdown', eventcountdownSchema),
};

// Only the current version of each template exists. Older saved edits are not kept.
export function compositionFor(template: string, version = currentVersion(template)): CompositionDef {
  if (version !== currentVersion(template)) throw new Error('This video uses a template version that this site no longer includes.');
  return compositions[template];
}
