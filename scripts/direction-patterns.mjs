// Banned implementation patterns for direction-gated templates, with the narrow signature-effect blur exceptions.

export const BANNED = [
  [/@keyframes|animation\s*:|animation-name|transition\s*:/, 'CSS animations or transitions'],
  [/\bsetTimeout\b|\bsetInterval\b|\brequestAnimationFrame\b/, 'timers'],
  [/Math\.random\s*\(/, 'unseeded randomness'],
  [/Date\.now\s*\(|performance\.now\s*\(|new Date\s*\(/, 'clocks'],
  [/\bblur\s*\(/, 'blur filters'],
  [/glow|shake|rgb-?split|chromatic|scanline|lens-?flare|confetti/i, 'a named glow, shake, RGB-split, or other banned effect'],
  [/repeat\s*:\s*-?\d|yoyo\s*:\s*true/, 'repeating or yoyo GSAP tweens'],
  [/opacity\s*:\s*0\s*}\s*,\s*{\s*opacity\s*:\s*1|crossfade/i, 'opacity crossfades'],
];

// Remotion templates import WhipPan and GlassCaption, which hold the only allowed uses.
export const EFFECT_FILE = 'src/videos/effects/effects.tsx';
const EFFECT_FILE_BLURS = ['blur(${amount.toFixed(1)}px)', 'blur(18px) saturate(1.3)'];
// HyperFrames templates may write only these exact declarations, inside these two class rules.
const HF_EFFECT_RULES = [
  [/\.cliphouse-glass\s*\{[^{}]*\}/g, /^(?:-webkit-)?backdrop-filter\s*:\s*blur\(18px\) saturate\(1\.3\)$/],
  [/\.cliphouse-whip\s*\{[^{}]*\}/g, /^filter\s*:\s*blur\(var\(--whip-blur,\s*0px\)\)$/],
];

export const usesEffects = (text) => /from '\.\.\/effects\/effects'/.test(text);
const stripComments = (text) => text.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');

function allowEffectBlur(file, text) {
  if (file === EFFECT_FILE) return EFFECT_FILE_BLURS.reduce((t, allowed) => t.replaceAll(allowed, ''), text);
  if (!file.endsWith('.html')) return text;
  // Inside each effect rule, drop only its exact declaration. Any other blur is still caught.
  return HF_EFFECT_RULES.reduce((t, [rule, allowed]) => t.replace(rule, (css) => {
    const open = css.indexOf('{');
    const body = css.slice(open + 1, -1).split(';').filter((d) => !allowed.test(d.trim())).join(';');
    return `${css.slice(0, open + 1)}${body}}`;
  }), text);
}

/** The banned-pattern labels found in one source file. */
export function bannedIn(file, source) {
  const text = allowEffectBlur(file, stripComments(source));
  return BANNED.filter(([pattern]) => pattern.test(text)).map(([, label]) => label);
}
