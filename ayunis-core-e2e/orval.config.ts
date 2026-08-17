import { defineConfig } from 'orval';

export default defineConfig({
  api: {
    input: {
      target: '../ayunis-core-frontend/src/shared/api/openapi-schema.json',
    },
    output: {
      target: './src/clients/generated',
      client: 'axios',
      httpClient: 'axios',
      mode: 'split',
      mock: false,
      clean: true,
      override: {
        mutator: {
          path: './src/clients/playwright-api-client.ts',
          name: 'playwrightApiClient',
        },
      },
    },
  },
});
