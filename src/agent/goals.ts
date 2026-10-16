// Marketing goals that agents use to choose a video. Keep IDs stable: they are part of the MCP and skill contract.
export const MARKETING_GOALS = [
  {id: 'launch-product', label: 'Launch a product', terms: ['launch', 'new product', 'new app', 'release', 'ship', 'go live', 'now live', 'open source']},
  {id: 'announce-feature', label: 'Announce a feature', terms: ['feature', 'new feature', 'shipped', 'api', 'sdk', 'model', 'docs']},
  {id: 'share-update', label: 'Share an update', terms: ['changelog', 'release notes', 'version', 'update', 'roadmap', 'migration', 'incident', 'security']},
  {id: 'grow-waitlist', label: 'Grow a waitlist', terms: ['waitlist', 'wait list', 'coming soon', 'teaser', 'early access', 'countdown']},
  {id: 'announce-integration', label: 'Announce an integration', terms: ['integration', 'integrates', 'partner', 'partnership', 'connect']},
  {id: 'announce-pricing', label: 'Announce pricing', terms: ['pricing', 'price', 'plans', 'plan', 'free tier', 'comparison']},
  {id: 'celebrate-milestone', label: 'Celebrate a milestone', terms: ['milestone', 'metric', 'stats', 'growth', 'users', 'stars', 'benchmark', 'anniversary']},
  {id: 'share-social-proof', label: 'Share social proof', terms: ['testimonial', 'customer', 'case study', 'review', 'quote', 'social proof']},
  {id: 'promote-event', label: 'Promote an event', terms: ['event', 'webinar', 'livestream', 'hackathon', 'talk', 'conference', 'tickets']},
  {id: 'introduce-brand', label: 'Introduce a brand', terms: ['brand', 'logo', 'intro', 'reveal', 'company', 'manifesto']},
  {id: 'run-promotion', label: 'Run a promotion', terms: ['promotion', 'promo', 'sale', 'discount', 'offer', 'giveaway', 'drop']},
  {id: 'hire-team', label: 'Hire for the team', terms: ['hiring', 'jobs', 'careers', 'recruit', 'new hire', 'team']},
] as const;

export type MarketingGoal = (typeof MARKETING_GOALS)[number]['id'];
export const GOAL_IDS = MARKETING_GOALS.map((goal) => goal.id) as [MarketingGoal, ...MarketingGoal[]];
export const goalLabel = (goal: MarketingGoal) => MARKETING_GOALS.find((item) => item.id === goal)!.label;

// Bump when an agent-visible MCP tool, argument, result field, or workflow changes.
export const AGENT_CONTRACT_VERSION = '2026-10-16.2';
