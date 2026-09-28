import { NestFactory } from '@nestjs/core';
import { Module, type INestApplication } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { serveFrontendOptions } from './serve-frontend.options';

describe('serveFrontendOptions', () => {
  let app: INestApplication;
  let baseUrl: string;
  let rootPath: string;

  beforeAll(async () => {
    rootPath = mkdtempSync(join(tmpdir(), 'frontend-'));
    mkdirSync(join(rootPath, 'assets'));
    writeFileSync(join(rootPath, 'index.html'), '<div id="app"></div>');
    writeFileSync(join(rootPath, 'assets', 'index-abc.js'), 'export {}');

    // serve-static picks its loader from the HTTP adapter when the module is
    // instantiated; Test.createTestingModule has none yet and falls back to a
    // no-op loader, so the app must come from NestFactory.
    @Module({
      imports: [ServeStaticModule.forRoot(serveFrontendOptions(rootPath))],
    })
    class FrontendModule {}
    app = await NestFactory.create(FrontendModule, { logger: false });
    await app.listen(0);
    baseUrl = await app.getUrl();
  });

  afterAll(async () => {
    await app.close();
    rmSync(rootPath, { recursive: true, force: true });
  });

  const cacheControl = async (path: string) =>
    (await fetch(`${baseUrl}${path}`)).headers.get('cache-control');

  // A stored index.html is reused without revalidation when Chrome restores
  // a discarded tab (back_forward load), pinning the tab to asset hashes a
  // later deploy removed. Only no-store prevents that; no-cache does not.
  it.each(['/', '/index.html', '/login', '/admin-settings/integrations'])(
    'forbids storing the SPA shell at %s',
    async (path) => {
      expect(await cacheControl(path)).toBe('no-store');
    },
  );

  it('leaves hashed assets on the default caching', async () => {
    expect(await cacheControl('/assets/index-abc.js')).toBe(
      'public, max-age=0',
    );
  });
});
