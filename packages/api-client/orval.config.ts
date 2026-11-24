import { defineConfig } from 'orval';

export default defineConfig({
  api: {
    input: {
      target: './openapi-schema.json',
    },
    output: {
      target: './src/generated',
      client: 'react-query',
      httpClient: 'axios',
      mode: 'split',
      mock: false,
      clean: true,
      override: {
        mutator: {
          path: './src/request.ts',
          name: 'customAxiosInstance',
        },
      },
    },
  },
});
