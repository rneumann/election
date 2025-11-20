// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Exlude integration-session test for github actions, because it needs a running ldap server
    exclude: ['node_modules', 'dist', '.idea', '.git', '.cache', '__tests__/session.test.js'],
  },
});
