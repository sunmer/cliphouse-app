// Shared motion vocabulary for richer video prompts. Plain data and zod so scripts and records can use it.
import {z} from 'zod';

export const EFFECTS = {
  'crash-zoom': {
    label: 'Crash zoom', placement: 'emphasis', frames: [8, 18],
    intent: 'Make one word, number, or object hit hard.',
    rule: 'Use once on the main message or stat. Scale from 1.8-2.6 to 1 with a strong ease-out. Short speed lines are allowed while it moves.',
  },
  'whip-pan': {
    label: 'Whip pan', placement: 'transition', frames: [8, 14],
    intent: 'Move fast between related ideas.',
    rule: 'Use at most twice and keep one direction. Push the outgoing and incoming scenes across the frame. Directional motion blur is allowed only while moving.',
  },
  'zoom-through': {
    label: 'Zoom-through', placement: 'transition', frames: [10, 18],
    intent: 'Turn one visible detail into the next scene.',
    rule: 'Start from a bar, card, or word. Scale through it until its color fills the frame, then reveal the next scene from that color.',
  },
  'kinetic-type': {
    label: 'Kinetic type', placement: 'text', frames: [12, 30],
    intent: 'Give the copy rhythm and hierarchy.',
    rule: 'Animate words or lines from masks, then hold the full text still for at least 30 frames. Fit the maximum text length.',
  },
  'glass-captions': {
    label: 'Glass captions', placement: 'text', frames: [8, 14],
    intent: 'Add a short caption over a busy picture without hiding it.',
    rule: 'Use one short caption at a time on a translucent surface with background blur. Keep text contrast high and use a solid fallback on mobile Safari.',
  },
  'chart-grow': {
    label: 'Chart grow', placement: 'data', frames: [18, 36],
    intent: 'Make a change in data easy to see.',
    rule: 'Use 2-6 values and highlight one. Grow bars from a baseline and count labels with the bars.',
  },
  'split-screen': {
    label: 'Split screen', placement: 'layout', frames: [10, 18],
    intent: 'Compare two states at the same time.',
    rule: 'Use two panes with one clear difference. Reveal the panes from the dividing line and keep both labels readable.',
  },
  'glitch-cut': {
    label: 'Glitch cut', placement: 'transition', frames: [4, 8],
    intent: 'Mark an abrupt change, such as a reveal or an old-to-new switch.',
    rule: 'Use once, only at the cut. Use seeded slice offsets and brief theme-color channel offsets. Never glitch readable text after the cut.',
  },
  'pull-back-reveal': {
    label: 'Pull-back reveal', placement: 'camera', frames: [24, 45],
    intent: 'Start on a detail, then show the full context.',
    rule: 'Use near the end for the final message or CTA. Start close and cropped, then pull back with one eased move. Never reverse it.',
  },
} as const;

export type EffectId = keyof typeof EFFECTS;
export const EFFECT_IDS = Object.keys(EFFECTS) as [EffectId, ...EffectId[]];

export const effectChoiceSchema = z.object({
  id: z.enum(EFFECT_IDS),
  /** Where it is used, for example "scene 2 to 3" or "the stat". */
  at: z.string().min(1),
  /** The story reason for this effect. */
  why: z.string().min(8),
}).strict();

export type EffectChoice = z.infer<typeof effectChoiceSchema>;

/** Prompt text for a brief. With no choices, it offers the full vocabulary and asks for two or three. */
export function effectPrompt(choices: readonly EffectChoice[] = []): string {
  const list = choices.length
    ? choices.map((c) => `- ${EFFECTS[c.id].label} at ${c.at}: ${c.why}. ${EFFECTS[c.id].rule} Duration ${EFFECTS[c.id].frames.join('-')} frames.`)
    : EFFECT_IDS.map((id) => `- ${id}: ${EFFECTS[id].intent} ${EFFECTS[id].rule}`);
  return `${choices.length ? 'Use these signature effects:' : 'Choose two or three signature effects from this list, and give a story reason for each:'}
${list.join('\n')}
Use every effect for a reason. Keep text readable, still, and unclipped for at least 30 frames after its effect.`;
}
