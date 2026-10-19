import type {MarketingGoal} from './goals.ts';

// Marketing work that agents show before previews. Keep IDs stable: they are part of the MCP and skill contract.
export const MARKETING_JOBS = [
  {id: 'pick-highlights', stage: 'analysis', label: 'Pick the highlights', use: 'choose the release changes worth showing', example: 'Finding the most important 2.1 changes'},
  {id: 'explain-product', stage: 'analysis', label: 'Explain the product', use: 'state what the project does in plain words', example: 'Finding what makes RelayKit useful'},
  {id: 'find-proof', stage: 'analysis', label: 'Find the proof', use: 'select real numbers, benchmarks, or quotes from the project', example: 'Checking benchmark results to use as proof'},
  {id: 'fit-audience', stage: 'shaping', label: 'Fit the audience', use: 'write for the people who will use it', example: 'Framing it for small project teams'},
  {id: 'features-to-benefits', stage: 'shaping', label: 'Turn features into benefits', use: 'say what each change gives the user', example: 'Turning API changes into user benefits'},
  {id: 'choose-hook', stage: 'shaping', label: 'Choose the hook', use: 'open with a problem, question, real number, or before-and-after', example: 'Opening with the missed-call problem'},
  {id: 'set-next-step', stage: 'shaping', label: 'Set the next step', use: 'choose the action: install, upgrade, join, or try', example: 'Ending with the install command'},
] as const;

export type MarketingJob = (typeof MARKETING_JOBS)[number]['id'];
export const JOB_IDS = MARKETING_JOBS.map((job) => job.id) as [MarketingJob, ...MarketingJob[]];

export const JOB_DEFAULTS: Record<MarketingGoal, readonly [MarketingJob, readonly MarketingJob[]]> = {
  'launch-product': ['explain-product', ['fit-audience', 'choose-hook']],
  'announce-feature': ['pick-highlights', ['features-to-benefits', 'fit-audience']],
  'share-update': ['pick-highlights', ['features-to-benefits', 'fit-audience']],
  'grow-waitlist': ['explain-product', ['choose-hook', 'set-next-step']],
  'announce-integration': ['pick-highlights', ['features-to-benefits', 'set-next-step']],
  'announce-pricing': ['pick-highlights', ['fit-audience', 'set-next-step']],
  'celebrate-milestone': ['find-proof', ['choose-hook']],
  'share-social-proof': ['find-proof', ['choose-hook', 'fit-audience']],
  'promote-event': ['explain-product', ['choose-hook', 'set-next-step']],
  'introduce-brand': ['explain-product', ['fit-audience', 'choose-hook']],
  'run-promotion': ['pick-highlights', ['choose-hook', 'set-next-step']],
  'hire-team': ['explain-product', ['fit-audience', 'set-next-step']],
};

export const jobInstructions = () => MARKETING_JOBS.map((job) => `${job.id} (${job.stage}: ${job.use}; example "${job.example}")`).join(', ');
export const jobDefaults = () => Object.entries(JOB_DEFAULTS).map(([goal, [first, second]]) => `${goal}: ${first} then ${second.join(' or ')}`).join('; ');
