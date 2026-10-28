import { defineConfig } from 'tsup';

export default defineConfig({
  entry: [
    'src/index.ts',
    'src/knowledge-bases/index.ts',
    'src/mcp/index.ts',
    'src/skills/index.ts',
    'src/skills/filesystem/index.ts',
  ],
  format: ['esm', 'cjs'],
  dts: {
    compilerOptions: { ignoreDeprecations: '6.0' },
  },
  sourcemap: true,
  clean: true,
  target: 'es2023',
});
