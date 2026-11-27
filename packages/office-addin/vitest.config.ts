import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    execArgv: ['--no-experimental-webstorage'],
  },
});
