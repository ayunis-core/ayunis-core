import { isValidMcpServerUrl } from './mcp-server-url';

describe('isValidMcpServerUrl', () => {
  it.each(['https://projekte.stadt.de/mcp', 'http://localhost:8080/mcp'])(
    'accepts %s',
    (url) => {
      expect(isValidMcpServerUrl(url)).toBe(true);
    },
  );

  it.each(['file:///etc/mcp', 'javascript:alert(1)', 'not a url', ''])(
    'rejects %s',
    (url) => {
      expect(isValidMcpServerUrl(url)).toBe(false);
    },
  );
});
