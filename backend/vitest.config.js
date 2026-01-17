import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    setupFiles: ['./__tests__/setup-env.js'],
    exclude: [
      'node_modules',
      'dist',
      '.idea',
      '.git',
      '.cache',
      '__tests__/session.test.js',
      '__tests__/counting/algorithms/hare-niemeyer.test.js',
      '__tests__/counting/algorithms/sainte-lague.test.js',
      '__tests__/counting/algorithms/majority-vote.test.js',
      '__tests__/counting/algorithms/referendum.test.js',
      '__tests__/election-importer.test.js',
    ],
  },
});
