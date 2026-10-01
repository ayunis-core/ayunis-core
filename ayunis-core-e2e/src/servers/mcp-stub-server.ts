import { createServer, type IncomingMessage, type Server } from "node:http";

export interface McpStubToolCall {
  name: string;
  arguments: Record<string, unknown>;
}

export interface McpStubServer {
  url: string;
  /** Every tools/call the backend sent, in order. */
  calls: McpStubToolCall[];
  close(): Promise<void>;
}

interface JsonRpcRequest {
  jsonrpc: "2.0";
  id?: number | string;
  method: string;
  params?: Record<string, unknown>;
}

const STUB_TOOLS = [
  {
    name: "create_document",
    description: "Create a document in the stub wiki",
    inputSchema: {
      type: "object",
      properties: { title: { type: "string" } },
      required: ["title"],
    },
  },
  {
    name: "search_documents",
    description: "Search the stub wiki",
    inputSchema: {
      type: "object",
      properties: { query: { type: "string" } },
      required: ["query"],
    },
    annotations: { readOnlyHint: true },
  },
];

/**
 * Minimal Streamable-HTTP MCP server speaking plain JSON responses. It
 * answers the v2 client's `server/discover` probe with "method not found" so
 * the client falls back to the classic initialize handshake, and records
 * every tool call so a test can assert what the backend actually sent.
 */
export async function startMcpStubServer(): Promise<McpStubServer> {
  const calls: McpStubToolCall[] = [];
  const server = createServer((request, response) => {
    if (request.method !== "POST") {
      response.writeHead(405).end();
      return;
    }
    void readJson(request).then((body) => {
      const reply = handle(body, calls);
      if (reply === null) {
        response.writeHead(202).end();
        return;
      }
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify(reply));
    });
  });
  const url = await listen(server);
  return {
    url,
    calls,
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      }),
  };
}

function handle(
  request: JsonRpcRequest,
  calls: McpStubToolCall[],
): Record<string, unknown> | null {
  if (request.id === undefined) return null;
  const result = resultFor(request, calls);
  if (result === undefined) {
    return {
      jsonrpc: "2.0",
      id: request.id,
      error: { code: -32601, message: `Method not found: ${request.method}` },
    };
  }
  return { jsonrpc: "2.0", id: request.id, result };
}

function resultFor(
  request: JsonRpcRequest,
  calls: McpStubToolCall[],
): Record<string, unknown> | undefined {
  switch (request.method) {
    case "initialize":
      return {
        protocolVersion:
          (request.params?.protocolVersion as string | undefined) ??
          "2025-03-26",
        capabilities: { tools: {} },
        serverInfo: { name: "ayunis-e2e-mcp-stub", version: "1.0.0" },
      };
    case "ping":
      return {};
    case "tools/list":
      return { tools: STUB_TOOLS };
    case "resources/list":
      return { resources: [] };
    case "resources/templates/list":
      return { resourceTemplates: [] };
    case "prompts/list":
      return { prompts: [] };
    case "tools/call": {
      const name = request.params?.name as string;
      const args = (request.params?.arguments ?? {}) as Record<string, unknown>;
      calls.push({ name, arguments: args });
      return {
        content: [
          {
            type: "text",
            text: `stub ${name} ok: ${JSON.stringify(args)}`,
          },
        ],
        isError: false,
      };
    }
    default:
      return undefined;
  }
}

function readJson(request: IncomingMessage): Promise<JsonRpcRequest> {
  return new Promise((resolve, reject) => {
    let raw = "";
    request.setEncoding("utf8");
    request.on("data", (chunk: string) => (raw += chunk));
    request.on("end", () => {
      try {
        resolve(JSON.parse(raw) as JsonRpcRequest);
      } catch (error) {
        reject(error instanceof Error ? error : new Error(String(error)));
      }
    });
    request.on("error", reject);
  });
}

function listen(server: Server): Promise<string> {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        reject(new Error("MCP stub did not expose a TCP port"));
        return;
      }
      resolve(`http://127.0.0.1:${address.port}/mcp`);
    });
  });
}
