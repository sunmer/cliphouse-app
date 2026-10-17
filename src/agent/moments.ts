import type {MarketingGoal} from './goals.ts';

// Release moments are agent-only search metadata: the reason a release is worth sharing. Keep IDs stable.
// They never appear in the gallery, template pages, editor, or SEO data.
export const RELEASE_MOMENTS = [
  {id: 'most-requested-feature', label: 'Most-requested feature shipped', goals: ['announce-feature', 'share-social-proof'],
    terms: ['most requested', 'top request', 'feature request', 'you asked', 'users asked', 'customers asked', 'upvoted', 'requested by'],
    requiredFacts: ['the shipped feature', 'evidence that users asked for it'], angle: 'Show the request first, then prove it shipped.',
    templates: ['youasked', 'shipped', 'featuredemo', 'featurelist', 'changelog']},
  {id: 'generally-available', label: 'Available to everyone', goals: ['launch-product', 'announce-feature'],
    terms: ['generally available', 'general availability', 'now available', 'available to everyone', 'out of beta', 'leaves beta', 'ga', 'public launch', 'rolled out to all'],
    requiredFacts: ['the feature or product', 'who can use it now'], angle: 'Make the access change the news: who can use it today.',
    templates: ['shipped', 'launchday', 'versionreveal', 'featuredemo', 'nowinbeta']},
  {id: 'limit-raised', label: 'A limit was raised or removed', goals: ['announce-feature', 'announce-pricing'],
    terms: ['higher limit', 'higher limits', 'limit raised', 'raised the limit', 'removed the limit', 'no limit', 'unlimited', 'quota', 'rate limit', 'max size', 'more storage'],
    requiredFacts: ['the old limit or constraint', 'the new limit'], angle: 'Contrast the old ceiling with the new room to work.',
    templates: ['beforenow', 'stathook', 'metricbump', 'pricingchange', 'changelog']},
  {id: 'faster', label: 'Something got faster', goals: ['announce-feature', 'celebrate-milestone'],
    terms: ['faster', 'speed', 'performance', 'latency', 'cold start', 'load time', 'build time', 'ms', 'seconds', 'benchmark'],
    requiredFacts: ['the task that got faster', 'a measured before and after or benchmark'], angle: 'Lead with the measured speedup and the task it improves.',
    templates: ['benchmark', 'stathook', 'beforenow', 'quickstart', 'metricbump']},
  {id: 'manual-step-removed', label: 'A manual step disappeared', goals: ['announce-feature'],
    terms: ['manual step', 'no more copy', 'automatic', 'automatically', 'automated', 'one click', 'one command', 'no config', 'zero config', 'by hand'],
    requiredFacts: ['the step users no longer do', 'what happens automatically now'], angle: 'Show the chore, then show it gone.',
    templates: ['beforenow', 'codediff', 'howitworks', 'quickstart', 'youasked']},
  {id: 'integration-live', label: 'An integration went live', goals: ['announce-integration'],
    terms: ['integration', 'integrates with', 'connects to', 'connect with', 'plugin', 'webhook', 'works with', 'sync with'],
    requiredFacts: ['the connected tool', 'what users can do with the connection'], angle: 'Name the tool users already use, then the workflow it unlocks.',
    templates: ['integration', 'workswith', 'partnership', 'apirelease', 'featuredemo']},
  {id: 'pricing-changed', label: 'Pricing changed', goals: ['announce-pricing'],
    terms: ['pricing', 'price', 'new plan', 'plans', 'free tier', 'cheaper', 'discount', 'billing', 'per seat'],
    requiredFacts: ['the plan or price change', 'who it affects'], angle: 'State the new price clearly and what customers get.',
    templates: ['pricingchange', 'pricing', 'comparison', 'whyswitch', 'stathook']},
  {id: 'reliability-fix', label: 'A reliability fix landed', goals: ['share-update'],
    terms: ['bug fix', 'bug fixes', 'fixed', 'fixes', 'reliability', 'stability', 'crash', 'outage', 'incident', 'flaky', 'error rate', 'uptime'],
    requiredFacts: ['the problem users saw', 'what is fixed now'], angle: 'Acknowledge the pain plainly, then show the fix.',
    templates: ['statusupdate', 'codediff', 'changelog', 'releasenotes', 'beforenow']},
  {id: 'new-language-or-region', label: 'New language or region', goals: ['launch-product', 'announce-feature'],
    terms: ['new language', 'localized', 'localization', 'translation', 'translated', 'i18n', 'now in', 'new country', 'new region', 'launch in', 'available in'],
    requiredFacts: ['the language, country, or region', 'what is now available there'], angle: 'Speak to the new audience and say what they can use today.',
    templates: ['announcement', 'launchday', 'builtfor', 'shipped', 'featurelist']},
  {id: 'new-platform', label: 'New platform', goals: ['launch-product', 'announce-feature'],
    terms: ['ios', 'android', 'mobile app', 'desktop app', 'windows', 'macos', 'linux', 'cli', 'sdk', 'browser extension', 'new platform'],
    requiredFacts: ['the new platform', 'what users can do there'], angle: 'Show where the product now runs and the first thing to try there.',
    templates: ['apppromo', 'launchday', 'workswith', 'quickstart', 'apirelease']},
  {id: 'free-resource', label: 'Free tool or resource released', goals: ['launch-product', 'introduce-brand'],
    terms: ['open source', 'open sourced', 'free tool', 'free template', 'starter kit', 'boilerplate', 'guide', 'docs', 'resource', 'mit license'],
    requiredFacts: ['the free tool or resource', 'what users can do with it'], angle: 'Make the giveaway useful: what it saves someone today.',
    templates: ['opensource', 'docslaunch', 'quickstart', 'launchday', 'featurelist']},
  {id: 'milestone', label: 'A real milestone was reached', goals: ['celebrate-milestone'],
    terms: ['milestone', 'reached', 'crossed', 'stars', 'users', 'customers', 'downloads', 'installs', 'anniversary', 'record'],
    requiredFacts: ['the measured milestone', 'what it means for users or the community'], angle: 'Lead with the real number, then thank the people behind it.',
    templates: ['metricbump', 'githubstars', 'stathook', 'contributors', 'progress']},
] as const satisfies readonly {
  id: string; label: string; goals: readonly MarketingGoal[]; terms: readonly string[]; requiredFacts: readonly string[]; angle: string; templates: readonly string[];
}[];

