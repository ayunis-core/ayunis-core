import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { toNodeHandler } from '@modelcontextprotocol/node';
import { createMcpHandler, McpServer } from '@modelcontextprotocol/server';
import * as z from 'zod';

// The mock model calls the `echo` tool with the text after this prefix and
// answers `mcp-tool-result::<result text>` once the result is in the history
// (ayunis-core-backend/.../mock-mcp-tool-response.ts).
export const MCP_ECHO_PROMPT = 'E2E call MCP echo: ';

export interface EchoMcpServer {
  url: string;
  // The text of every echo call the server received, in order.
  calls: readonly string[];
  close(): Promise<void>;
}

// A loopback MCP server whose one tool, `echo`, answers `echo::<text>`, so a
// reply containing that proves the backend really called it.
export async function startEchoMcpServer(): Promise<EchoMcpServer> {
  const calls: string[] = [];
  const handler = createMcpHandler(() => {
    const server = new McpServer({ name: 'ayunis-e2e-echo', version: '1.0.0' });
    server.registerTool(
      'echo',
      {
        description: 'Echoes the given text.',
        inputSchema: z.object({ text: z.string() }),
      },
      ({ text }) => {
        calls.push(text);
        return { content: [{ type: 'text', text: `echo::${text}` }] };
      },
    );
    return server;
  });
  const http = createServer(toNodeHandler(handler));
  await new Promise<void>((resolve, reject) => {
    http.once('error', reject);
    http.listen(0, '127.0.0.1', resolve);
  });
  const { port } = http.address() as AddressInfo;
  return {
    url: `http://127.0.0.1:${port}/mcp`,
    calls,
    async close() {
      await handler.close();
      http.closeAllConnections();
      await new Promise<void>((resolve, reject) => {
        http.close((error) => (error ? reject(error) : resolve()));
      });
    },
  };
}
