import { describe, expect, it } from 'vitest';
import { isValidMcpServerUrl } from './mcp-server-url';

describe('isValidMcpServerUrl', () => {
  it.each(['https://projekte.stadt.de/mcp', ' http://localhost:8080/mcp '])(
    'accepts %s',
    (value) => {
      expect(isValidMcpServerUrl(value)).toBe(true);
    },
  );

  it.each([
    'projekte.stadt.de/mcp',
    'file:///etc/mcp',
    'javascript:alert(1)',
    '',
  ])('rejects %s', (value) => {
    expect(isValidMcpServerUrl(value)).toBe(false);
  });
});
