// Generate crawlable pages and discovery files from the public catalog after Vite builds.
import fs from 'node:fs';
import path from 'node:path';
import {templateMeta} from '../src/videos/meta.ts';
import {ROLES, SCENE_TYPES, roleError} from '../src/videos/vocab.ts';
import {comparisons, editorialPages, reviewedAt, useCases} from '../src/seo/content.mjs';
import {agentSpec as buildAgentSpec} from '../src/agent/spec.ts';
import {sourcePath, templateVersion} from '../src/agent/versions.ts';
import {generationErrors} from '../src/catalog/generation.ts';
import {ENGINE_LABELS, engineOf} from '../src/videos/engine.ts';
import {AGENT_CONTRACT_VERSION, GOAL_IDS, MARKETING_GOALS} from '../src/agent/goals.ts';
import server from '../server.json' with {type: 'json'};

const root = path.resolve(import.meta.dirname, '..');
const dist = path.join(root, 'dist');
const buildManifest = JSON.parse(fs.readFileSync(path.join(dist, '.vite/manifest.json'), 'utf8'));
const videoScript = buildManifest['src/media/seo-video.ts'].file;
const site = 'https://cliphou.se';
const base = process.env.BASE ?? '/voodoo/';
const ga = process.env.VITE_GA_MEASUREMENT_ID ?? '';
const license = 'MIT-0';
const notice = 'Free to copy, modify, share, and use commercially. No attribution required.';
const mp4 = Boolean(process.env.VITE_SHARE_API_ORIGIN);
const exportStatus = mp4 ? 'Free, full resolution, no watermark' : 'Not available yet';
const exportFact = mp4 ? 'Signed-in users can download a free full-resolution MP4 with no watermark.' : 'Hosted MP4 export is not available yet.';
const promise = `100% free. Browse without an account; a free Google account unlocks unlimited editing. No watermark, credit card, or attribution required.${mp4 ? ' Free MP4 downloads.' : ''} Built for Claude Code, Codex, Cursor, Claude, and ChatGPT.`;
const accountFact = 'Browsing is free without an account. Editing more than 3 templates needs a free Google account. Agent handoff links always open.';
// The MCP section is published only when the share service (which hosts /mcp) is deployed.
const mcpSection = mp4 ? `## MCP server\n\nStreamable HTTP MCP endpoint: ${site}/mcp (stateless, POST only). Tools: search_templates, get_template_spec, build_edit_link, render_preview, render_previews. Search by marketing goal: ${GOAL_IDS.join(', ')}. render_preview renders a poster image of a template with your props in a few seconds; render_previews renders up to 4 templates at once from one brand description; no tool renders video or reads user data.\n\nAnonymous use is limited to 60 requests per minute and 1,000 per day per IP. A free API key from your cliphou.se account raises this to 600 per minute and 20,000 per day: send Authorization: Bearer <key>. Over the limit, the server answers HTTP 429 with Retry-After and RateLimit-* headers; wait Retry-After seconds before retrying.\n\n` : '';
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'src/catalog/manifest.json'), 'utf8'));
// Use-case slugs for all 50 demand-led templates (#7). Phase 2 batches should not need to add slugs.
const validCases = new Set(['showreel', 'youtube-intro', 'instagram-reel', 'social-ad', 'product-launch', 'sale', 'saas', 'data-recap', 'brand-intro', 'event-promo', 'lower-thirds', 'kinetic-typography', 'youtube-end-screen', 'black-friday', 'logo-reveal', 'testimonial', 'year-in-review', 'countdown', 'podcast-intro',
  'hiring', 'livestream', 'animated-chart', 'counter', 'timeline', 'cyber-monday', 'new-year', 'valentines', 'giveaway', 'thank-you', 'pricing',
  'subscribe', 'channel-trailer', 'credits', 'gaming-intro', 'title-card', 'poll', 'quiz', 'before-after', 'progress-bar', 'comparison', 'top-list',
  'agenda', 'flash-sale', 'case-study', 'speaker', 'webinar', 'tickets', 'coming-soon', 'announcement', 'anniversary', 'grand-opening', 'team-intro',
  'partnership', 'newsletter', 'app-promo', 'feature-launch', 'quote', 'birthday', 'music-video', 'developer']);

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const local = (p) => `${base.replace(/\/$/, '')}${p}`;
const absolute = (p) => `${site}${p}`;
const json = (data) => JSON.stringify(data).replace(/</g, '\\u003c');
const date = (...values) => values.filter(Boolean).sort().at(-1);
const formatOf = (m) => {
  const r = m.width / m.height;
  return r > 1.2 ? '16:9' : r < 0.7 ? '9:16' : r < 0.9 ? '4:5' : '1:1';
};

