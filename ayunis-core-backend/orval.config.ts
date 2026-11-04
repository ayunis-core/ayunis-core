import { defineConfig } from 'orval';

// Orval derives import extensions from tsconfig; the backend's `nodenext`
// setting would emit `.js` specifiers, which Jest cannot resolve.
const commonJsImports = {
  compilerOptions: { module: 'commonjs', moduleResolution: 'node' },
} as const;

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
      tsconfig: commonJsImports,
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
      target: 'http://localhost:8002/openapi.json',
    },
    output: {
      target: './src/common/clients/anonymize/generated',
      client: 'axios',
      mode: 'split',
      mock: false,
      clean: true,
      tsconfig: commonJsImports,
      override: {
        mutator: {
          path: 'src/common/clients/anonymize/client.ts',
          name: 'anonymizeAxiosInstance',
        },
      },
    },
  },
  marketplace: {
    input: {
      target: 'http://localhost:3002/api/docs-json',
    },
    output: {
      target: './src/common/clients/marketplace/generated',
      client: 'axios',
      mode: 'split',
      mock: false,
      clean: true,
      tsconfig: commonJsImports,
      override: {
        mutator: {
          path: 'src/common/clients/marketplace/client.ts',
          name: 'marketplaceAxiosInstance',
        },
      },
    },
  },
});
