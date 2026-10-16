import type {Role, TemplateMeta, ThemeRole, VideoProps} from './vocab.ts';
import {ROLES, THEME_LABELS, THEME_ROLES} from './vocab.ts';
import type {Score} from './music/score.ts';
import type {BeatScore} from './beat/score.ts';
import {logoOf, type Logo} from './logo.ts';

export const HYPERFRAMES_VERSION = '0.8.146';
export const GSAP_VERSION = '3.14.2';
export const RUNTIME_PATH = '/hyperframes/runtime/hyperframe.runtime.iife.js';

const textVariable = (role: Role) => `text_${role}`;
const themeVariable = (role: ThemeRole) => `theme_${role}`;
const hideVariable = (role: Role) => `hide_${role}`;
const scoreOf = (meta?: TemplateMeta) => (meta as {score?: Score} | undefined)?.score;
const isBeat = (score: unknown): score is BeatScore => !!score && Object.hasOwn(score as object, 'beatFrames');
const hiddenOf = (props: VideoProps) => (props as {hidden?: Role[]}).hidden ?? [];

// Music templates add one boolean per optional role. Beat templates have no hidden roles: the list text sets the count.
// Sound is not a variable: the composition renders silent video.
export function hyperframesVariables(props: VideoProps, meta?: TemplateMeta) {
  const raw = scoreOf(meta);
  const score = isBeat(raw) ? undefined : raw;
  return {
    ...Object.fromEntries(Object.entries(props.texts).map(([role, value]) => [textVariable(role as Role), value])),
    ...Object.fromEntries(THEME_ROLES.map((role) => [themeVariable(role), props.theme[role]])),
    ...(score ? Object.fromEntries(score.optional.map((role) => [hideVariable(role), hiddenOf(props).includes(role)])) : {}),
  };
}

export function hyperframesDeclarations(props: VideoProps, meta?: TemplateMeta) {
  const raw = scoreOf(meta);
  const score = isBeat(raw) ? undefined : raw;
  return [
    ...Object.entries(props.texts).map(([role, value]) => ({
      id: textVariable(role as Role), type: 'string', label: ROLES[role as Role].label, default: value,
      description: `Editable ${ROLES[role as Role].label.toLowerCase()} text, up to ${ROLES[role as Role].max} characters.`,
    })),
    ...THEME_ROLES.map((role) => ({id: themeVariable(role), type: 'color', label: THEME_LABELS[role], default: props.theme[role]})),
    ...(score ? score.optional.map((role) => ({
      id: hideVariable(role), type: 'boolean', label: `Hide ${ROLES[role].label.toLowerCase()}`, default: hiddenOf(props).includes(role),
      description: `Remove the ${ROLES[role].label.toLowerCase()} and its accents. Timing and length stay the same.`,
    })) : []),
  ];
}

export type HyperframesProject = {
  html: string;
  meta: TemplateMeta;
  props: VideoProps;
  assetBase: string;
  runtime?: string;
  /** URL of the logo image for this document. Required when the props carry a logo. */
  logoSrc?: (id: string) => string;
};

export type LogoBinding = Logo & {src: string; alt: string};
export const logoBinding = (props: VideoProps, src: (id: string) => string): LogoBinding | null => {
  const logo = logoOf(props);
  return logo ? {...logo, src: src(logo.id), alt: props.texts.brand ?? ''} : null;
};

