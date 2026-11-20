import {
  Client,
  StreamableHTTPClientTransport,
} from '@modelcontextprotocol/client';
import { mcpConnectionFailure } from './mcp-connection-failure';

describe('MCP incompatible HTTP responses', () => {
  it('classifies the real SDK HTML negotiation failure as invalidResponse', async () => {
    const client = new Client(
      { name: 'connection-health-regression', version: '1.0.0' },
      { versionNegotiation: { mode: 'auto' } },
    );
    const transport = new StreamableHTTPClientTransport(
      new URL('https://mcp.example.com/mcp'),
      {
        fetch: jest.fn().mockImplementation(() =>
          Promise.resolve(
            new Response('<html>private-token</html>', {
              status: 200,
              headers: { 'Content-Type': 'text/html' },
            }),
          ),
        ),
      },
    );
    try {
      const failure: unknown = await client
        .connect(transport, { timeout: 1000 })
        .catch((error: unknown) => error);
      expect(failure).toMatchObject({
        code: 'ERA_NEGOTIATION_FAILED',
        data: { cause: { code: 'CLIENT_HTTP_UNEXPECTED_CONTENT' } },
      });
      expect(mcpConnectionFailure(failure)).toBe('invalidResponse');
    } finally {
      await client.close();
    }
  });

  it('does not invent an invalid-response diagnosis for arbitrary negotiation errors', () => {
    expect(
      mcpConnectionFailure({ code: 'ERA_NEGOTIATION_FAILED' }),
    ).toBeUndefined();
  });
});
