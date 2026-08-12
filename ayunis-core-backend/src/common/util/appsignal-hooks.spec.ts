// appsignal-hooks.cjs is a plain CJS module loaded by appsignal.cjs before
// the app boots; require() mirrors how it is consumed there.
import createHttpError from 'http-errors';
import { errors as undiciErrors } from 'undici';
import { JobRetryScheduledError } from '../../domain/sources/infrastructure/queue/bullmq-job.helpers';
import { MarketplaceUnavailableError } from '../../domain/marketplace/application/marketplace.errors';

type UndiciRequest = {
  method?: string;
  headers: string | (string | string[])[];
};

type Suppression = {
  id: string;
  lever: 'ignoreRequestHook' | 'ignoreErrors' | 'disableInstrumentation';
  ticket: string;
  reason: string;
  stopgapFor?: string;
  match?: (request: UndiciRequest) => boolean;
  exceptionType?: string;
  instrumentation?: string;
};

// eslint-disable-next-line @typescript-eslint/no-require-imports
const hooks = require('../../../appsignal-hooks.cjs') as {
  SUPPRESSIONS: Suppression[];
  isCrawlerRequest: (request: UndiciRequest) => boolean;
  shouldIgnoreRequest: (request: UndiciRequest) => boolean;
  exceptionTypeOf: (error: unknown) => string | undefined;
  ignoredErrorTypes: string[];
  disabledInstrumentations: string[];
  CRAWLER_USER_AGENT: string;
};

const {
  SUPPRESSIONS,
  isCrawlerRequest,
  shouldIgnoreRequest,
  exceptionTypeOf,
  ignoredErrorTypes,
  disabledInstrumentations,
  CRAWLER_USER_AGENT,
} = hooks;

describe('isCrawlerRequest', () => {
  describe('undici v6 array headers', () => {
    it('matches a request carrying the crawler user agent', () => {
      expect(
        isCrawlerRequest({
          headers: ['accept', 'text/html', 'User-Agent', CRAWLER_USER_AGENT],
        }),
      ).toBe(true);
    });

    it('matches case-insensitively on the header name', () => {
      expect(
        isCrawlerRequest({ headers: ['user-agent', CRAWLER_USER_AGENT] }),
      ).toBe(true);
    });

    it('handles array-valued headers', () => {
      expect(
        isCrawlerRequest({ headers: ['user-agent', [CRAWLER_USER_AGENT]] }),
      ).toBe(true);
    });

    it('does not match a different user agent', () => {
      expect(
        isCrawlerRequest({ headers: ['user-agent', 'node-fetch/3.0'] }),
      ).toBe(false);
    });

    it('does not match when no user agent header is present', () => {
      expect(isCrawlerRequest({ headers: ['accept', 'text/html'] })).toBe(
        false,
      );
    });
  });

  describe('undici v5 string headers', () => {
    it('matches a request carrying the crawler user agent', () => {
      expect(
        isCrawlerRequest({
          headers: `accept: text/html\r\nUser-Agent: ${CRAWLER_USER_AGENT}\r\n`,
        }),
      ).toBe(true);
    });

    it('does not match a different user agent', () => {
      expect(isCrawlerRequest({ headers: 'User-Agent: curl/8.0\r\n' })).toBe(
        false,
      );
    });

    it('does not match an empty header string', () => {
      expect(isCrawlerRequest({ headers: '' })).toBe(false);
    });
  });
});

describe('shouldIgnoreRequest', () => {
  it('ignores crawler requests', () => {
    expect(
      shouldIgnoreRequest({ headers: ['user-agent', CRAWLER_USER_AGENT] }),
    ).toBe(true);
  });

  it('instruments MCP listening streams', () => {
    expect(
      shouldIgnoreRequest({
        method: 'GET',
        headers: ['accept', 'text/event-stream'],
      }),
    ).toBe(false);
  });

  it('instruments provider requests', () => {
    expect(
      shouldIgnoreRequest({
        method: 'POST',
        headers: ['user-agent', 'OpenAI/JS 4.104.0'],
      }),
    ).toBe(false);
  });
});

describe('exceptionTypeOf', () => {
  // Mirrors @opentelemetry/sdk-trace-base's Span.recordException, which is
  // what decides the string AppSignal's agent matches ignoreErrors against.
  it('prefers code over name', () => {
    const error = Object.assign(new Error('boom'), { code: 'ECONNABORTED' });
    expect(exceptionTypeOf(error)).toBe('ECONNABORTED');
  });

  it('falls back to name when there is no code', () => {
    expect(exceptionTypeOf(new TypeError('boom'))).toBe('TypeError');
  });

  it('falls back to name when code is falsy', () => {
    const error = Object.assign(new Error('boom'), { code: '' });
    expect(exceptionTypeOf(error)).toBe('Error');
  });

  it('stringifies a numeric code', () => {
    const error = Object.assign(new Error('boom'), { code: 413 });
    expect(exceptionTypeOf(error)).toBe('413');
  });

  it('returns undefined for a missing error', () => {
    expect(exceptionTypeOf(undefined)).toBeUndefined();
  });
});

