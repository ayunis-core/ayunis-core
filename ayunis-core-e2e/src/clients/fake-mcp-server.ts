import {
  createServer,
  type IncomingMessage,
  type Server,
  type ServerResponse,
} from 'node:http';

interface JsonRpcRequest {
  id?: number | string;
  method: string;
  params?: { protocolVersion?: string };
}

/**
 * A minimal MCP server (streamable HTTP, JSON responses, no session) with one
 * tool, recording the methods it was called with.
 */
export class FakeMcpServer {
  readonly methods: string[] = [];
  private server: Server | undefined;
  private baseUrl = '';

  get url(): string {
    return `${this.baseUrl}/mcp`;
  }

  async start(): Promise<void> {
    const server = createServer((request, response) =>
      this.respond(request, response),
    );
    this.server = server;
    this.baseUrl = await new Promise<string>((resolve, reject) => {
      server.once('error', reject);
      server.listen(0, '127.0.0.1', () => {
        const address = server.address();
        if (!address || typeof address === 'string') {
          reject(new Error('Fake MCP server did not expose a TCP port'));
          return;
        }
        resolve(`http://127.0.0.1:${address.port}`);
      });
    });
  }

  async stop(): Promise<void> {
    const server = this.server;
    if (!server) return;
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }

  private respond(request: IncomingMessage, response: ServerResponse): void {
    if (request.method !== 'POST') {
      response.writeHead(405);
      response.end();
      return;
    }
    let body = '';
    request.setEncoding('utf8');
    request.on('data', (chunk: string) => {
      body += chunk;
    });
    request.on('end', () => {
      const message = JSON.parse(body) as JsonRpcRequest;
      this.methods.push(message.method);
      if (message.id === undefined) {
        response.writeHead(202);
        response.end();
        return;
      }
      response.writeHead(200, { 'content-type': 'application/json' });
      response.end(
        JSON.stringify({
          jsonrpc: '2.0',
          id: message.id,
          result: result(message),
        }),
      );
    });
  }
}

function result(message: JsonRpcRequest): object {
  switch (message.method) {
    case 'initialize':
      return {
        protocolVersion: message.params?.protocolVersion,
        capabilities: { tools: {}, resources: {}, prompts: {} },
        serverInfo: { name: 'e2e-tickets', version: '1.0.0' },
      };
    case 'tools/list':
      return {
        tools: [
          {
            name: 'create_ticket',
            description: 'Creates a ticket',
            inputSchema: { type: 'object', properties: {} },
          },
        ],
      };
    case 'resources/list':
      return { resources: [] };
    case 'resources/templates/list':
      return { resourceTemplates: [] };
    case 'prompts/list':
      return { prompts: [] };
    default:
      return {};
  }
}
