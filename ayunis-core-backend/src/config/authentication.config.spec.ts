import { authenticationConfig } from './authentication.config';

describe('authenticationConfig', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.JWT_SECRET;
    delete process.env.COOKIE_SECRET;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('required secrets', () => {
    it('reads secrets from the environment when set', () => {
      process.env.NODE_ENV = 'development';
      process.env.JWT_SECRET = 'my-jwt-secret';
      process.env.COOKIE_SECRET = 'my-cookie-secret';

      const config = authenticationConfig();

      expect(config.jwt.secret).toBe('my-jwt-secret');
      expect(config.cookie.secret).toBe('my-cookie-secret');
    });

    it.each(['development', 'test', 'production'])(
      'throws when both secrets are missing in %s',
      (nodeEnv) => {
        process.env.NODE_ENV = nodeEnv;

        expect(() => authenticationConfig()).toThrow(/JWT_SECRET/);
        expect(() => authenticationConfig()).toThrow(/COOKIE_SECRET/);
      },
    );

    it('throws when NODE_ENV is unset and secrets are missing', () => {
      delete process.env.NODE_ENV;

      expect(() => authenticationConfig()).toThrow(/JWT_SECRET/);
    });

    it('throws when only JWT_SECRET is missing', () => {
      process.env.NODE_ENV = 'development';
      process.env.COOKIE_SECRET = 'cookie';

      expect(() => authenticationConfig()).toThrow(/JWT_SECRET/);
    });

    it('throws when only COOKIE_SECRET is missing', () => {
      process.env.NODE_ENV = 'development';
      process.env.JWT_SECRET = 'jwt';

      expect(() => authenticationConfig()).toThrow(/COOKIE_SECRET/);
    });

    it('treats an empty-string secret as missing', () => {
      process.env.NODE_ENV = 'development';
      process.env.JWT_SECRET = '';
      process.env.COOKIE_SECRET = '';

      expect(() => authenticationConfig()).toThrow(/JWT_SECRET/);
    });

    it('does not throw when both secrets are set', () => {
      process.env.NODE_ENV = 'production';
      process.env.JWT_SECRET = 'jwt';
      process.env.COOKIE_SECRET = 'cookie';

      expect(() => authenticationConfig()).not.toThrow();
    });
  });
});
