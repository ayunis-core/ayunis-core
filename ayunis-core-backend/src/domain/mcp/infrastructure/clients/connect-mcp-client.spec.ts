import { createServer, type Server, type ServerResponse } from 'http';
import type { AddressInfo } from 'net';
import {
  StreamableHTTPClientTransport,
  type Client,
} from '@modelcontextprotocol/client';
import { connectMcpClient } from './connect-mcp-client';

type ProbeReply = (res: ServerResponse, id: unknown) => void;

const REQUEST_OPTIONS = { timeout: 5000 };
const PROBE_TIMEOUT_MS = 200;

function replyJson(res: ServerResponse, body: unknown): void {
  res.writeHead(200, { 'content-type': 'application/json' });
  res.end(JSON.stringify(body));
}

/**
 * A server that only speaks a pre-2026-07-28 protocol revision. `probeReply`
 * decides how it answers the `server/discover` negotiation probe.
 */
function startLegacyServer(probeReply: ProbeReply) {
  const methods: string[] = [];
  const server = createServer((req, res) => {
    if (req.method !== 'POST') {
      res.writeHead(405).end();
      return;
    }
    let raw = '';
    req.on('data', (chunk: Buffer) => (raw += chunk.toString()));
    req.on('end', () => {
      const message = JSON.parse(raw) as { id?: unknown; method: string };
      methods.push(message.method);
      const result = (value: unknown) =>
        replyJson(res, { jsonrpc: '2.0', id: message.id, result: value });
      switch (message.method) {
        case 'server/discover':
          return probeReply(res, message.id);
        case 'initialize':
          return result({
            protocolVersion: '2025-11-25',
            capabilities: { tools: {} },
            serverInfo: { name: 'legacy-server', version: '1.0.0' },
          });
        case 'tools/list':
          return result({
            tools: [{ name: 'echo', inputSchema: { type: 'object' } }],
          });
        default:
          res.writeHead(202).end();
      }
    });
  });
  return new Promise<{ server: Server; methods: string[]; url: URL }>(
    (resolve) =>
      server.listen(0, '127.0.0.1', () =>
        resolve({
          server,
          methods,
          url: new URL(
            `http://127.0.0.1:${(server.address() as AddressInfo).port}/mcp`,
          ),
        }),
      ),
  );
}

describe('connectMcpClient', () => {
  let server: Server | undefined;
  let client: Client | undefined;

  afterEach(async () => {
    await client?.close().catch(() => undefined);
    client = undefined;
    await new Promise((resolve) => {
      if (!server) return resolve(undefined);
      server.closeAllConnections();
      server.close(resolve);
    });
    server = undefined;
  });

  async function connectTo(probeReply: ProbeReply) {
    const started = await startLegacyServer(probeReply);
    server = started.server;
    const onLegacyFallback = jest.fn();
    const connect = connectMcpClient({
      createTransport: () => new StreamableHTTPClientTransport(started.url),
      requestOptions: REQUEST_OPTIONS,
      probeTimeoutMs: PROBE_TIMEOUT_MS,
      onLegacyFallback,
    }).then((connected) => (client = connected));
    return { connect, methods: started.methods, onLegacyFallback };
  }

  it('connects when the server accepts the negotiation probe without answering it', async () => {
    const { connect, methods, onLegacyFallback } = await connectTo((res) =>
      res.writeHead(202).end(),
    );

    const connected = await connect;

    await expect(connected.listTools()).resolves.toMatchObject({
      tools: [{ name: 'echo' }],
    });
    expect(methods).toEqual([
      'server/discover',
      'initialize',
      'notifications/initialized',
      'tools/list',
    ]);
    expect(onLegacyFallback).toHaveBeenCalledTimes(1);
  });

  it('connects when the server answers the negotiation probe with an empty body', async () => {
    const { connect, methods, onLegacyFallback } = await connectTo((res) =>
      res.writeHead(200, { 'content-type': 'text/html' }).end(),
    );

    const connected = await connect;

    await expect(connected.listTools()).resolves.toMatchObject({
      tools: [{ name: 'echo' }],
    });
    expect(methods).toContain('initialize');
    expect(onLegacyFallback).toHaveBeenCalledTimes(1);
  });

  it('does not reconnect when the server rejects the probe as an unknown method', async () => {
    const { connect, methods, onLegacyFallback } = await connectTo((res, id) =>
      replyJson(res, {
        jsonrpc: '2.0',
        id,
        error: { code: -32601, message: 'Method not found' },
      }),
    );

    await connect;

    expect(methods).toEqual([
      'server/discover',
      'initialize',
      'notifications/initialized',
    ]);
    expect(onLegacyFallback).not.toHaveBeenCalled();
  });

  it('does not retry past an authorization failure on the probe', async () => {
    const { connect, methods, onLegacyFallback } = await connectTo((res) =>
      res.writeHead(401).end(),
    );

    await expect(connect).rejects.toThrow();

    expect(methods).toEqual(['server/discover']);
    expect(onLegacyFallback).not.toHaveBeenCalled();
  });
});
