import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/bedrock.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  target: 'es2023',
});