function validate() {
  const errors = [];
  const templates = new Map(manifest.templates.map((t) => [t.id, t]));
  const visible = manifest.variants.filter((v) => !v.hidden);
  for (const t of manifest.templates) if (t.license !== license) errors.push(`${t.id}: template license must be ${license}`);
  for (const t of manifest.templates) errors.push(...generationErrors(t.id, t.generation));
  for (const field of ['id', 'title', 'seoDescription']) {
    const seen = new Map();
    for (const v of visible) {
      const value = String(v[field] ?? '').trim();
      if (!value) errors.push(`${v.id || '(missing id)'}: missing ${field}`);
      if (value && seen.has(value.toLowerCase())) errors.push(`${v.id}: duplicate ${field} also used by ${seen.get(value.toLowerCase())}`);
      seen.set(value.toLowerCase(), v.id);
    }
  }
  for (const v of visible) {
    if (!templates.has(v.template) || !templateMeta[v.template]) errors.push(`${v.id}: unknown template ${v.template}`);
    const roles = templateMeta[v.template]?.scenes.flatMap((s) => s.roles) ?? [];
    for (const [role, value] of Object.entries(v.props?.texts ?? {})) {
      if (!ROLES[role]) errors.push(`${v.id}: unknown text role ${role}`);
      else if (roleError(role, value)) errors.push(`${v.id}: ${role}: ${roleError(role, value)}`);
      else if (!roles.includes(role)) errors.push(`${v.id}: ${role} is not assigned to a scene`);
    }
    for (const [role, value] of Object.entries(v.props?.theme ?? {})) if (!/^#[0-9a-fA-F]{6}$/.test(value)) errors.push(`${v.id}: invalid ${role} color`);
    if (!/^[a-z0-9-]+$/.test(v.id)) errors.push(`${v.id}: slug must use lowercase letters, numbers, and hyphens`);
    if (v.seoDescription?.length < 80 || v.seoDescription?.length > 170) errors.push(`${v.id}: seoDescription must be 80 to 170 characters`);
    if (!manifest.vocab.purpose.includes(v.purpose)) errors.push(`${v.id}: invalid purpose`);
    if (!Array.isArray(v.style) || !v.style.length || v.style.some((s) => !manifest.vocab.style.includes(s))) errors.push(`${v.id}: invalid style`);
    if (!Array.isArray(v.useCases) || !v.useCases.length || new Set(v.useCases).size !== v.useCases.length || v.useCases.some((u) => !validCases.has(u))) errors.push(`${v.id}: invalid useCases`);
    if (v.goals !== undefined && (!Array.isArray(v.goals) || !v.goals.length || new Set(v.goals).size !== v.goals.length || v.goals.some((g) => !GOAL_IDS.includes(g)))) errors.push(`${v.id}: invalid goals`);
    for (const ext of ['jpg', 'mp4']) if (!fs.existsSync(path.join(root, 'public/previews', `${v.id}.${ext}`))) errors.push(`${v.id}: missing preview ${ext}`);
  }
  for (const goal of GOAL_IDS) if (!visible.some((v) => v.goals?.includes(goal))) errors.push(`goal ${goal}: no visible template`);
  if (errors.length) throw new Error(`SEO catalog validation failed:\n${errors.map((e) => `- ${e}`).join('\n')}`);
  return visible.map((v) => {
    const tmpl = templates.get(v.template);
    const meta = templateMeta[v.template];
    return {
      ...v, tmpl, meta, format: formatOf(meta), seconds: Math.round(meta.durationInFrames / meta.fps),
      updatedAt: date(v.createdAt, tmpl.createdAt), path: `/templates/${v.id}/`,
      scenes: meta.scenes.filter((s) => s.type !== 'transition').map((s) => SCENE_TYPES[s.type]),
      roles: Object.keys(v.props.texts).map((r) => ROLES[r].label),
    };
  });
}

function layout({page, body, schema, landing = true}) {
  const analytics = /^G-[A-Z0-9]+$/.test(ga) ? `<script async src="https://www.googletagmanager.com/gtag/js?id=${esc(ga)}"></script>
    <script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('consent','default',{analytics_storage:'granted',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'});gtag('js',new Date());gtag('config',${json(ga)},{send_page_view:false,allow_google_signals:false,allow_ad_personalization_signals:false});${landing ? `try{sessionStorage.getItem('cliphouse:landing')||sessionStorage.setItem('cliphouse:landing',${json(page.path)})}catch{}` : ''}gtag('event','page_view',{page_title:${json(page.title)},page_location:location.href,landing_page:${json(page.path)}});document.addEventListener('click',function(e){var a=e.target.closest('a[data-editor]');if(a)gtag('event','landing_editor_open',{landing_page:${json(page.path)},variant_id:a.dataset.editor})});</script>` : '';
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="theme-color" content="#0e0f12" />
    <link rel="icon" type="image/svg+xml" href="${local('/favicon.svg')}" />
    <title>${esc(page.title)}</title>
    <meta name="description" content="${esc(page.description)}" />
    <link rel="canonical" href="${absolute(page.path)}" />
    <meta property="og:site_name" content="cliphou.se" />
    <meta property="og:title" content="${esc(page.title)}" />
    <meta property="og:description" content="${esc(page.description)}" />
    <meta property="og:type" content="${page.video ? 'video.other' : 'website'}" />
    <meta property="og:url" content="${absolute(page.path)}" />
    <meta property="og:image" content="${esc(page.image ?? `${site}/social.png`)}" />
    ${page.video ? `<meta property="og:video" content="${esc(page.video)}" />` : ''}
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${esc(page.title)}" />
    <meta name="twitter:description" content="${esc(page.description)}" />
    <meta name="twitter:image" content="${esc(page.image ?? `${site}/social.png`)}" />
    <link rel="stylesheet" href="${local('/seo.css')}" />
    <script type="module" src="${local(`/${videoScript}`)}"></script>
    <script type="application/ld+json">${json({'@context': 'https://schema.org', '@graph': schema})}</script>
    ${analytics}
  </head>
  <body>
    <header class="seo-top"><a class="seo-logo" href="${local('/')}"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="6" cy="6" r="3"></circle><path d="M8.12 8.12 12 12"></path><path d="M20 4 8.12 15.88"></path><circle cx="6" cy="18" r="3"></circle><path d="M14.8 14.8 20 20"></path></svg>cliphou.se</a><nav class="seo-nav"><a class="seo-browse" href="${local('/')}">Browse videos</a></nav></header>
    <main class="seo-main">${body}</main>
    <footer class="seo-footer"><a href="${local('/motion-graphics-templates/')}">Templates</a><a href="${local('/remotion-templates/')}">Remotion</a><a href="${local('/hyperframes-templates/')}">HyperFrames</a><a href="${local('/license/')}">License</a><a href="${local('/mcp-docs/')}">MCP docs</a><a href="${local('/about/')}">About</a><a href="${local('/#/privacy')}">Privacy</a></footer>
  </body>
</html>
`;
}

const pageSchema = (page, type = 'WebPage') => ({
  '@type': type, '@id': `${absolute(page.path)}#page`, url: absolute(page.path), name: page.title, description: page.description,
  isPartOf: {'@id': `${site}/#website`}, dateModified: page.updatedAt,
});
const breadcrumb = (items) => ({'@type': 'BreadcrumbList', itemListElement: items.map(([name, p], i) => ({'@type': 'ListItem', position: i + 1, name, item: absolute(p)}))});
const list = (items) => ({'@type': 'ItemList', itemListElement: items.map((v, i) => ({'@type': 'ListItem', position: i + 1, url: absolute(v.path), name: v.title}))});
const faqSchema = (faq) => ({'@type': 'FAQPage', mainEntity: faq.map(([q, a]) => ({'@type': 'Question', name: q, acceptedAnswer: {'@type': 'Answer', text: a}}))});

