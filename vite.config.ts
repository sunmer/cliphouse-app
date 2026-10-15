import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // Local and test builds use /voodoo/. Production builds set BASE=/.
  base: process.env.BASE ?? '/voodoo/',
  plugins: [react()],
  build: {manifest: true, rollupOptions: {input: {main: 'index.html', about: 'about/index.html', benchmark: 'benchmark/index.html', benchmarkOctober: 'benchmark/2026-10/index.html', seoVideo: 'src/media/seo-video.ts'}}},
  // POC_PUBLIC=1 lets a tunnel hostname reach the dev server.
  server: {port: 5180, allowedHosts: process.env.POC_PUBLIC ? true : undefined},
});
