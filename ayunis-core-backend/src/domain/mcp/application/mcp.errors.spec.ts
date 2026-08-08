import {
  McpConnectionFailedError,
  McpConnectionTimeoutError,
} from './mcp.errors';

// These messages are user-visible (validation responses, tool soft-failure
// results, warning logs), so the server URL must not leak anything beyond
// origin + path: credentials, query strings, and fragments can all carry
// tokens for integrations whose serverUrl is otherwise never exposed.
describe('MCP connectivity error messages', () => {
  const secretUrl =
    'https://user:hunter2@mcp.example.com/api?api_key=s3cret&sig=abc#token=xyz';

  it.each([
    ['McpConnectionFailedError', () => new McpConnectionFailedError(secretUrl)],
    [
      'McpConnectionTimeoutError',
      () => new McpConnectionTimeoutError(secretUrl, 30_000),
    ],
  ])('%s strips credentials, query, and fragment', (_name, build) => {
    const message = build().message;

    expect(message).toContain('https://mcp.example.com/api');
    expect(message).not.toContain('hunter2');
    expect(message).not.toContain('user');
    expect(message).not.toContain('api_key');
    expect(message).not.toContain('s3cret');
    expect(message).not.toContain('token=xyz');
  });

  it('keeps an unparseable server url untouched', () => {
    const error = new McpConnectionFailedError('not-a-url');

    expect(error.message).toContain('not-a-url');
  });
});