function cards(items) {
  return `<div class="seo-grid">${items.map((v) => `<article class="seo-card"><a href="${local(v.path)}"><div class="seo-preview" style="aspect-ratio:${v.meta.width}/${v.meta.height}"><img src="${local(`/previews/${v.id}.jpg`)}" alt="${esc(v.title)} preview" width="480" height="${Math.round(480 * v.meta.height / v.meta.width)}" loading="lazy" /><video data-video-src="${local(`/previews/${v.id}.mp4`)}" aria-label="${esc(v.title)} preview" muted loop playsinline preload="none"></video></div><span>${esc(v.title)}</span></a><p>${esc(v.format)} · ${v.seconds}s · ${esc(v.purpose)}</p></article>`).join('')}</div>`;
}

function templatePage(v) {
  const page = {
    path: v.path, title: `${v.title} Template | ${v.format} ${v.purpose} | cliphou.se`, description: v.seoDescription,
    image: absolute(`/previews/${v.id}.jpg`), video: absolute(`/previews/${v.id}.mp4`), updatedAt: v.updatedAt,
  };
  const source = templateVersion(v.template);
  const engine = ENGINE_LABELS[engineOf(v.template)];
  const facts = [['Format', `${v.format} (${v.meta.width} x ${v.meta.height})`], ['Duration', `${v.seconds} seconds`], ['Purpose', v.purpose], ['Styles', v.style.join(', ')], ['Scenes', v.scenes.join(', ')], ['Editable text', v.roles.join(', ')], ['Engine', engine], ...(v.meta.score ? [["Sound", `Generated score, ${v.meta.score.bpm} BPM, ${v.meta.score.scenes.reduce((n, x) => n + x.bars, 0)} bars. Text edits change only accent notes.`]] : []), ['License', license], ['Source', `${engine} project, template v${source.version} (${source.hash})`], ['MP4 export', exportStatus], ['Updated', v.updatedAt], ['Created by', v.creator]];
  const body = `<nav class="crumbs" aria-label="Breadcrumb"><a href="${local('/')}">Home</a><span>/</span><a href="${local('/motion-graphics-templates/')}">Templates</a><span>/</span>${esc(v.title)}</nav>
    <section class="seo-template"><div class="seo-video" style="aspect-ratio:${v.meta.width}/${v.meta.height};background:${esc(v.props.theme.background)}"><video data-video-src="${local(`/previews/${v.id}.mp4`)}" poster="${local(`/previews/${v.id}.jpg`)}" aria-label="${esc(v.title)} preview" muted loop playsinline controls preload="none"></video><button type="button" data-video-play hidden>Play video</button><noscript><a href="${local(`/previews/${v.id}.mp4`)}">Watch video</a></noscript></div>
    <div><h1>${esc(v.title)}</h1><p class="lead">${esc(v.seoDescription)}</p><p class="claim">${promise}</p><div class="actions"><a class="seo-button" data-editor="${esc(v.id)}" href="${local(`/#/v/${v.id}`)}">Edit free now</a><a class="seo-secondary" href="${local(`${v.path}agent.json`)}">Agent spec</a><a class="seo-secondary" href="${local(sourcePath(v.template, source.version))}" download>Download source</a></div><section class="seo-brief"><h2>Creative brief</h2><p>${esc(v.tmpl.prompt)}</p></section><p class="license-note">${notice} <a href="${local('/license/')}">Read the license</a>.</p>
    <dl class="facts">${facts.map(([k, val]) => `<div><dt>${k}</dt><dd>${esc(val)}</dd></div>`).join('')}</dl></div></section>`;
  const schema = [pageSchema(page), breadcrumb([['Home', '/'], ['Templates', '/motion-graphics-templates/'], [v.title, v.path]]), {
    '@type': 'VideoObject', '@id': `${absolute(v.path)}#video`, name: v.title, description: v.seoDescription,
    thumbnailUrl: [page.image], contentUrl: page.video, embedUrl: absolute(v.path), uploadDate: v.createdAt,
    dateModified: v.updatedAt, duration: `PT${v.seconds}S`, width: v.meta.width, height: v.meta.height, inLanguage: 'en',
    license: absolute('/license/'), creator: {'@type': 'Person', name: v.creator},
  }];
  return {page, html: layout({page, body, schema})};
}

