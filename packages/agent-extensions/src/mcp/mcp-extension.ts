import {
  Client,
  type CallToolRequestOptions,
  type CallToolResult,
  type Implementation,
  type ListToolsResult,
  type RequestOptions,
  type Tool as McpTool,
  type Transport,
} from '@modelcontextprotocol/client';
import type { Tool, ToolExecutionContext } from '@ayunis/agent-runtime';

import type {
  RuntimeExtension,
  RuntimeExtensionInstance,
} from '../extensions/runtime-extension';
import { serializeMcpResult, toRuntimeMcpResult } from './result-serializer';
import type { McpTransportFactory } from './transports';

const DEFAULT_CLIENT_INFO: Implementation = {
  name: '@ayunis/agent-extensions',
  version: '0.1.0',
};

export type McpRequestOptions = Omit<RequestOptions, 'signal'>;

export interface McpServerConfig {
  readonly name: string;
  readonly transport: McpTransportFactory;
  readonly requestOptions?: McpRequestOptions;
}

export interface McpExtensionConfig {
  readonly servers: readonly McpServerConfig[];
  readonly clientInfo?: Implementation;
}

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

interface InitializedMcpExtension extends RuntimeExtensionInstance {
  readonly tools: readonly Tool[];
  dispose(): Promise<void>;
}

export const mcpExtension: RuntimeExtension<McpExtensionConfig> = (config) =>
  initializeMcpExtension(config);

export const initializeMcpExtension = async (
  config: McpExtensionConfig,
  createClient: McpClientFactory = createSdkClient,
): Promise<InitializedMcpExtension> => {
  validateServerNames(config.servers);
  const clients: McpClient[] = [];
  const tools: Tool[] = [];
  const toolNames = new Set<string>();

  try {
    for (const server of config.servers) {
      const client = createClient(config.clientInfo ?? DEFAULT_CLIENT_INFO);
      clients.push(client);
      await connectClient(client, server);
      const discovered = await client.listTools(
        undefined,
        server.requestOptions,
      );
      appendTools(tools, toolNames, discovered.tools, client, server);
    }
  } catch (error) {
    return rollbackClients(clients, error);
  }

  return {
    name: 'mcp',
    tools,
    dispose: createDisposer(clients),
  };
};

const createSdkClient: McpClientFactory = (clientInfo) =>
  new Client(clientInfo);

const connectClient = async (
  client: McpClient,
  server: McpServerConfig,
): Promise<void> => {
  const transport = await server.transport();
  await client.connect(transport, server.requestOptions);
};

const appendTools = (
  target: Tool[],
  names: Set<string>,
  discovered: readonly McpTool[],
  client: McpClient,
  server: McpServerConfig,
): void => {
  for (const mcpTool of discovered) {
    if (names.has(mcpTool.name)) {
      throw new Error(`Duplicate MCP tool name: ${mcpTool.name}`);
    }
    names.add(mcpTool.name);
    target.push(toRuntimeTool(mcpTool, client, server.requestOptions));
  }
};

const toRuntimeTool = (
  mcpTool: McpTool,
  client: McpClient,
  requestOptions?: McpRequestOptions,
): Tool => ({
  name: mcpTool.name,
  description: mcpTool.description ?? mcpTool.title ?? '',
  parameters: mcpTool.inputSchema,
  execute: async (input, context) =>
    executeMcpTool(client, mcpTool.name, input, context, requestOptions),
});

const executeMcpTool = async (
  client: McpClient,
  name: string,
  input: Record<string, unknown>,
  context: ToolExecutionContext,
  requestOptions?: McpRequestOptions,
) => {
  const result = await client.callTool(
    { name, arguments: input },
    withAbortSignal(requestOptions, context.signal),
  );
  const runtimeResult = toRuntimeMcpResult(result);
  return {
    result: serializeMcpResult(runtimeResult),
    isError: runtimeResult.isError,
  };
};

const withAbortSignal = (
  options: McpRequestOptions | undefined,
  signal: AbortSignal | undefined,
): CallToolRequestOptions | undefined => {
  if (signal === undefined) {
    return options;
  }
  return { ...options, signal };
};

const validateServerNames = (servers: readonly McpServerConfig[]): void => {
  const names = new Set<string>();
  for (const server of servers) {
    if (names.has(server.name)) {
      throw new Error(`Duplicate MCP server name: ${server.name}`);
    }
    names.add(server.name);
  }
};

const createDisposer = (
  clients: readonly McpClient[],
): (() => Promise<void>) => {
  let disposed = false;
  return async () => {
    if (disposed) {
      return;
    }
    disposed = true;
    await closeClients(clients);
  };
};

const closeClients = async (clients: readonly McpClient[]): Promise<void> => {
  const errors: unknown[] = [];
  for (const client of clients.toReversed()) {
    try {
      await client.close();
    } catch (error) {
      errors.push(error);
    }
  }
  if (errors.length > 0) {
    throw new AggregateError(errors, 'Failed to close MCP clients');
  }
};

const rollbackClients = async (
  clients: readonly McpClient[],
  initializationError: unknown,
): Promise<never> => {
  try {
    await closeClients(clients);
  } catch (closeError) {
    throw new AggregateError(
      [initializationError, closeError],
      'MCP initialization and rollback failed',
      { cause: initializationError },
    );
  }
  throw initializationError;
};
