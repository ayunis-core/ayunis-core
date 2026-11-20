import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { toNodeHandler } from '@modelcontextprotocol/node';
import { createMcpHandler, McpServer } from '@modelcontextprotocol/server';
import * as z from 'zod';

// The mock model calls the `echo` tool with the text after this prefix and
// answers `mcp-tool-result::<result text>` once the result is in the history
// (ayunis-core-backend/.../mock-mcp-tool-response.ts).
export const MCP_ECHO_PROMPT = 'E2E call MCP echo: ';
// The mock model calls `echo_file` with the source ID after this prefix.
export const MCP_ECHO_FILE_PROMPT = 'E2E call MCP echo file: ';

// What `echo_file` received, including the download URL, which it never
// echoes back.
export interface EchoFileCall {
  downloadUrl: string;
  fileId: string;
  fileName?: string;
  mimeType?: string;
  sha256: string;
}

export interface EchoMcpServer {
  url: string;
  // The text of every echo call the server received, in order.
  calls: readonly string[];
  fileCalls: readonly EchoFileCall[];
  setAcceptedToken(token: string | string[]): void;
  setHtmlResponse(enabled: boolean): void;
  close(): Promise<void>;
}

// A loopback MCP server whose tool `echo` answers `echo::<text>`, so a reply
// containing that proves the backend really called it. `echo_file` declares
// its `file` input as a file (`openai/fileParams`), downloads it and answers
// `echo-file::<sha256>::<file_id>::<file_name>`.
export async function startEchoMcpServer(): Promise<EchoMcpServer> {
  const calls: string[] = [];
  const fileCalls: EchoFileCall[] = [];
  let htmlResponse = false;
  let acceptedToken: string[] | undefined;
  const handler = createMcpHandler(() => {
    const server = new McpServer({ name: "ayunis-e2e-echo", version: "1.0.0" });
    server.registerTool(
      "echo",
      {
        description: "Echoes the given text.",
        inputSchema: z.object({ text: z.string() }),
      },
      ({ text }) => {
        calls.push(text);
        return { content: [{ type: "text", text: `echo::${text}` }] };
      },
    );
    server.registerTool(
      'echo_file',
      {
        description: 'Downloads the given file and echoes what it received.',
        inputSchema: z.object({
          file: z.object({
            download_url: z.string(),
            file_id: z.string(),
            mime_type: z.string().optional(),
            file_name: z.string().optional(),
          }),
        }),
        _meta: { 'openai/fileParams': ['file'] },
      },
      async ({ file }) => {
        const response = await fetch(file.download_url);
        const sha256 = createHash('sha256')
          .update(Buffer.from(await response.arrayBuffer()))
          .digest('hex');
        fileCalls.push({
          downloadUrl: file.download_url,
          fileId: file.file_id,
          fileName: file.file_name,
          mimeType: file.mime_type,
          sha256,
        });
        if (!response.ok) {
          return {
            isError: true,
            content: [{ type: 'text', text: `download failed: ${response.status}` }],
          };
        }
        return {
          content: [
            {
              type: 'text',
              text: `echo-file::${sha256}::${file.file_id}::${file.file_name ?? ''}`,
            },
          ],
        };
      },
    );
    return server;
  });
  const nodeHandler = toNodeHandler(handler);
  const http = createServer((request, response) => {
    if (
      acceptedToken !== undefined &&
      !acceptedToken.some(
        (token) => request.headers.authorization === `Bearer ${token}`,
      )
    ) {
      response.writeHead(401, { "Content-Type": "application/json" });
      response.end(JSON.stringify({ message: "Invalid api token" }));
      return;
    }
    if (htmlResponse) {
      response.writeHead(200, { "Content-Type": "text/html" });
      response.end("<html>private-upstream-response</html>");
      return;
    }
    void nodeHandler(request, response);
  });
  await new Promise<void>((resolve, reject) => {
    http.once("error", reject);
    http.listen(0, "127.0.0.1", resolve);
  });
  const { port } = http.address() as AddressInfo;
  return {
    url: `http://127.0.0.1:${port}/mcp`,
    calls,
    fileCalls,
    setAcceptedToken(token) {
      acceptedToken = Array.isArray(token) ? token : [token];
    },
    setHtmlResponse(enabled) {
      htmlResponse = enabled;
    },
    async close() {
      await handler.close();
      http.closeAllConnections();
      await new Promise<void>((resolve, reject) => {
        http.close((error) => (error ? reject(error) : resolve()));
      });
    },
  };
}
