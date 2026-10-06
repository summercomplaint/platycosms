import { defineConfig } from 'vitest/config';
import { viteSingleFile } from 'vite-plugin-singlefile';

// `SINGLE=1 vite build` inlines everything into dist-single/index.html (one file to upload).
const single = process.env.SINGLE === '1';

export default defineConfig({
  base: './',
  plugins: single ? [viteSingleFile()] : [],
  build: { outDir: single ? 'dist-single' : 'dist', target: 'es2022' },
  test: { include: ['tests/**/*.test.ts'], environment: 'node' },
});
