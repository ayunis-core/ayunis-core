import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const BOOTSTRAP = join(__dirname, '../../../appsignal.cjs');

// appsignal.cjs starts the client as a side effect of being required, so it is
// exercised in a child process: an empty cwd keeps local .env files out, and
// the env is built from scratch so the developer's shell cannot leak in.
function bootstrap(env: Record<string, string>): string {
  const cwd = mkdtempSync(join(tmpdir(), 'appsignal-bootstrap-'));
  try {
    const result = spawnSync(
      process.execPath,
      ['-e', `require(${JSON.stringify(BOOTSTRAP)}); process.exit(0);`],
      { cwd, env: { PATH: process.env.PATH ?? '', ...env }, encoding: 'utf8' },
    );
    return `${result.stdout}${result.stderr}`;
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
}

describe('appsignal.cjs bootstrap', () => {
  it('does not report a production-mode process without an explicit AppSignal environment', () => {
    const output = bootstrap({
      NODE_ENV: 'production',
      APPSIGNAL_PUSH_API_KEY: 'test-key',
    });

    expect(output).not.toContain('AppSignal initialized');
    expect(output).toContain('APPSIGNAL_APP_ENV is not set');
  });

  it('does not report when the AppSignal environment is development', () => {
    const output = bootstrap({
      NODE_ENV: 'production',
      APPSIGNAL_PUSH_API_KEY: 'test-key',
      APPSIGNAL_APP_ENV: 'development',
    });

    expect(output).not.toContain('AppSignal initialized');
  });

  it('reports into the explicitly named environment', () => {
    const output = bootstrap({
      NODE_ENV: 'production',
      APPSIGNAL_PUSH_API_KEY: 'test-key',
      APPSIGNAL_APP_ENV: 'staging',
    });

    expect(output).toContain('AppSignal initialized for environment: staging');
  });
});
