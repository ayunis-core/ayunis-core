#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

type Severity = 'low' | 'medium';

type SignalKind =
  | 'duplicate-export-name'
  | 'infrastructure-import'
  | 'large-file'
  | 'repeated-file-name';

type Signal = {
  kind: SignalKind;
  severity: Severity;
  summary: string;
  locations: string[];
  metadata?: Record<string, number | string>;
};

const outputPath = process.argv[2] ?? 'architecture-hygiene/signals.json';
const signalLimit = Number.parseInt(process.env.ARCHITECTURE_HYGIENE_SIGNAL_LIMIT ?? '80', 10);
const generatedPatterns = [
  '/dist/',
  '/node_modules/',
  '/generated/',
  '.generated.',
  '/coverage/',
  '/migrations/',
  '.record.ts',
];
const commonFileNames = new Set([
  'index.ts',
  'index.tsx',
  'types.ts',
  'test.ts',
  'spec.ts',
  'Page.tsx',
  'openapi.ts',
  'eslint.config.mjs',
  'orval.config.ts',
]);
const sourceExtensions = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']);

function git(args: string[]): string {
  return execFileSync('git', args, { encoding: 'utf8' }).trim();
}

function isSourceFile(file: string): boolean {
  return sourceExtensions.has(path.extname(file)) && !generatedPatterns.some((pattern) => file.includes(pattern));
}

function read(file: string): string {
  return readFileSync(file, 'utf8');
}

function lineCount(file: string): number {
  return read(file).split('\n').length;
}

function addSignal(signals: Signal[], signal: Signal): void {
  signals.push({ ...signal, locations: signal.locations.slice(0, 20) });
}

const files = git(['ls-files']).split('\n').filter(Boolean);
const sourceFiles = files.filter((file) => existsSync(file) && isSourceFile(file));
const signals: Signal[] = [];

const duplicateNames = new Map<string, string[]>();
for (const file of sourceFiles) {
  const base = path.basename(file);
  if (commonFileNames.has(base) || base.endsWith('.spec.ts') || base.endsWith('.test.ts')) {
    continue;
  }
  const paths = duplicateNames.get(base) ?? [];
  paths.push(file);
  duplicateNames.set(base, paths);
}
for (const [base, paths] of duplicateNames) {
  if (paths.length >= 4) {
    addSignal(signals, {
      kind: 'repeated-file-name',
      severity: 'low',
      summary: `${base} appears in ${paths.length} source locations`,
      locations: paths,
    });
  }
}

for (const file of sourceFiles) {
  const lines = lineCount(file);
  const threshold = file.includes('.spec.') || file.includes('.test.') ? 700 : 450;
  if (lines > threshold) {
    addSignal(signals, {
      kind: 'large-file',
      severity: lines > 700 ? 'medium' : 'low',
      summary: `${file} has ${lines} lines`,
      locations: [file],
      metadata: { lines },
    });
  }
}

const infrastructureImports = [
  { pattern: /from ['"]pino['"]|from ['"]nestjs-pino['"]|require\(['"]pino['"]\)/, name: 'pino' },
  { pattern: /from ['"]typeorm['"]/, name: 'typeorm' },
  { pattern: /from ['"]@nestjs\/axios['"]/, name: '@nestjs/axios' },
];
for (const file of sourceFiles) {
  const isSpec = file.includes('.spec.') || file.includes('.test.');
  const isInfrastructure = file.includes('/infrastructure/');
  const isInnerHexagon =
    file.includes('/src/domain/') &&
    (file.includes('/application/') || file.includes('/domain/'));
  if (isSpec || isInfrastructure || !isInnerHexagon) {
    continue;
  }
  const contents = read(file);
  for (const { pattern, name } of infrastructureImports) {
    if (pattern.test(contents)) {
      addSignal(signals, {
        kind: 'infrastructure-import',
        severity: 'medium',
        summary: `${file} imports infrastructure package ${name}`,
        locations: [file],
        metadata: { package: name },
      });
    }
  }
}

const hookNames = new Map<string, string[]>();
for (const file of sourceFiles.filter((file) => file.endsWith('.ts') || file.endsWith('.tsx'))) {
  const contents = read(file);
  for (const match of contents.matchAll(/export function (use[A-Z][A-Za-z0-9_]*)|export const (use[A-Z][A-Za-z0-9_]*)/g)) {
    const name = match[1] ?? match[2];
    const paths = hookNames.get(name) ?? [];
    paths.push(file);
    hookNames.set(name, paths);
  }
}
for (const [name, paths] of hookNames) {
  if (paths.length > 1) {
    addSignal(signals, {
      kind: 'duplicate-export-name',
      severity: 'low',
      summary: `${name} is exported from ${paths.length} files`,
      locations: paths,
      metadata: { exportName: name },
    });
  }
}

const rank: Record<Severity, number> = { medium: 0, low: 1 };
const report = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  commit: git(['rev-parse', 'HEAD']),
  sourceFileCount: sourceFiles.length,
  signalLimit,
  signals: signals
    .sort((left, right) => rank[left.severity] - rank[right.severity])
    .slice(0, signalLimit),
};

mkdirSync(path.dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(`Wrote ${report.signals.length} architecture hygiene signals to ${outputPath}`);
