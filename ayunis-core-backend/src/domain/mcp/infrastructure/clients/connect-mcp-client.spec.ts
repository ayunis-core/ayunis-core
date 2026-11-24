import {
  StreamableHTTPClientTransport,
  type Client,
} from '@modelcontextprotocol/client';
import { connectMcpClient } from './connect-mcp-client';

const TIMEOUT_MS = 1000;
const PROBE_TIMEOUT_MS = 100;

type ProbeReply = (id: unknown) => Response;

const accepted = () => new Response(null, { status: 202 });

function json(id: unknown, result: unknown): Response {
  return new Response(JSON.stringify({ jsonrpc: '2.0', id, result }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

/** A server that speaks only the 2025 protocol; `probeReply` answers `server/discover`. */
function legacyServer(probeReply: ProbeReply, answerInitialize = true) {
  const methods: string[] = [];
  const fetch = (_url: string | URL, init?: RequestInit) => {
    if (init?.method !== 'POST') {
      return Promise.resolve(new Response(null, { status: 405 }));
    }
    const message = JSON.parse(init.body as string) as {
      id?: unknown;
      method: string;
    };
    methods.push(message.method);
    if (message.method === 'server/discover') {
      return Promise.resolve(probeReply(message.id));
    }
    if (message.method === 'initialize' && answerInitialize) {
      return Promise.resolve(
        json(message.id, {
          protocolVersion: '2025-11-25',
          capabilities: { tools: {} },
          serverInfo: { name: 'weblication-cms', version: '0.9.0' },
        }),
      );
    }
    if (message.method === 'tools/list') {
      return Promise.resolve(
        json(message.id, {
          tools: [{ name: 'readFile', inputSchema: { type: 'object' } }],
        }),
      );
    }
    return Promise.resolve(accepted());
  };
  return { fetch, methods };
}

describe('connectMcpClient', () => {
  let client: Client | undefined;

  afterEach(async () => {
    await client?.close().catch(() => undefined);
    client = undefined;
  });

  function connectTo(server: ReturnType<typeof legacyServer>) {
    const onLegacyFallback = jest.fn();
    const connecting = connectMcpClient({
      createTransport: () =>
        new StreamableHTTPClientTransport(
          new URL('https://cms.example.org/mcp'),
          { fetch: server.fetch },
        ),
      timeout: TIMEOUT_MS,
      probeTimeoutMs: PROBE_TIMEOUT_MS,
      onLegacyFallback,
    }).then((connected) => (client = connected));
    return { connecting, onLegacyFallback };
  }

  it('connects over the legacy handshake when the server accepts the negotiation probe without answering it', async () => {
    const server = legacyServer(accepted);
    const { connecting, onLegacyFallback } = connectTo(server);

    const connected = await connecting;

    await expect(connected.listTools()).resolves.toMatchObject({
      tools: [{ name: 'readFile' }],
    });
    expect(server.methods).toEqual([
      'server/discover',
      'initialize',
      'notifications/initialized',
      'tools/list',
    ]);
    expect(onLegacyFallback).toHaveBeenCalledTimes(1);
  });

  it('keeps the legacy fallback within the original connect budget when the server never answers', async () => {
    const server = legacyServer(accepted, false);
    const { connecting } = connectTo(server);

    await expect(connecting).rejects.toMatchObject({
      code: 'REQUEST_TIMEOUT',
      data: { timeout: TIMEOUT_MS - PROBE_TIMEOUT_MS },
    });
  });

  it('does not repeat the handshake when the server rejects the probe as unauthorized', async () => {
    const server = legacyServer(() => new Response(null, { status: 401 }));
    const { connecting, onLegacyFallback } = connectTo(server);

    await expect(connecting).rejects.toThrow();

    expect(server.methods).toEqual(['server/discover']);
    expect(onLegacyFallback).not.toHaveBeenCalled();
  });
});
