/* eslint-disable sonarjs/no-hardcoded-ip -- configuration fixtures */
import { parseTrustProxy } from './trust-proxy';
import { validateEnv } from './env.validation';
import { appConfig } from './app.config';
import { ExpressAdapter } from '@nestjs/platform-express';

describe('parseTrustProxy', () => {
  it.each([undefined, '', '  ', '0'])('trusts nothing for %p', (value) => {
    expect(parseTrustProxy(value)).toBe(false);
  });

  it.each(['1', '2', ' 3 '])('parses hop count %p as a number', (value) => {
    expect(parseTrustProxy(value)).toBe(Number(value));
  });

  it('accepts explicit IPv4 and IPv6 addresses and CIDRs', () => {
    expect(
      parseTrustProxy('10.0.0.1, 192.0.2.0/24, ::1, 2001:db8::/32'),
    ).toEqual(['10.0.0.1', '192.0.2.0/24', '::1', '2001:db8::/32']);
  });

  it.each(['10.0.0.1/0', '::/0'])(
    'rejects unsupported CIDR prefix zero in %p',
    (value) => {
      expect(() => parseTrustProxy(value)).toThrow('TRUST_PROXY');
    },
  );

  it.each(['0', '1', '10.0.0.0/1', '10.0.0.1/32', '::/1', '::1/128'])(
    'produces an Express-compatible setting for %p',
    (value) => {
      const app = new ExpressAdapter().getInstance();
      expect(() =>
        app.set('trust proxy', parseTrustProxy(value)),
      ).not.toThrow();
    },
  );

  it.each([
    'true',
    'false',
    '-1',
    '1.5',
    '1e2',
    '9007199254740992',
    'loopback',
    '10.0.0.1,',
    '10.0.0.0/33',
    '::/129',
    '10.0.0.0/no',
  ])('rejects unsafe or invalid configuration %p', (value) => {
    expect(() => parseTrustProxy(value)).toThrow('TRUST_PROXY');
  });
});

describe('TRUST_PROXY boot configuration', () => {
  it('rejects malformed trust configuration during environment validation', () => {
    expect(() =>
      validateEnv({
        JWT_SECRET: 'test-secret',
        COOKIE_SECRET: 'test-cookie',
        TRUST_PROXY: 'true',
      }),
    ).toThrow('TRUST_PROXY');
  });

  it.each(['10.0.0.1/0', '::/0'])(
    'rejects %p during environment validation',
    (value) => {
      expect(() =>
        validateEnv({
          JWT_SECRET: 'test-secret',
          COOKIE_SECRET: 'test-cookie',
          TRUST_PROXY: value,
        }),
      ).toThrow('TRUST_PROXY');
    },
  );

  it('accepts numeric zero during environment validation', () => {
    const env = {
      JWT_SECRET: 'test-secret',
      COOKIE_SECRET: 'test-cookie',
      TRUST_PROXY: '0',
    };
    expect(validateEnv(env)).toBe(env);
  });

  it('exposes the parsed trust boundary to application bootstrap', () => {
    const previous = process.env.TRUST_PROXY;
    try {
      process.env.TRUST_PROXY = '1';
      expect(appConfig().trustProxy).toBe(1);
    } finally {
      if (previous === undefined) delete process.env.TRUST_PROXY;
      else process.env.TRUST_PROXY = previous;
    }
  });
});