export type ReleaseMoment = (typeof RELEASE_MOMENTS)[number]['id'];
export const MOMENT_IDS = RELEASE_MOMENTS.map((moment) => moment.id) as [ReleaseMoment, ...ReleaseMoment[]];
export const momentOf = (id: ReleaseMoment) => RELEASE_MOMENTS.find((moment) => moment.id === id)!;
export const momentsForTemplate = (template: string) => RELEASE_MOMENTS.filter((moment) => (moment.templates as readonly string[]).includes(template)).map((moment) => moment.id);
export const momentRank = (id: ReleaseMoment, template: string) => (momentOf(id).templates as readonly string[]).indexOf(template);
export const momentHint = (id: ReleaseMoment) => {
  const moment = momentOf(id);
  return {id: moment.id, label: moment.label, requiredFacts: [...moment.requiredFacts], angle: moment.angle, goals: [...moment.goals]};
};

// Query hints only: inferred moments never filter search results.
export function inferMoments(query = ''): ReleaseMoment[] {
  const text = ` ${query.toLowerCase().replace(/[^a-z0-9]+/g, ' ')} `;
  return RELEASE_MOMENTS.map((moment, order) => ({id: moment.id, order, score: moment.terms.reduce((n, term) => n + (text.includes(` ${term} `) ? term.split(' ').length : 0), 0)}))
    .filter((item) => item.score > 0).sort((a, b) => b.score - a.score || a.order - b.order).slice(0, 3).map((item) => item.id);
}
