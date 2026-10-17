// The live preview view for MCP Apps hosts (io.modelcontextprotocol/ui). The host renders this HTML in a
// sandboxed iframe on its own origin, so the bundle and every asset load from the site over HTTPS. The
// resource only declares those origins; nothing else is reachable from the view.
export const PREVIEW_APP_URI = 'ui://cliphouse/previews-v1.html';
export const APP_MIME = 'text/html;profile=mcp-app';

type ManifestEntry = {file: string; css?: string[]; imports?: string[]};

// Builds the view HTML from the Vite manifest, with absolute asset URLs on the site origin.
export function previewAppHtml(manifest: Record<string, ManifestEntry>, origin: string) {
  const entry = manifest['mcp-app/index.html'];
  if (!entry) return null;
  const site = origin.replace(/\/$/, '');
  const url = (file: string) => `${site}/${file}`;
  const css = new Set<string>();
  const seen = new Set<string>();
  // Shared chunks carry CSS too; collect it from the entry's static imports.
  const walk = (key: string) => {
    if (seen.has(key)) return;
    seen.add(key);
    const chunk = manifest[key];
    chunk?.css?.forEach((file) => css.add(file));
    chunk?.imports?.forEach(walk);
  };
  walk('mcp-app/index.html');
  const preload = [...seen].filter((key) => key !== 'mcp-app/index.html' && manifest[key]).map((key) => manifest[key].file);
  return `<!doctype html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="cliphouse-origin" content="${site}"><title>cliphou.se previews</title>
${[...css].map((file) => `<link rel="stylesheet" crossorigin href="${url(file)}">`).join('\n')}
${preload.map((file) => `<link rel="modulepreload" crossorigin href="${url(file)}">`).join('\n')}
</head><body><div id="root"></div><script type="module" crossorigin src="${url(entry.file)}"></script></body></html>`;
}

// UI metadata shared by the resource listing and the resource contents.
export const previewAppMeta = (origin: string) => {
  const site = origin.replace(/\/$/, '');
  return {ui: {prefersBorder: false, csp: {resourceDomains: [site], connectDomains: [site]}}};
};

// Tool metadata that links render_previews and render_preview to the view. The flat keys are the older
// MCP Apps form and the ChatGPT alias; hosts read whichever they support.
export const previewToolMeta = {
  ui: {resourceUri: PREVIEW_APP_URI},
  'ui/resourceUri': PREVIEW_APP_URI,
  'openai/outputTemplate': PREVIEW_APP_URI,
  'openai/toolInvocation/invoking': 'Rendering previews',
  'openai/toolInvocation/invoked': 'Previews ready',
};
