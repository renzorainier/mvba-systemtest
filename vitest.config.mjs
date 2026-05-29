import path from 'node:path';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': __dirname,
    },
  },
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['./test/setup/mongodb.js', './test/setup/vitest.js'],
    include: ['**/*.{test,spec}.{js,jsx,mjs,cjs}'],
    exclude: ['node_modules', '.next', 'coverage'],
    fileParallelism: false,
    maxWorkers: 1,
  },
});
