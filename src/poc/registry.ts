// Hidden POC entries. They are not in the catalog manifest, so the gallery, SEO pages,
// source packages, and versions.json never see them. Only their direct editor links open them.
import type {Variant} from '../catalog/catalog';
import {variants} from '../catalog/catalog';
import type {RemotionCompositionDef} from '../videos/remotionRegistry';
import type {VideoProps, VideoSchema} from '../videos/contract';
import type {ListGroup} from './lists';
import {TickerList} from './tickerlist/TickerList';
import {tickerList, tickerListMeta} from './tickerlist/meta';
import {tickerListSchema} from './tickerlist/schema';
import {TickerBeat} from './tickerbeat/TickerBeat';
import {tickerBeatList, tickerBeatMeta} from './tickerbeat/meta';
import {tickerBeatSchema} from './tickerbeat/schema';

export type PocEntry = {variant: Variant; composition: RemotionCompositionDef; lists: ListGroup[]; sound?: true};

const base = variants.find((v) => v.id === 'ticker-flashsale')!;
const entry = (id: string, title: string, meta: typeof tickerListMeta, component: React.FC<never>, schema: unknown, lists: ListGroup[], props: VideoProps, sound?: true): PocEntry => ({
  variant: {...base, id, title, template: meta.id, props, seconds: Math.round(meta.durationInFrames / meta.fps), tmpl: {...base.tmpl, id: meta.id, meta}},
  composition: {...meta, component: component as RemotionCompositionDef['component'], engine: 'remotion', schema: schema as VideoSchema},
  lists, sound,
});

export const pocEntries: Record<string, PocEntry> = {
  'poc-ticker-list': entry('poc-ticker-list', 'Ticker (list editing)', tickerListMeta, TickerList as React.FC<never>, tickerListSchema, [tickerList],
    {...base.props, hidden: []} as VideoProps),
  'poc-ticker-beat': entry('poc-ticker-beat', 'Ticker Beat', tickerBeatMeta, TickerBeat as React.FC<never>, tickerBeatSchema, [tickerBeatList],
    {...base.props, hidden: [], audio: {enabled: true}} as VideoProps, true),
};
