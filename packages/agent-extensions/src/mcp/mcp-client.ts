import {
  Client,
  type CallToolRequestOptions,
  type CallToolResult,
  type Implementation,
  type ListToolsResult,
  type RequestOptions,
  type Transport,
} from '@modelcontextprotocol/client';

export type McpRequestOptions = Omit<RequestOptions, 'signal'>;

export interface McpClient {
  connect(transport: Transport, options?: RequestOptions): Promise<void>;
  listTools(
    params?: undefined,
    options?: RequestOptions,
  ): Promise<ListToolsResult>;
  callTool(
    params: { name: string; arguments?: Record<string, unknown> },
    options?: CallToolRequestOptions,
  ): Promise<CallToolResult>;
  close(): Promise<void>;
}

export type McpClientFactory = (clientInfo: Implementation) => McpClient;

export const DEFAULT_MCP_CLIENT_INFO: Implementation = {
  name: '@ayunis/agent-extensions',
  version: '0.1.0',
};

export const createMcpClient: McpClientFactory = (clientInfo) =>
  new Client(clientInfo);
