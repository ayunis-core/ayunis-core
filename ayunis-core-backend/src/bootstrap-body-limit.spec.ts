import { Controller, Module, Post } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';

// Guards the framework contract main.ts depends on: `NestFactory.create()`
// does NOT register body parsers — `listen()` does, via `init()`, and it skips
// any parser already applied by name. So `useBodyParser` called between the
// two wins, and the configured limit is the one enforced.
//
// This replicates main.ts's ordering rather than importing it, because main.ts
// calls `Bootstrap.start()` at module scope. If Nest ever moves parser
// registration into `create()`, this fails and main.ts's limit is silently
// back to the 100kb default (AYC-553).
@Controller()
class EchoController {
  @Post('echo')
  echo(): { ok: boolean } {
    return { ok: true };
  }
}

@Module({ controllers: [EchoController] })
class EchoModule {}

describe('body parser limit configured after NestFactory.create', () => {
  let app: NestExpressApplication;
  let url: string;

  beforeAll(async () => {
    app = await NestFactory.create<NestExpressApplication>(EchoModule, {
      logger: false,
    });
    // Same order as main.ts: configure, then listen.
    app.useBodyParser('json', { limit: '5mb' });
    app.useBodyParser('urlencoded', { limit: '5mb', extended: true });
    await app.listen(0);

    const { port } = app.getHttpServer().address() as {
      port: number;
    };
    url = `http://127.0.0.1:${port}/echo`;
  });

  afterAll(async () => {
    await app?.close();
  });

  async function postJsonOfBytes(bytes: number): Promise<number> {
    const body = JSON.stringify({ payload: 'x'.repeat(bytes) });
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    });
    return response.status;
  }

  it('accepts a 300kb body, which the 100kb Express default would reject', async () => {
    expect(await postJsonOfBytes(300_000)).toBe(201);
  });

  it('still rejects a body beyond the configured limit', async () => {
    expect(await postJsonOfBytes(6_000_000)).toBe(413);
  });

  it('registers exactly one json parser, not the default alongside ours', () => {
    const instance = app.getHttpAdapter().getInstance() as {
      router: { stack: { handle?: { name?: string } }[] };
    };
    const jsonParsers = instance.router.stack.filter(
      (layer) => layer.handle?.name === 'jsonParser',
    );
    expect(jsonParsers).toHaveLength(1);
  });
});