// A real instance of each error an `ignoreErrors` entry claims to suppress.
// Keyed by suppression id so an entry cannot be added without one.
const ERROR_SAMPLES: Record<string, () => Error> = {
  // The exact object Node mints for AbortController.abort(): name
  // 'AbortError', numeric code 20 — exceptionType stringifies to '20'.
  'abort-signal-cancellation': () =>
    new DOMException('This operation was aborted', 'AbortError'),
  'bullmq-retry-scheduled': () =>
    new JobRetryScheduledError(new Error('upstream failed')),
  'marketplace-unavailable': () => new MarketplaceUnavailableError(),
  'oversized-request-body': () =>
    createHttpError(413, 'request entity too large', {
      type: 'entity.too.large',
    }),
  'transport-headers-timeout': () => new undiciErrors.HeadersTimeoutError(),
  // Node mints errno errors as plain Errors carrying `code`; these mirror
  // the exact shapes seen in incidents #409, #387, #457, #511.
  'transport-dns-again': () =>
    Object.assign(new Error('getaddrinfo EAI_AGAIN core-connect.ayunis.de'), {
      code: 'EAI_AGAIN',
      hostname: 'core-connect.ayunis.de',
    }),
  'transport-connection-reset': () =>
    Object.assign(new Error('socket hang up'), { code: 'ECONNRESET' }),
  'transport-connection-aborted': () =>
    Object.assign(new Error('timeout of 30000ms exceeded'), {
      code: 'ECONNABORTED',
    }),
  // The shape axios produces with clarifyTimeoutError: true — the anonymize
  // client's deadline errno since AYC-654.
  'transport-timed-out': () =>
    Object.assign(new Error('timeout of 60000ms exceeded'), {
      code: 'ETIMEDOUT',
    }),
  'transport-broken-pipe': () =>
    Object.assign(new Error('write EPIPE'), {
      code: 'EPIPE',
      errno: -32,
      syscall: 'write',
    }),
  // The exact object Node mints for AbortSignal.timeout(): name
  // 'TimeoutError', numeric code 23 — exceptionType stringifies to '23'.
  'timeout-signal-cancellation': () =>
    new DOMException(
      'The operation was aborted due to timeout',
      'TimeoutError',
    ),
};

describe('SUPPRESSIONS registry', () => {
  it('is not empty', () => {
    expect(SUPPRESSIONS.length).toBeGreaterThan(0);
  });

  it.each(SUPPRESSIONS.map((s) => [s.id, s] as const))(
    '%s carries a reason and a ticket',
    (_id, suppression) => {
      expect(suppression.reason.trim().length).toBeGreaterThan(0);
      expect(suppression.ticket).toMatch(/^AYC-\d+$/);
      if (suppression.stopgapFor !== undefined) {
        expect(suppression.stopgapFor).toMatch(/^AYC-\d+$/);
      }
    },
  );

  it('has unique ids', () => {
    const ids = SUPPRESSIONS.map((suppression) => suppression.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  describe('ignoreRequestHook entries', () => {
    const entries = SUPPRESSIONS.filter(
      (s) => s.lever === 'ignoreRequestHook',
    ).map((s) => [s.id, s] as const);

    it.each(entries)('%s supplies a predicate', (_id, suppression) => {
      expect(typeof suppression.match).toBe('function');
    });
  });

  describe('ignoreErrors entries', () => {
    const entries = SUPPRESSIONS.filter((s) => s.lever === 'ignoreErrors').map(
      (s) => [s.id, s] as const,
    );

    it('are all exported as ignoredErrorTypes', () => {
      expect(ignoredErrorTypes).toEqual(
        entries.map(([, s]) => s.exceptionType),
      );
    });

    it.each(entries)('%s has a sample error', (id) => {
      expect(ERROR_SAMPLES[id]).toBeDefined();
    });

    // The whole point of the registry. OpenTelemetry derives exception.type as
    // `code ?? name`, so an entry naming a class whose instances carry a
    // `.code` suppresses nothing — silently, in production, forever. Asserting
    // against a real instance turns that into a build failure.
    it.each(entries)(
      '%s suppresses the type its error actually reports',
      (id, suppression) => {
        const sample = ERROR_SAMPLES[id];
        expect(exceptionTypeOf(sample())).toBe(suppression.exceptionType);
      },
    );
  });

  describe('disableInstrumentation entries', () => {
    const entries = SUPPRESSIONS.filter(
      (s) => s.lever === 'disableInstrumentation',
    ).map((s) => [s.id, s] as const);

    it('are all exported as disabledInstrumentations', () => {
      expect(disabledInstrumentations).toEqual(
        entries.map(([, s]) => s.instrumentation),
      );
    });

    // AppSignal does not export its DefaultInstrumentations map and the
    // packages are not resolvable from this workspace under pnpm's strict
    // layout, so this checks the package-name shape rather than membership.
    it.each(entries)('%s names an instrumentation package', (_id, s) => {
      expect(s.instrumentation).toMatch(
        /^@(opentelemetry|appsignal)\/(opentelemetry-)?instrumentation-[a-z0-9-]+$/,
      );
    });
  });
});
