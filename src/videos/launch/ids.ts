// The launch set: HyperFrames templates for SaaS launches and changelogs. Their sound comes from the music library.
// Plain data, so engine.ts, build scripts, and the server can read it without loading templates.
export const LAUNCH_TEMPLATES = [
  'changelog', 'nowinbeta', 'versionreveal', 'shipped', 'featurelist', 'metricbump', 'integration',
  'pricingchange', 'waitlist', 'launchday', 'releasenotes', 'beforenow', 'customerquote',
  'apirelease', 'breakingchange', 'migration', 'codediff', 'githubstars', 'contributors', 'roadmap', 'benchmark', 'modelrelease', 'statusupdate', 'securityadvisory', 'docslaunch', 'hackathon', 'devtalk', 'opensource',
  'hookanswer', 'quickstart', 'howitworks', 'foundernote', 'weeklyshipped', 'whyswitch', 'stathook', 'youasked', 'featuredemo', 'launchweek', 'builtfor', 'workswith',
] as const;
export type LaunchTemplate = (typeof LAUNCH_TEMPLATES)[number];
export const isLaunch = (id: string) => (LAUNCH_TEMPLATES as readonly string[]).includes(id);
