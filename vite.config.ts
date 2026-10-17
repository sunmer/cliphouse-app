import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // Local and test builds use /voodoo/. Production builds set BASE=/.
  base: process.env.BASE ?? '/voodoo/',
  plugins: [react()],
  // Assets imported from JS (fonts, images) resolve from the chunk's own URL, not the page. The MCP App
  // preview runs on the host's origin, so a root-relative /assets/ URL would point at the host.
  experimental: {renderBuiltUrl: (_filename, {hostType}) => (hostType === 'js' ? {relative: true} : undefined)},
  // mcpApp is the live preview view that MCP hosts show in an iframe (server/mcp-app.ts serves it).
  build: {manifest: true, rollupOptions: {input: {main: 'index.html', about: 'about/index.html', benchmark: 'benchmark/index.html', benchmarkOctober: 'benchmark/2026-10/index.html', seoVideo: 'src/media/seo-video.ts', mcpApp: 'mcp-app/index.html'}}},
  // POC_PUBLIC=1 lets a tunnel hostname reach the dev server.
  server: {port: 5180, allowedHosts: process.env.POC_PUBLIC ? true : undefined},
});