function collectionPage(item, items, extra = '') {
  const page = {...item, updatedAt: date(...items.map((v) => v.updatedAt))};
  const faq = item.faq ?? [];
  const body = `<section class="seo-intro"><h1>${esc(item.h1)}</h1><p class="lead">${esc(item.intro)}</p><p class="claim">${promise}</p></section>${extra}
    <section class="seo-section"><h2>Templates</h2>${cards(items)}</section>
    ${faq.length ? `<section class="seo-section"><h2>Questions</h2>${faq.map(([q, a]) => `<h3>${esc(q)}</h3><p>${esc(a)}</p>`).join('')}</section>` : ''}`;
  const schema = [pageSchema(page, 'CollectionPage'), breadcrumb([['Home', '/'], [item.h1, item.path]]), list(items)];
  if (faq.length) schema.push(faqSchema(faq));
  return {page, html: layout({page, body, schema})};
}

function sections(item) {
  return item.sections.map(([h, p]) => `<section class="seo-section"><h2>${esc(h)}</h2><p>${esc(p)}</p></section>`).join('');
}

function comparisonExtra(item) {
  const labels = ['Area', 'cliphou.se', item.competitor];
  return `<section class="seo-section"><h2>Comparison</h2><p class="reviewed">Last reviewed ${reviewedAt}.</p><div class="table-wrap"><table><thead><tr>${labels.map((l) => `<th>${esc(l)}</th>`).join('')}</tr></thead><tbody>${item.rows.map((r) => `<tr>${r.map((c, i) => i ? `<td data-label="${esc(labels[i])}">${esc(c)}</td>` : `<th>${esc(c)}</th>`).join('')}</tr>`).join('')}</tbody></table></div><p>Source: ${item.sources.map(([n, u]) => `<a href="${u}" rel="nofollow">${esc(n)}</a>`).join(', ')}.</p></section>`;
}

