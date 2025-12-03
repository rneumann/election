// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Exlude integration-session test for github actions, because it needs a running ldap server
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
      '__tests__/election-import.test.js',
    ],
  },
});
