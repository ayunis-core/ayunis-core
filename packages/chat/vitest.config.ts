import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    // Node 25+ defines its own global localStorage (undefined without
    // --localstorage-file), which shadows jsdom's.
    execArgv: ['--no-experimental-webstorage'],
  },
});
