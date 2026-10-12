import { Writable } from 'node:stream';
import { trace } from '@opentelemetry/api';
import type { Span } from '@opentelemetry/api';
import pino from 'pino';
import { QueryFailedError } from 'typeorm';
import pinoHttp, { type Options as PinoHttpOptions } from 'pino-http';
import { ClsServiceManager } from 'nestjs-cls';
import type { ClsService } from 'nestjs-cls';
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
  const logger = pinoHttp(
    { ...options, transport: undefined, mixin: undefined },
    destination,
  ).logger;

  logger.info(fields);

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

  it('redacts identity, content, and request secrets while preserving opaque ids', () => {
    const options = getOptions({ NODE_ENV: 'production' });
    const providerError = Object.assign(
      new Error('provider request failed: invalid value "private prompt"'),
      {
        config: {
          headers: { Authorization: 'Bearer provider-secret' },
          data: 'private request body',
        },
      },
    );
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
      err: {
        type: 'Error',
        message: '[Redacted]',
      },
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
    expect(entry.err).not.toHaveProperty('config');
    for (const secret of [
      'private prompt',
      'provider-secret',
      'private request body',
    ]) {
      expect(JSON.stringify(entry)).not.toContain(secret);
    }
  });

  it.each([
    'Could not parse date resident@example.org',
    'Request failed https://private.example/path?token=private-token',
    'Could not open resident-private-document.pdf',
    'Provider rejected private prompt without punctuation',
  ])('censors untrusted error text throughout the entry: %s', (message) => {
    const options = getOptions({ NODE_ENV: 'production' });
    const error = new Error(message);
    const entry = captureLog(options, {
      err: error,
      error,
      wrapped: { err: error },
    });

    expect(JSON.stringify(entry)).not.toContain(message);
    expect(entry).toMatchObject({
      err: { type: 'Error', message: '[Redacted]' },
      error: { type: 'Error', message: '[Redacted]' },
      wrapped: { err: '[Redacted]' },
    });
    expect(entry.err).not.toHaveProperty('stack');
  });

  it('keeps recognized codes and safe summaries through the cause chain', () => {
    const options = getOptions({ NODE_ENV: 'production' });
    const cause = Object.assign(new Error('private prompt'), {
      code: '57014',
      detail: 'Key (email)=(resident@example.org) already exists.',
    });
    const wrapped = Object.assign(new Error('private wrapper message'), {
      cause,
      metadata: { prompt: 'private prompt' },
    });
    const entry = captureLog(options, { err: wrapped });

    expect(entry.err).toEqual({
      type: 'Error',
      message: '[Redacted]',
      cause: {
        type: 'Error',
        message: 'Database query canceled',
        code: '57014',
      },
    });
    expect(JSON.stringify(entry)).not.toContain('private');
    expect(JSON.stringify(entry)).not.toContain('resident@example.org');
  });

  it('omits private text in a copied stack even when it matches V8 frame syntax', () => {
    const options = getOptions({ NODE_ENV: 'production' });
    const original = new Error('rejected\n    at private prompt (fake.js:1:1)');
    const wrapper = new Error('retry exhausted', { cause: original });
    wrapper.stack = original.stack;
    const entry = captureLog(options, { err: wrapper });

    expect(JSON.stringify(entry)).not.toContain('private prompt');
    expect(entry.err).not.toHaveProperty('stack');
    expect(entry.err).toMatchObject({
      cause: { type: 'Error', message: '[Redacted]' },
    });
  });

  it('classifies TypeORM failures without copying query or driver text', () => {
    const options = getOptions({ NODE_ENV: 'production' });
    const driverError = Object.assign(
      new Error('relation private does not exist'),
      {
        code: '42P01',
        table: 'private_table',
        column: 'private_column',
        constraint: 'private_constraint',
        detail: 'resident@example.org',
      },
    );
    const entry = captureLog(options, {
      err: new QueryFailedError('SELECT private', ['private'], driverError),
    });

    expect(entry.err).toEqual({
      type: 'QueryFailedError',
      message: 'Database table does not exist',
      code: '42P01',
    });
    expect(JSON.stringify(entry)).not.toContain('private');
    expect(JSON.stringify(entry)).not.toContain('resident@example.org');
  });

  it.each([
    ['ECONNREFUSED', 'Connection refused'],
    ['ETIMEDOUT', 'Connection timed out'],
    ['ENOTFOUND', 'DNS lookup failed'],
  ])('retains safe network diagnostics for %s', (code, message) => {
    const error = Object.assign(new Error('private.example'), { code });
    const entry = captureLog(getOptions({ NODE_ENV: 'production' }), {
      err: error,
    });

    expect(entry.err).toEqual({ type: 'Error', code, message });
    expect(JSON.stringify(entry)).not.toContain('private.example');
  });

  it('does not trust error names or arbitrary diagnostic codes', () => {
    const error = Object.assign(new Error('private message'), {
      name: 'resident@example.org',
      code: 'private-token',
    });
    const entry = captureLog(getOptions({ NODE_ENV: 'production' }), {
      err: error,
    });

    expect(entry.err).toEqual({ type: 'Error', message: '[Redacted]' });
  });

  it('censors implicit messages from non-Error err objects', () => {
    const entry = captureLog(getOptions({ NODE_ENV: 'production' }), {
      err: { message: 'resident@example.org' },
    });

    expect(entry).toMatchObject({ err: '[Redacted]', msg: '[Redacted]' });
    expect(JSON.stringify(entry)).not.toContain('resident@example.org');
  });

  it('preserves an explicit inline application message', () => {
    const entry = captureLog(getOptions({ NODE_ENV: 'production' }), {
      err: new Error('resident@example.org'),
      msg: 'Scheduled cleanup failed',
    });

    expect(entry.msg).toBe('Scheduled cleanup failed');
    expect(JSON.stringify(entry)).not.toContain('resident@example.org');
  });

  it('caps cyclic cause chains', () => {
    const error = new Error('private message');
    error.cause = error;
    const entry = captureLog(getOptions({ NODE_ENV: 'production' }), {
      err: error,
    });
    let current = entry.err as { cause?: unknown };
    let count = 1;
    while (current.cause) {
      current = current.cause;
      count++;
    }

    expect(count).toBe(6);
    expect(JSON.stringify(entry)).not.toContain('private message');
  });

  it('serializes the error key the same way and keeps non-errors redacted', () => {
    const options = getOptions({ NODE_ENV: 'production' });
    const entry = captureLog(options, {
      error: new RangeError('out of range'),
      err: 'a private string',
      nested: { err: new Error('nested'), error: 'nested string' },
    });

    expect(entry).toMatchObject({
      error: { type: 'RangeError', message: '[Redacted]' },
      err: '[Redacted]',
      nested: { err: '[Redacted]', error: '[Redacted]' },
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
