import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    include: [
      'tests/documentProcessing.test.ts',
      'tests/prescriptions.test.ts',
    ],
    exclude: ['**/*.spec.ts', '**/node_modules/**', '**/convex/**', '**/.next/**'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});
