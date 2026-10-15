export const VIDEO_ENGINES = ['remotion', 'hyperframes'] as const;
export type VideoEngine = (typeof VIDEO_ENGINES)[number];
export const ENGINE_LABELS: Record<VideoEngine, string> = {remotion: 'Remotion', hyperframes: 'HyperFrames'};
// Build scripts read this list as literal JSON, so keep it a plain array of quoted ids. The launch set is
// the last entries and must match src/videos/launch/ids.ts (checked in scripts/launch.test.ts).
export const HYPERFRAMES_TEMPLATES = ['signal', 'ringstat', 'eventpass', 'pullquote', 'pricedrop', 'featuredrop', 'eventcountdown', 'changelog', 'nowinbeta', 'versionreveal', 'shipped', 'featurelist', 'metricbump', 'integration', 'pricingchange', 'waitlist', 'launchday', 'releasenotes', 'beforenow', 'customerquote', 'apirelease', 'breakingchange', 'migration', 'codediff', 'githubstars', 'contributors', 'roadmap', 'benchmark', 'modelrelease', 'statusupdate', 'securityadvisory', 'docslaunch', 'hackathon', 'devtalk', 'opensource'] as const;
export const engineOf = (template: string): VideoEngine => (HYPERFRAMES_TEMPLATES as readonly string[]).includes(template) ? 'hyperframes' : 'remotion';
