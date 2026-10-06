import { defineConfig } from 'vitest/config';
import { viteSingleFile } from 'vite-plugin-singlefile';

// `vite build --mode single` inlines everything (code, crab model, textures) into dist-single/index.html: one file to upload.
export default defineConfig(({ mode }) => {
  const single = mode === 'single';
  return {
    base: './',
    plugins: single ? [viteSingleFile()] : [],
    build: { outDir: single ? 'dist-single' : 'dist', target: 'es2022', chunkSizeWarningLimit: 1500 },
    test: { include: ['tests/**/*.test.ts'], environment: 'node' },
  };
});
