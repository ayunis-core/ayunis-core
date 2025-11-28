import { defineConfig } from 'orval';

export default defineConfig({
  codeExecution: {
    input: {
      target: 'http://localhost:8080/openapi.json',
    },
    output: {
      target: './src/common/clients/code-execution/generated',
      client: 'axios',
      mode: 'split',
      mock: false,
      clean: true,
      override: {
        mutator: {
          path: 'src/common/clients/code-execution/client.ts',
          name: 'codeExecutionAxiosInstance',
        },
      },
    },
  },
  anonymize: {
    input: {
      target: 'http://localhost:8001/openapi.json',
    },
    output: {
      target: './src/common/clients/anonymize/generated',
      client: 'axios',
      mode: 'split',
      mock: false,
      clean: true,
      override: {
        mutator: {
          path: 'src/common/clients/anonymize/client.ts',
          name: 'anonymizeAxiosInstance',
        },
      },
    },
  },
});
