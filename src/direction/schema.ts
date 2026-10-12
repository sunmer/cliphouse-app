// The direction record every music template must ship with. The production build fails without an
// approved one (scripts/check-direction.mjs). Plain data and zod so build scripts can read it.
import {z} from 'zod';

const finding = z.object({
  /** Which gate or review produced it. */
  source: z.enum(['plan', 'visual-review', 'audio-review', 'gate', 'listening']),
  issue: z.string().min(1),
  fix: z.string().min(1),
}).strict();

export const directionSchema = z.object({
  template: z.string().regex(/^[a-z0-9]+$/),
  engine: z.enum(['remotion', 'hyperframes']),
  styleGuide: z.literal('docs/direction.md'),
  concept: z.string().min(12),
  /** One line per beat range: what lands. Beats are absolute, 0-based. */
  beatMap: z.array(z.object({beats: z.tuple([z.number(), z.number()]), lands: z.string().min(1)}).strict()).min(4),
  /** The shared element that carries each scene handoff. One entry per scene boundary. */
  handoffs: z.array(z.object({from: z.number().int(), to: z.number().int(), element: z.string().min(1)}).strict()),
  sound: z.object({
    concept: z.string().min(12),
    /** What each cue means in the picture. Keys are instruments or slot roles. */
    cueMap: z.record(z.string(), z.string().min(1)),
  }).strict(),
  findings: z.array(finding),
  generation: z.object({
    model: z.string().min(1), modelId: z.string().min(1), provider: z.string().min(1),
    effort: z.enum(['low', 'medium', 'high', 'xhigh', 'max']),
    /** USD spent on model calls for this template, or null when the work was not metered per template. */
    costUsd: z.number().min(0).nullable(),
    rounds: z.array(z.enum(['plan', 'review', 'repair'])).min(1),
  }).strict(),
  approval: z.object({
    status: z.enum(['draft', 'approved', 'rejected']),
    /** Gates passed at approval time, by name. */
    gates: z.array(z.string()),
    /** The final mix must be listened to before it ships. */
    listened: z.boolean(),
    /** Operator sign-off that ships before the listening review, for example to review in production. */
    waiver: z.string().min(1).optional(),
    by: z.string().optional(),
    at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  }).strict(),
}).strict();

export type Direction = z.infer<typeof directionSchema>;

/** The gates an approved record must list. Matches scripts/check-direction.mjs. */
export const REQUIRED_GATES = ['score', 'banned-patterns', 'beat-sheet', 'text-sheets', 'hidden-roles', 'readability', 'motion-every-beat', 'loop', 'audio', 'export-sync'] as const;
