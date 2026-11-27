import {
  Module,
  type INestApplication,
  type OnModuleInit,
} from '@nestjs/common';
import { HttpAdapterHost, NestFactory } from '@nestjs/core';
import type { Express } from 'express';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { SURFACE_REGISTRY } from 'src/config/surface-registry';
import { serveSurfaces } from './serve-surfaces';

const WEB_SHELL = '<div id="app"></div>';
const SELF = "frame-ancestors 'self'";

function writeFixture(rootPath: string): void {
  for (const dir of ['web/assets', 'outlook/assets', 'website']) {
    mkdirSync(join(rootPath, dir), { recursive: true });
  }
  writeFileSync(join(rootPath, 'web/index.html'), WEB_SHELL);
  writeFileSync(join(rootPath, 'web/assets/index-abc.js'), 'export {}');
  for (const page of ['taskpane', 'dialog', 'events']) {
    writeFileSync(join(rootPath, `outlook/${page}.html`), `<div>${page}</div>`);
  }
  writeFileSync(join(rootPath, 'outlook/assets/icon.png'), 'icon');
  writeFileSync(join(rootPath, 'outlook/events-classic.js'), '(() => {})()');
  writeFileSync(join(rootPath, 'website/widget.html'), '<div>widget</div>');
}

describe('serveSurfaces', () => {
  let app: INestApplication;
  let baseUrl: string;
  let rootPath: string;
  const savedEnv = { ...process.env };
  const fetchPath = (path: string) => fetch(`${baseUrl}${path}`);

  beforeAll(async () => {
    rootPath = mkdtempSync(join(tmpdir(), '.surface-builds-'));
    writeFixture(rootPath);
    @Module({})
    class TestModule implements OnModuleInit {
      constructor(private readonly adapterHost: HttpAdapterHost) {}

      onModuleInit() {
        this.adapterHost.httpAdapter.getInstance<Express>().use(
          serveSurfaces(rootPath, {
            ...SURFACE_REGISTRY,
            website: {
              ...SURFACE_REGISTRY.website,
              framing: {
                documents: ['widget.html'],
                resolveOrigins: async (request) => {
                  await Promise.resolve();
                  return request.query.channel === 'one'
                    ? ['https://one.example', 'https://invalid.example;']
                    : ['https://two.example'];
                },
              },
            },
          }),
        );
      }
    }
    app = await NestFactory.create(TestModule, { logger: false });
    await app.listen(0, '127.0.0.1');
    baseUrl = await app.getUrl();
  });

  beforeEach(() => {
    process.env.OUTLOOK_ADDIN_FRAME_ORIGINS =
      'https://outlook.office.com, https://mail.customer.de';
  });

  afterEach(() => {
    process.env = { ...savedEnv };
  });

  afterAll(async () => {
    await app.close();
    rmSync(rootPath, { recursive: true, force: true });
  });

  it.each([
    '/',
    '/index.html',
    '/chat',
    '/admin-settings/integrations',
    '/outlook/login?client=outlook',
    '/outlook/handoff?client=outlook',
  ])(
    'serves the web shell with no-store and self framing at %s',
    async (path) => {
      const response = await fetchPath(path);
      expect(response.status).toBe(200);
      expect(response.headers.get('cache-control')).toBe('no-store');
      expect(response.headers.get('content-security-policy')).toBe(SELF);
      expect(await response.text()).toBe(WEB_SHELL);
    },
  );

  it('keeps default caching for web assets', async () => {
    const response = await fetchPath('/assets/index-abc.js');
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('public, max-age=0');
  });

  it.each(['/outlook/taskpane.html', '/outlook/events.html'])(
    'allows configured Outlook framing on %s',
    async (path) => {
      const response = await fetchPath(path);
      expect(response.status).toBe(200);
      expect(response.headers.get('cache-control')).toBe('no-store');
      expect(response.headers.get('content-security-policy')).toBe(
        `${SELF} https://outlook.office.com https://mail.customer.de`,
      );
    },
  );

  it('keeps the Outlook dialog document self-framed', async () => {
    const response = await fetchPath('/outlook/dialog.html');
    expect(response.status).toBe(200);
    expect(response.headers.get('content-security-policy')).toBe(SELF);
    expect(response.headers.get('cache-control')).toBe('no-store');
  });

  it.each(['/outlook/unknown', '/outlook/assets/unknown.js', '/embed/unknown'])(
    'returns 404 for missing non-web paths at %s',
    async (path) => {
      expect((await fetchPath(path)).status).toBe(404);
    },
  );

  it('returns 404 instead of the web shell for a missing web asset', async () => {
    const response = await fetchPath('/assets/removed-by-deploy.js');
    expect(response.status).toBe(404);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(await response.text()).not.toBe(WEB_SHELL);
  });

  it('resolves and validates framing origins separately for each request', async () => {
    const one = await fetchPath('/embed/widget.html?channel=one');
    const two = await fetchPath('/embed/widget.html?channel=two');
    expect(one.status).toBe(200);
    expect(two.status).toBe(200);
    expect(one.headers.get('cache-control')).toBe('no-store');
    expect(one.headers.get('content-security-policy')).toBe(
      `${SELF} https://one.example`,
    );
    expect(two.headers.get('content-security-policy')).toBe(
      `${SELF} https://two.example`,
    );
  });
});
