export const VIDEO_ENGINES = ['remotion', 'hyperframes'] as const;
export type VideoEngine = (typeof VIDEO_ENGINES)[number];
export const ENGINE_LABELS: Record<VideoEngine, string> = {remotion: 'Remotion', hyperframes: 'HyperFrames'};
export const HYPERFRAMES_TEMPLATES = ['signal', 'ringstat', 'eventpass', 'pullquote', 'pricedrop', 'featuredrop', 'eventcountdown'] as const;
export const engineOf = (template: string): VideoEngine => (HYPERFRAMES_TEMPLATES as readonly string[]).includes(template) ? 'hyperframes' : 'remotion';
