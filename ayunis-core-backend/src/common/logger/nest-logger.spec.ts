import { Writable } from 'node:stream';
import type { AddressInfo } from 'node:net';
import { Controller, Get, Injectable, Logger, Module } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import pino from 'pino';
import type { Options as PinoHttpOptions } from 'pino-http';
import { LoggerModule } from 'nestjs-pino';
import { installNestLogger } from 'src/common/logger/install-nest-logger';
import { LoggingModule } from 'src/common/logger/logging.module';
import { createPinoLoggerConfig } from 'src/common/logger/pino-logger.config';

const entries: Record<string, unknown>[] = [];

@Injectable()
class ProbeService {
  private readonly logger = new Logger(ProbeService.name);

  emit(level: 'log' | 'warn' | 'error' | 'debug' | 'verbose' | 'fatal'): void {
    this.logger[level]({ model: 'gpt-5' }, 'probe');
  }

  emitProviderFailure(err: Error): void {
    this.logger.error(
      { err, model: 'gpt-5', provider: 'openai' },
      'Provider request failed',
    );
  }

  emitError(err: Error): void {
    this.logger.error(err);
  }

  emitPlainMessage(): void {
    this.logger.log('plain message');
  }
}

@Controller()
class ProbeController {
  private readonly logger = new Logger(ProbeController.name);

  @Get('probe')
  handle(): string {
    this.logger.log({ threadId: 'thread-1' }, 'handled');
    return 'ok';
  }
}

function productionPinoOptions(): PinoHttpOptions {
  const { pinoHttp } = createPinoLoggerConfig({ NODE_ENV: 'production' });
  if (!pinoHttp || Array.isArray(pinoHttp) || 'write' in pinoHttp) {
    throw new Error('Expected pino-http options');
  }
  // The real transport would ship entries to a worker thread; every other
  // option (level, redaction, mixin, renameContext) is exercised as configured.
  return { ...pinoHttp, level: 'trace', transport: undefined };
}

const destination = new Writable({
  write(chunk: Buffer, _encoding, callback) {
    for (const line of chunk.toString().trim().split('\n')) {
      entries.push(JSON.parse(line) as Record<string, unknown>);
    }
    callback();
  },
});

/** Mirrors LoggingModule, but writes to a stream the test can read. */
@Module({
  imports: [
    LoggerModule.forRoot({
      ...createPinoLoggerConfig({ NODE_ENV: 'production' }),
      pinoHttp: {
        ...productionPinoOptions(),
        logger: pino(productionPinoOptions(), destination),
      },
    }),
  ],
})
class TestLoggingModule {}

describe('Nest logger adapter', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [TestLoggingModule],
      controllers: [ProbeController],
      providers: [ProbeService],
    }).compile();

    app = moduleRef.createNestApplication();
    installNestLogger(app);
    await app.init();
  });

  afterAll(async () => {
    Logger.overrideLogger(false);
    await app.close();
  });

  beforeEach(() => {
    entries.length = 0;
  });

  function probe(): ProbeService {
    return app.get(ProbeService);
  }

  it('keeps the class name in nestjs.context and object-first metadata intact', () => {
    probe().emit('log');

    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      level: 30,
      msg: 'probe',
      model: 'gpt-5',
      'nestjs.context': 'ProbeService',
    });
  });

  it.each([
    ['verbose', 10],
    ['debug', 20],
    ['log', 30],
    ['warn', 40],
    ['error', 50],
    ['fatal', 60],
  ] as const)('maps %s to pino level %i', (method, level) => {
    probe().emit(method);

    expect(entries[0]).toMatchObject({ level, msg: 'probe' });
  });

  it('preserves the object-first error contract used by provider failures', () => {
    probe().emitProviderFailure(new Error('provider request failed'));

    expect(entries[0]).toMatchObject({
      level: 50,
      msg: 'Provider request failed',
      model: 'gpt-5',
      provider: 'openai',
      'nestjs.context': 'ProbeService',
      // `err` is a redacted key, so the serialized error never leaves the process
      err: '[Redacted]',
    });
  });

  it('serializes a bare Error argument under the err key', () => {
    probe().emitError(new Error('boom'));

    expect(entries[0]).toMatchObject({
      level: 50,
      err: '[Redacted]',
      'nestjs.context': 'ProbeService',
    });
  });

  it('logs string-only messages without an empty metadata object', () => {
    probe().emitPlainMessage();

    expect(entries[0]).toMatchObject({
      level: 30,
      msg: 'plain message',
      'nestjs.context': 'ProbeService',
    });
  });

  // Nesting LoggerModule inside another module must not drop its middleware,
  // which is what binds the request-scoped child logger.
  it('binds the request-scoped logger for logs emitted inside a request', async () => {
    await app.listen(0);
    const { port } = app.getHttpServer().address() as AddressInfo;

    await fetch(`http://127.0.0.1:${port}/probe`);

    expect(entries).toEqual([
      expect.objectContaining({
        msg: 'handled',
        threadId: 'thread-1',
        'nestjs.context': 'ProbeController',
        reqId: expect.anything(),
      }),
    ]);
  });
});

describe('LoggingModule', () => {
  it('exposes the Pino-backed Nest logger that installNestLogger resolves', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [LoggingModule],
    }).compile();
    const app = moduleRef.createNestApplication();
    await app.init();

    expect(() => installNestLogger(app)).not.toThrow();

    Logger.overrideLogger(false);
    await app.close();
  });
});