function licensePage() {
  const page = {path: '/license/', title: 'Template License: MIT-0 | cliphou.se', description: 'cliphou.se templates are free to copy, modify, share, and use commercially under MIT-0. No attribution is required.', updatedAt: reviewedAt};
  const body = `<section class="seo-intro"><h1>Template license</h1><p class="lead">${notice}</p></section><section class="seo-section"><h2>What MIT-0 covers</h2><p>The license covers cliphou.se template code, template metadata, starter text, color presets, agent specs, and preview images and videos.</p><p>You do not need to credit cliphou.se or template creators.</p><p>Rendering the code yourself uses Remotion, which has separate terms.</p><p><a href="${local('/LICENSE.txt')}">Read the full license text</a>.</p></section>`;
  return {page, html: layout({page, body, schema: [pageSchema(page), breadcrumb([['Home', '/'], ['License', '/license/']])]})};
}

// The MCP Registry and skill repo link here as the product page for agent installs.
const mcpUrl = `${site}/mcp`;
const skillRepo = 'https://github.com/sunmer/cliphouse';
const mcpTools = [
  ['search_templates', 'Finds templates by marketing goal, release moment, product, format, and length.'],
  ['get_template_spec', 'Returns editable text roles, limits, theme colors, scenes, and the JSON Schema.'],
  ['upload_logo', 'Stores the project logo for templates that show a brand mark.'],
  ['render_previews', 'Renders up to 4 options with the project brand, so the user can compare them.'],
  ['render_preview', 'Renders the picked template with filled props and returns its editor link.'],
  ['build_edit_link', 'Validates props and returns an editable cliphou.se link without rendering.'],
];

