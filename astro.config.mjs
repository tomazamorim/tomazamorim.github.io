import { defineConfig } from 'astro/config';

// Dois modos de build (variável SITE_MODE): preview e public. Cada um escreve em dist/<modo>.
const mode = process.env.SITE_MODE === 'public' ? 'public' : 'preview';

export default defineConfig({
  site: process.env.SITE_URL || 'https://tomazamorim.com',
  outDir: `./dist/${mode}`,
  trailingSlash: 'always',
  build: { format: 'directory', inlineStylesheets: 'never' },
  compressHTML: true,
  devToolbar: { enabled: false },
  telemetry: false,
});
