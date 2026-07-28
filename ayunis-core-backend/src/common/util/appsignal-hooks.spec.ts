// appsignal-hooks.cjs is a plain CJS module loaded by appsignal.cjs before
// the app boots; require() mirrors how it is consumed there.

type UndiciRequest = {
  method?: string;
  headers: string | (string | string[])[];
};

// eslint-disable-next-line @typescript-eslint/no-require-imports
const hooks = require('../../../appsignal-hooks.cjs') as {
  isCrawlerRequest: (request: UndiciRequest) => boolean;
  isMcpEventStreamRequest: (request: UndiciRequest) => boolean;
  shouldIgnoreRequest: (request: UndiciRequest) => boolean;
  CRAWLER_USER_AGENT: string;
};

const {
  isCrawlerRequest,
  isMcpEventStreamRequest,
  shouldIgnoreRequest,
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

describe('isMcpEventStreamRequest', () => {
  it('matches the MCP SDK listening stream', () => {
    expect(
      isMcpEventStreamRequest({
        method: 'GET',
        headers: ['accept', 'text/event-stream'],
      }),
    ).toBe(true);
  });

  it('matches undici v5 string headers', () => {
    expect(
      isMcpEventStreamRequest({
        method: 'GET',
        headers: 'Accept: text/event-stream\r\n',
      }),
    ).toBe(true);
  });

  // The JSON-RPC POST sends `application/json, text/event-stream` — genuine
  // connectivity and auth failures surface there and must keep reporting.
  it('does not match the MCP JSON-RPC POST', () => {
    expect(
      isMcpEventStreamRequest({
        method: 'POST',
        headers: ['accept', 'application/json, text/event-stream'],
      }),
    ).toBe(false);
  });

  it('does not match a GET that merely accepts event streams among others', () => {
    expect(
      isMcpEventStreamRequest({
        method: 'GET',
        headers: ['accept', 'application/json, text/event-stream'],
      }),
    ).toBe(false);
  });

  it('does not match a plain GET', () => {
    expect(
      isMcpEventStreamRequest({
        method: 'GET',
        headers: ['accept', 'application/json'],
      }),
    ).toBe(false);
  });

  it('does not match when the method is absent', () => {
    expect(
      isMcpEventStreamRequest({ headers: ['accept', 'text/event-stream'] }),
    ).toBe(false);
  });
});

describe('shouldIgnoreRequest', () => {
  it('ignores crawler requests', () => {
    expect(
      shouldIgnoreRequest({ headers: ['user-agent', CRAWLER_USER_AGENT] }),
    ).toBe(true);
  });

  it('ignores the MCP listening stream', () => {
    expect(
      shouldIgnoreRequest({
        method: 'GET',
        headers: ['accept', 'text/event-stream'],
      }),
    ).toBe(true);
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
