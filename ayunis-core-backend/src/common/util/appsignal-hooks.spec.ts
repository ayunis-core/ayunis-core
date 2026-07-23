// appsignal-hooks.cjs is a plain CJS module loaded by appsignal.cjs before
// the app boots; require() mirrors how it is consumed there.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const hooks = require('../../../appsignal-hooks.cjs') as {
  isCrawlerRequest: (request: {
    headers: string | (string | string[])[];
  }) => boolean;
  CRAWLER_USER_AGENT: string;
};

const { isCrawlerRequest, CRAWLER_USER_AGENT } = hooks;

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
      expect(
        isCrawlerRequest({ headers: 'User-Agent: curl/8.0\r\n' }),
      ).toBe(false);
    });

    it('does not match an empty header string', () => {
      expect(isCrawlerRequest({ headers: '' })).toBe(false);
    });
  });
});
