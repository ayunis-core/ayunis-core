import { Writable } from 'node:stream';
import { trace } from '@opentelemetry/api';
import type { Span } from '@opentelemetry/api';
import pino from 'pino';
import type { Options as PinoHttpOptions } from 'pino-http';
import { ClsServiceManager } from 'nestjs-cls';
import type { ClsService } from 'nestjs-cls';
import { PinoLogger } from 'nestjs-pino';
import type { MyClsStore } from 'src/common/context/services/context.service';
import { createPinoLoggerConfig } from './pino-logger.config';

function getOptions(environment: NodeJS.ProcessEnv): PinoHttpOptions {
  const pinoHttp = createPinoLoggerConfig(environment).pinoHttp;
  if (!pinoHttp || Array.isArray(pinoHttp) || 'write' in pinoHttp) {
    throw new Error('Expected pino-http options');
  }
  return pinoHttp;
}

function captureLog(options: PinoHttpOptions, fields: object) {
  let output = '';
  const destination = new Writable({
    write(chunk: Buffer, _encoding, callback) {
      output += chunk.toString();
      callback();
    },
  });
  const logger = pino(
    { ...options, transport: undefined, mixin: undefined },
    destination,
  );

  logger.info(fields, 'structured event');

  return JSON.parse(output) as Record<string, unknown>;
}

describe('createPinoLoggerConfig', () => {
  afterEach(() => jest.restoreAllMocks());

  it('uses readable debug logging in development', () => {
    const options = getOptions({ NODE_ENV: 'development' });

    expect(options).toMatchObject({
      level: 'debug',
      autoLogging: false,
      quietReqLogger: true,
      quietResLogger: true,
      transport: {
        target: 'pino-pretty',
        options: { colorize: true },
      },
    });
  });

  it('writes production JSON to stdout without AppSignal credentials', () => {
    const options = getOptions({ NODE_ENV: 'production' });

    expect(options.level).toBe('info');
    expect(options.transport).toBeUndefined();
  });

  it('writes production logs to stdout and AppSignal when configured', () => {
    const options = getOptions({
      NODE_ENV: 'production',
      APPSIGNAL_PUSH_API_KEY: 'configured',
    });

    expect(options.transport).toMatchObject({
      targets: [
        { target: 'pino/file', options: { destination: 1 } },
        {
          target: expect.stringContaining(
            '@appsignal/nodejs/dist/pino_transport',
          ),
          options: { group: 'app' },
        },
      ],
    });
  });

  it('preserves injected logger context and object-first metadata', () => {
    let output = '';
    const destination = new Writable({
      write(chunk: Buffer, _encoding, callback) {
        output += chunk.toString();
        callback();
      },
    });
    const rawLogger = pino({}, destination);
    const logger = new PinoLogger({
      renameContext: 'nestjs.context',
      pinoHttp: { logger: rawLogger },
    });
    logger.setContext('TriggerPasswordResetUseCase');

    logger.info({ orgId: 'org-456' }, 'execute');

    expect(JSON.parse(output)).toMatchObject({
      msg: 'execute',
      orgId: 'org-456',
      'nestjs.context': 'TriggerPasswordResetUseCase',
    });
  });

  it('redacts identity, content, and request secrets while preserving opaque ids', () => {
    const options = getOptions({ NODE_ENV: 'production' });
    const providerError = Object.assign(new Error('provider request failed'), {
      config: {
        headers: { Authorization: 'Bearer provider-secret' },
        data: 'private request body',
      },
    });
    const entry = captureLog(options, {
      err: providerError,
      email: 'resident@example.org',
      name: 'Resident Name',
      text: 'private message',
      query: {
        authorization: 'Bearer private-token',
        email: 'nested@example.org',
      },
      connection: {
        emailDomains: [
          { emailDomain: 'resident.example', verifiedAt: '2026-08-28' },
        ],
      },
      confirmation: {
        reviewedEmailDomains: ['resident.example'],
      },
      userId: 'user-123',
      orgId: 'org-456',
      model: 'gpt-5',
    });

    expect(entry).toMatchObject({
      err: '[Redacted]',
      email: '[Redacted]',
      name: '[Redacted]',
      text: '[Redacted]',
      query: {
        authorization: '[Redacted]',
        email: '[Redacted]',
      },
      connection: { emailDomains: '[Redacted]' },
      confirmation: { reviewedEmailDomains: '[Redacted]' },
      userId: 'user-123',
      orgId: 'org-456',
      model: 'gpt-5',
    });
  });

  it('adds active CLS tenant and trace context to each entry', () => {
    const cls = {
      isActive: jest.fn().mockReturnValue(true),
      get: jest.fn((key: string) => {
        if (key === 'userId') return 'user-123';
        if (key === 'orgId') return 'org-456';
        return undefined;
      }),
    } as unknown as ClsService<MyClsStore>;
    jest.spyOn(ClsServiceManager, 'getClsService').mockReturnValue(cls);
    jest.spyOn(trace, 'getActiveSpan').mockReturnValue({
      spanContext: () => ({
        traceId: '1234567890abcdef1234567890abcdef',
        spanId: '1234567890abcdef',
        traceFlags: 1,
      }),
    } as Span);
    const options = getOptions({ NODE_ENV: 'production' });

    expect(options.mixin?.({}, 30, pino({ enabled: false }))).toEqual({
      'user.id': 'user-123',
      'org.id': 'org-456',
      trace_id: '1234567890abcdef1234567890abcdef',
      span_id: '1234567890abcdef',
    });
  });

  it('omits inactive CLS and trace context', () => {
    const cls = {
      isActive: jest.fn().mockReturnValue(false),
    } as unknown as ClsService<MyClsStore>;
    jest.spyOn(ClsServiceManager, 'getClsService').mockReturnValue(cls);
    jest.spyOn(trace, 'getActiveSpan').mockReturnValue(undefined);
    const options = getOptions({ NODE_ENV: 'production' });

    expect(options.mixin?.({}, 30, pino({ enabled: false }))).toEqual({});
  });
});