// Logo runtime, injected at bind time so template sources and their packages stay unchanged.
// It wraps CliphouseBeat.mount (inserted right after the beat runtime script): after the runtime fills the brand word masks and fits the text, each
// brand element gets the logo as its single masked "word", so the template's own brand motion moves it.
// The logo is one em tall (the fitted brand size), scaled down to fit the element. Mono logos are a
// mask in currentColor, so they take the template's brand color on every theme. A hidden <img> holds
// the image, so the HyperFrames runtime waits for it to decode before it captures a frame.
export const LOGO_RUNTIME = `(function () {
  function px(n) { return Math.max(1, Math.round(n)) + 'px'; }
  function apply() {
    var logo = window.__cliphouseLogo;
    if (!logo) return;
    var hold = document.getElementById('cliphouse-logo-hold');
    if (!hold) {
      hold = document.createElement('img');
      hold.id = 'cliphouse-logo-hold';
      hold.alt = '';
      hold.setAttribute('aria-hidden', 'true');
      hold.style.cssText = 'position:absolute;left:0;top:0;width:1px;height:1px;opacity:0;pointer-events:none';
      document.body.appendChild(hold);
    }
    if (hold.getAttribute('src') !== logo.src) hold.setAttribute('src', logo.src);
    var els = document.querySelectorAll('[data-beat-text="brand"]');
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      var size = parseFloat(getComputedStyle(el).fontSize) || 40;
      var h = size;
      if (el.clientHeight > 0) h = Math.min(h, el.clientHeight);
      var w = h * logo.ratio;
      if (el.clientWidth > 0 && w > el.clientWidth) { w = el.clientWidth; h = w / logo.ratio; }
      var mask = document.createElement('span');
      mask.className = 'wmask';
      var word = document.createElement('span');
      word.className = 'w';
      var mark;
      if (logo.mono) {
        mark = document.createElement('span');
        mark.setAttribute('role', 'img');
        mark.setAttribute('aria-label', logo.alt);
        var url = 'url("' + logo.src + '")';
        mark.style.cssText = 'display:block;background:currentColor;-webkit-mask:' + url + ' left center / contain no-repeat;mask:' + url + ' left center / contain no-repeat';
      } else {
        mark = document.createElement('img');
        mark.src = logo.src;
        mark.alt = logo.alt;
        mark.style.cssText = 'display:block;object-fit:contain;object-position:left center';
      }
      mark.setAttribute('data-cliphouse-logo', '');
      mark.style.width = px(w);
      mark.style.height = px(h);
      word.appendChild(mark);
      mask.appendChild(word);
      el.textContent = '';
      el.appendChild(mask);
    }
  }
  // Runs right after the beat runtime script, so CliphouseBeat exists and the template has not mounted yet.
  // Its exports are getters, so the global is replaced by a wrapper with the same members.
  var runtime = window.CliphouseBeat;
  if (runtime && !runtime.__logoWrapped) {
    // defineProperty, because assigning over an inherited getter-only property does nothing.
    var wrapped = Object.create(runtime, {
      mount: {enumerable: true, value: function (tl, score, build) {
        return runtime.mount(tl, score, function (t, m) { apply(); return build(t, m); });
      }},
      __logoWrapped: {value: true},
    });
    window.CliphouseBeat = wrapped;
  }
})();`;

// The logo value goes in the head; the runtime goes right after the beat runtime's script element.
export const logoHead = (logo: LogoBinding | null) =>
  `<script>window.__cliphouseLogo=${JSON.stringify(logo).replace(/</g, '\\u003c')};</script>`;
// The beat runtime is an IIFE that ends with "return __toCommonJS(beat_entry_exports);\n})();" in its own script element.
const BEAT_END = /(return __toCommonJS\(beat_entry_exports\);\s*\}\)\(\);\s*<\/script>)/;

// The source keeps native HyperFrames variables. This only replaces defaults for a concrete edit.
export function bindHyperframes({html, meta, props, assetBase, runtime, logoSrc}: HyperframesProject) {
  const declarations = JSON.stringify(hyperframesDeclarations(props, meta)).replace(/'/g, '&#39;');
  const score = scoreOf(meta);
  let out = html
    .replace(/data-composition-variables='[^']*'/, `data-composition-variables='${declarations}'`)
    .replaceAll('__ASSET_BASE__', assetBase.replace(/\/$/, ''));
  // A function replacer inserts the text literally; "$" sequences in it are not patterns.
  if (score) out = out.replace('__SCORE__', () => JSON.stringify(score).replace(/</g, '\\u003c'));
  if (runtime) out = out.replace('</head>', `<script src="${runtime}"></script></head>`);
  // Only documents with a logo carry the hook, so every other edit binds byte for byte as before.
  const logo = logoSrc ? logoBinding(props, logoSrc) : null;
  if (logoOf(props) && !logoSrc) throw new Error('This edit has a logo, but no logo source was given.');
  if (logo) {
    if (!BEAT_END.test(out)) throw new Error('Logos need a beat template.');
    out = out.replace('<head>', () => `<head>${logoHead(logo)}`).replace(BEAT_END, (m) => `${m}<script>${LOGO_RUNTIME}</script>`);
  }
  return out;
}
