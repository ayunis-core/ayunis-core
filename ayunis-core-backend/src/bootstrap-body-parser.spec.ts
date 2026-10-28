import { Body, Controller, Module, Post } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import type { ErrorRequestHandler } from 'express';
import {
  MALFORMED_JSON_BODY,
  jsonBodyParser,
} from 'src/common/middleware/json-body-parser.middleware';

// Guards the framework contract main.ts depends on: with `bodyParser: false`
// Nest registers no parsers of its own, so the ones main.ts applies before
// `listen()` are the only ones and their limit is the one enforced (AYC-553).
//
// This replicates main.ts's configuration rather than importing it, because
// main.ts calls `Bootstrap.start()` at module scope.
@Controller()
class EchoController {
  @Post('echo')
  echo(@Body() body: unknown): unknown {
    return body;
  }
}

@Module({ controllers: [EchoController] })
class EchoModule {}

describe('body parsers configured as in main.ts', () => {
  let app: NestExpressApplication;
  let url: string;
  const parserErrors: unknown[] = [];

  beforeAll(async () => {
    app = await NestFactory.create<NestExpressApplication>(EchoModule, {
      logger: false,
      bodyParser: false,
    });
    app.use(jsonBodyParser({ limit: '5mb' }));
    app.useBodyParser('urlencoded', { limit: '5mb', extended: true });
    // The express instrumentation records whatever the parser layer passes
    // to next(); this captures that same object before Nest handles it.
    const captureParserError: ErrorRequestHandler = (
      error,
      _req,
      _res,
      next,
    ) => {
      parserErrors.push(error);
      next(error);
    };
    app.use(captureParserError);
    await app.listen(0);

    const { port } = app.getHttpServer().address() as {
      port: number;
    };
    url = `http://127.0.0.1:${port}/echo`;
  });

  afterAll(async () => {
    await app?.close();
  });

  beforeEach(() => {
    parserErrors.length = 0;
  });

  async function postJson(body: string): Promise<Response> {
    return fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    });
  }

  async function postJsonWithPayloadSize(payloadSize: number): Promise<number> {
    const response = await postJson(
      JSON.stringify({ payload: 'x'.repeat(payloadSize) }),
    );
    return response.status;
  }

  it('accepts a 300kb body, which the 100kb Express default would reject', async () => {
    expect(await postJsonWithPayloadSize(300_000)).toBe(201);
  });

  it('still rejects a body beyond the configured limit', async () => {
    expect(await postJsonWithPayloadSize(6_000_000)).toBe(413);
  });

  it("does not register Nest's default json parser alongside ours", () => {
    const instance = app.getHttpAdapter().getInstance() as {
      router: { stack: { handle?: { name?: string } }[] };
    };
    const defaultJsonParsers = instance.router.stack.filter(
      (layer) => layer.handle?.name === 'jsonParser',
    );
    expect(defaultJsonParsers).toHaveLength(0);
  });

  it('parses valid json and records no parser error', async () => {
    const response = await postJson('{"hello":"world"}');

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ hello: 'world' });
    expect(parserErrors).toHaveLength(0);
  });

  // Incident #723 (AYC-1226): an external PowerShell client sent an extra
  // closing brace after the JSON object.
  describe('malformed json from a client', () => {
    const malformed =
      '{"model":"ayunis","messages":[{"role":"user","content":"hi"}]}}';

    it('still answers 400', async () => {
      const response = await postJson(malformed);

      expect(response.status).toBe(400);
      expect(await response.json()).toMatchObject({
        statusCode: 400,
        error: 'Bad Request',
      });
    });

    // MALFORMED_JSON_BODY is an `ignoreErrors` entry in appsignal-hooks.cjs.
    it('tags malformed JSON before forwarding the parser error', async () => {
      await postJson(malformed);

      expect(parserErrors).toEqual([
        expect.objectContaining({ code: MALFORMED_JSON_BODY }),
      ]);
    });
  });
});
