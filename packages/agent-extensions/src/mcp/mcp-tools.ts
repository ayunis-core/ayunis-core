import type { Tool as SdkTool } from '@modelcontextprotocol/client';
import type { Tool, ToolExecutionContext } from '@ayunis/agent-runtime';

import type { McpClient, McpRequestOptions } from './mcp-client';
import { serializeMcpResult, toRuntimeMcpResult } from './result-serializer';

export interface McpToolConnection {
  readonly id: string;
  readonly serverName: string;
  readonly client: McpClient;
  readonly discoveredTools: readonly SdkTool[];
  readonly requestOptions?: McpRequestOptions;
}

export const createMcpTools = (
  connections: readonly McpToolConnection[],
): readonly Tool[] =>
  connections
    .flatMap((connection) =>
      connection.discoveredTools.map((tool) => toRuntimeTool(connection, tool)),
    )
    .sort((left, right) => left.name.localeCompare(right.name));

export const namespaceMcpToolName = (
  serverName: string,
  toolName: string,
): string => {
  const encodedServerName = encodeIdentity(serverName);
  return `mcp_${encodedServerName.length}_${encodedServerName}_${encodeIdentity(toolName)}`;
};

const toRuntimeTool = (
  connection: McpToolConnection,
  discovered: SdkTool,
): Tool => ({
  name: namespaceMcpToolName(connection.serverName, discovered.name),
  description: discovered.description ?? discovered.title ?? '',
  parameters: discovered.inputSchema,
  execute: (input, context) =>
    executeMcpTool(connection, discovered.name, input, context),
});

const executeMcpTool = async (
  connection: McpToolConnection,
  originalName: string,
  input: Record<string, unknown>,
  context: ToolExecutionContext,
) => {
  const result = await connection.client.callTool(
    { name: originalName, arguments: input },
    withAbortSignal(connection.requestOptions, context.signal),
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
) => {
  if (signal === undefined) {
    return options;
  }
  return { ...options, signal };
};

const encodeIdentity = (value: string): string =>
  Buffer.from(value, 'utf8').toString('base64url');