function mcpDocsPage() {
  const page = {path: '/mcp-docs/', title: 'cliphou.se MCP Server and Agent Skill',
    description: 'Connect cliphou.se to your coding agent. It reads your project, writes the positioning, and returns branded release video previews.',
    image: absolute('/mcp-docs/poster.jpg'), video: absolute('/mcp-docs/workflow.mp4'), updatedAt: '2026-10-19'};
  const body = `<section class="mcp-hero"><h1>cliphou.se for coding agents</h1><p class="lead">Your agent reads the project, finds what is worth showing, writes the positioning, and returns three branded video previews.</p>
    <div class="mcp-video"><video autoplay muted loop playsinline preload="auto" poster="${local('/mcp-docs/poster.jpg')}" aria-label="A coding agent reads project files, chooses the release highlights and audience, then returns three animated video previews"><source src="${local('/mcp-docs/workflow.mp4')}" type="video/mp4" /></video></div></section>
    <section class="seo-section"><h2>Install</h2><div class="mcp-install">
      <article><h3>Agent skill</h3><p>For Codex, Claude Code, and agents that support skills.</p><pre><code>npx skills add sunmer/cliphouse</code></pre><p class="mcp-links"><a href="${skillRepo}">GitHub</a><a href="https://skills.sh/sunmer/cliphouse">skills.sh</a></p></article>
      <article><h3>MCP server</h3><p>Streamable HTTP. No API key is needed for normal use.</p><pre><code>${mcpUrl}</code></pre><p>Claude Code:</p><pre><code>claude mcp add --transport http cliphouse ${mcpUrl}</code></pre><p>Codex, in <code>~/.codex/config.toml</code>:</p><pre><code>[mcp_servers.cliphouse]
url = "${mcpUrl}"</code></pre></article>
    </div></section>
    <section class="seo-section"><h2>What the agent does</h2><ol class="mcp-steps"><li>Reads the README, changelog, theme files, and logo.</li><li>Chooses the marketing work for the request, such as the release highlights and the audience.</li><li>Shows three previews with the project brand, then fills the picked template.</li></ol><p>You review and export the MP4 in the cliphou.se editor.</p></section>
    <section class="seo-section"><h2>Tools</h2><dl class="facts mcp-tools">${mcpTools.map(([name, text]) => `<div><dt><code>${name}</code></dt><dd>${esc(text)}</dd></div>`).join('')}</dl></section>
    <section class="seo-section"><h2>Limits</h2><p>Anonymous use allows 60 requests per minute and 1,000 per day for each IP address. A free API key from your cliphou.se account raises this to 600 requests per minute and 20,000 per day. The server does not read your files directly. Your agent sends only the facts and assets needed for the video.</p></section>
    <section class="seo-section"><h2>Links</h2><p class="mcp-links"><a href="${skillRepo}">Skill and README</a><a href="https://registry.modelcontextprotocol.io/v0.1/servers?search=se.cliphou%2Ftemplates">MCP Registry</a><a href="${local('/.well-known/mcp.json')}">Discovery document</a><a href="${local('/llms.txt')}">llms.txt</a></p></section>`;
  const schema = [pageSchema(page), breadcrumb([['Home', '/'], ['MCP docs', '/mcp-docs/']]), {
    '@type': 'SoftwareApplication', name: 'cliphou.se MCP server and agent skill', applicationCategory: 'DeveloperApplication', operatingSystem: 'Any',
    url: absolute('/mcp-docs/'), sameAs: [skillRepo], offers: {'@type': 'Offer', price: 0, priceCurrency: 'USD'}, description: page.description,
  }, {
    '@type': 'VideoObject', name: 'cliphou.se agent workflow', description: 'A coding agent reads project files, chooses marketing work, and returns animated video previews.',
    thumbnailUrl: [page.image], contentUrl: page.video, uploadDate: '2026-10-19', duration: 'PT22S', width: 1600, height: 760,
  }];
  return {page, html: layout({page, body, schema})};
}

function write(page, html) {
  const file = path.join(dist, page.path, 'index.html');
  fs.mkdirSync(path.dirname(file), {recursive: true});
  fs.writeFileSync(file, html);
}

const agentSpec = (v) => buildAgentSpec({site, kind: 'template', id: v.id, url: absolute(v.path), title: v.title,
  variant: v, props: v.props, siteCommit: process.env.GITHUB_SHA});

if (!fs.existsSync(dist)) throw new Error('Run vite build before generating SEO pages.');
const visible = validate();
const outputs = [];
for (const v of visible) outputs.push(templatePage(v));
for (const item of useCases) {
  const items = visible.filter(item.match);
  if (items.length >= 3) outputs.push(collectionPage(item, items));
}
for (const item of editorialPages) outputs.push(collectionPage(item, visible.filter(item.match), sections(item)));
for (const item of comparisons) {
  const rows = item.rows.map((r) => r[0] === 'Export' ? [r[0], mp4 ? 'Free full-resolution MP4 download with no watermark after Google sign-in. Developers can also download the Remotion source.' : r[1], r[2]] : r);
  outputs.push(collectionPage(item, visible.filter(item.match).slice(0, 6), comparisonExtra({...item, rows})));
}
outputs.push(licensePage());
outputs.push(mcpDocsPage());

const seen = {title: new Set(), description: new Set(), path: new Set()};
for (const v of visible) {
  const file = path.join(dist, v.path, 'agent.json');
  fs.mkdirSync(path.dirname(file), {recursive: true});
  fs.writeFileSync(file, `${JSON.stringify(agentSpec(v), null, 2)}\n`);
}
for (const {page, html} of outputs) {
  for (const key of Object.keys(seen)) {
    if (seen[key].has(page[key])) throw new Error(`Duplicate generated ${key}: ${page[key]}`);
    seen[key].add(page[key]);
  }
  JSON.parse(html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)[1]);
  write(page, html);
}

