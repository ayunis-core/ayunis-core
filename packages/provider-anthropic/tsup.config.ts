import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/bedrock.ts'],
  format: ['esm', 'cjs'],
  dts: {
    // tsup's DTS worker injects baseUrl, which TypeScript 6 rejects
    // (TS5101, removed in TS 7). Scoped here so type-checks stay strict.
    compilerOptions: { ignoreDeprecations: '6.0' },
  },
  sourcemap: true,
  clean: true,
  target: 'es2023',
});