fs.copyFileSync(path.join(root, 'src/seo/pages.css'), path.join(dist, 'seo.css'));
fs.copyFileSync(path.join(root, 'LICENSE'), path.join(dist, 'LICENSE.txt'));
fs.writeFileSync(path.join(dist, 'agent-contract.json'), `${JSON.stringify({
  version: AGENT_CONTRACT_VERSION, mcpVersion: server.version, tools: ['search_templates', 'get_template_spec', 'build_edit_link', 'render_preview', 'render_previews'],
  goals: MARKETING_GOALS.map(({id, label}) => ({id, label})),
}, null, 2)}\n`);
const catalogUpdated = date(...visible.map((v) => v.updatedAt));
const fixed = [{path: '/', updatedAt: catalogUpdated}, {path: '/about/', updatedAt: reviewedAt}, {path: '/benchmark/', updatedAt: '2026-10-08'}, {path: '/benchmark/2026-10/', updatedAt: '2026-10-08'}, {path: '/benchmark/gta6/', updatedAt: '2026-10-18'}];
const urls = [...fixed, ...outputs.map((o) => o.page)];
fs.writeFileSync(path.join(dist, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `  <url><loc>${absolute(u.path)}</loc><lastmod>${u.updatedAt}</lastmod></url>`).join('\n')}\n</urlset>\n`);
fs.writeFileSync(path.join(dist, 'llms.txt'), `# cliphou.se\n\n> You ship it. Cliphouse shows it off. Your coding agent turns every release into a video for your socials. It finds the selling points, picks the angle, writes the copy, and uses your brand colors and logo. ${promise}\n\n## Key pages\n\n- [Gallery](${site}/): Browse and filter templates.\n- [Motion graphics templates](${site}/motion-graphics-templates/): Crawlable catalog.\n- [Remotion templates](${site}/remotion-templates/): Remotion showcase and render handoff.\n- [HyperFrames templates](${site}/hyperframes-templates/): HyperFrames showcase and native HTML project downloads.\n- [Template license](${site}/license/): ${notice}\n- [MCP docs](${site}/mcp-docs/): Install the skill or MCP server and see the agent workflow.\n\n## Agent specs\n\nEach template has a no-JavaScript JSON spec with current props, text limits, color roles, scenes, JSON Schema, a handoff URL, and a pinned source package. Each published share has the same spec at /s/<share-id>/agent.json.\n\nText and color edits: return ${site}/#/v/<variant-id>?props=<url-encoded props JSON>. cliphou.se validates the props before it opens them.\n\nCode edits: download source.package from the spec and follow source.renderCommand. Remotion packages use props.json. HyperFrames packages use variables.json.\n\n${mcpSection}${visible.map((v) => `- [${v.title} agent spec](${absolute(`${v.path}agent.json`)})`).join('\n')}\n\n## Templates\n\n${visible.map((v) => `- [${v.title}](${absolute(v.path)}): ${v.seoDescription}`).join('\n')}\n\n## Product facts\n\n- Browsing and editing are free.\n- ${accountFact}\n- Each template is locked to Remotion or HyperFrames. The editor and agent handoff use the same text and color contract for both.\n- Templates use shared text roles and five theme colors.\n- ${exportFact}\n- Every template version has a downloadable source package with exact dependencies, so old versions stay renderable.\n- Remotion and HyperFrames dependencies keep their own license terms.\n`);
// Generation credits must name the model, never the coding agent that ran it. Marketing copy may name
// the agents users install the skill in, so only the published generation metadata is checked here.
const bannedAgentName = new RegExp(String.fromCharCode(67, 111, 100, 101, 120), 'i');
const agentSpecs = (dir) => fs.readdirSync(dir, {withFileTypes: true}).flatMap((entry) => {
  const file = path.join(dir, entry.name);
  return entry.isDirectory() ? agentSpecs(file) : entry.name === 'agent.json' ? [file] : [];
});
const leaked = agentSpecs(dist).filter((file) => bannedAgentName.test(JSON.stringify(JSON.parse(fs.readFileSync(file, 'utf8')).generation ?? {})));
if (leaked.length) throw new Error(`Generation metadata names an agent instead of a model:\n${leaked.map((file) => `- ${path.relative(dist, file)}`).join('\n')}`);
console.log(`Generated ${outputs.length} SEO pages, sitemap.xml, and llms.txt from ${visible.length} visible templates.`);
