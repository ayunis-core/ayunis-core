import type {
  Implementation,
  Tool as SdkTool,
} from '@modelcontextprotocol/client';

import type { ExtensionContext, ExtensionState } from '../extensions/context';
import { defineExtension } from '../extensions/extension';
import {
  createMcpClient,
  DEFAULT_MCP_CLIENT_INFO,
  type McpClient,
  type McpClientFactory,
  type McpRequestOptions,
} from './mcp-client';
import { buildMcpInstructions } from './mcp-instructions';
import { createMcpTools, namespaceMcpToolName } from './mcp-tools';
import type { McpTransportFactory } from './transports';

export interface McpConnectionDefinition {
  readonly id: string;
  readonly serverName: string;
  readonly instructions?: string;
  readonly transport: McpTransportFactory;
  readonly requestOptions?: McpRequestOptions;
}

export interface ActiveMcpConnection extends McpConnectionDefinition {
  readonly client: McpClient;
  readonly discoveredTools: readonly SdkTool[];
}

export interface McpState {
  readonly connections: ReadonlyMap<string, ActiveMcpConnection>;
}

export interface McpConfig {
  resolveAuthorized(
    ids: readonly string[],
  ): Promise<readonly McpConnectionDefinition[]>;
  readonly clientInfo?: Implementation;
  readonly createClient?: McpClientFactory;
}

export interface McpApi {
  addConnections(ids: readonly string[]): Promise<void>;
}

export const Mcp = defineExtension<'mcp', McpState, McpApi, McpConfig>({
  name: 'mcp',
  setup(context, config) {
    const state = context.state<McpState>({ connections: new Map() });
    return {
      state,
      api: {
        addConnections: (ids) => addConnections(context, state, config, ids),
      },
    };
  },
  contribute({ state }) {
    const connections = sortedConnections(state.connections.values());
    if (connections.length === 0) {
      return {};
    }
    const instructions = buildMcpInstructions(connections);
    return {
      ...(instructions ? { instructions } : {}),
      tools: createMcpTools(connections),
    };
  },
});

const addConnections = async (
  context: ExtensionContext,
  state: ExtensionState<McpState>,
  config: Readonly<McpConfig>,
  requestedIds: readonly string[],
): Promise<void> => {
  assertUniqueRequestedIds(requestedIds);
  const missingIds = requestedIds.filter(
    (id) => !state.current.connections.has(id),
  );
  if (missingIds.length === 0) {
    return;
  }
  const resolved = await config.resolveAuthorized([...missingIds]);
  validateResolved(missingIds, resolved, state.current.connections);
  const provisional = await prepareConnections(resolved, config);
  for (const connection of provisional) {
    context.own(closeOnce(connection.client));
  }
  state.update((current) => ({
    connections: mergeConnections(current.connections, provisional),
  }));
};

const prepareConnections = async (
  definitions: readonly McpConnectionDefinition[],
  config: Readonly<McpConfig>,
): Promise<ActiveMcpConnection[]> => {
  const prepared: ActiveMcpConnection[] = [];
  const createClient = config.createClient ?? createMcpClient;
  try {
    for (const definition of sortedDefinitions(definitions)) {
      const client = createClient(config.clientInfo ?? DEFAULT_MCP_CLIENT_INFO);
      prepared.push(await connectAndDiscover(definition, client));
    }
    validateModelToolNames(prepared);
    return prepared;
  } catch (error) {
    return closeProvisional(prepared, error);
  }
};

const connectAndDiscover = async (
  definition: McpConnectionDefinition,
  client: McpClient,
): Promise<ActiveMcpConnection> => {
  const active = { ...definition, client, discoveredTools: [] };
  try {
    const transport = await definition.transport();
    await client.connect(transport, definition.requestOptions);
    const { tools } = await client.listTools(
      undefined,
      definition.requestOptions,
    );
    validateDiscoveredTools(definition.serverName, tools);
    return { ...definition, client, discoveredTools: [...tools] };
  } catch (error) {
    return closeFailedConnection(active, error);
  }
};

const validateResolved = (
  requestedIds: readonly string[],
  resolved: readonly McpConnectionDefinition[],
  active: ReadonlyMap<string, ActiveMcpConnection>,
): void => {
  const requested = new Set(requestedIds);
  const resolvedIds = new Set<string>();
  for (const definition of resolved) {
    validateDefinition(definition);
    if (resolvedIds.has(definition.id)) {
      throw new Error(`Duplicate resolved MCP connection '${definition.id}'.`);
    }
    if (!requested.has(definition.id)) {
      throw new Error(
        `Unrequested MCP connection '${definition.id}' was resolved.`,
      );
    }
    resolvedIds.add(definition.id);
  }
  const missing = requestedIds.find((id) => !resolvedIds.has(id));
  if (missing)
    throw new Error(`Missing authorized MCP connection '${missing}'.`);
  assertUniqueServerNames(resolved, active);
};

const validateDefinition = (definition: McpConnectionDefinition): void => {
  if (!definition.id || !definition.serverName) {
    throw new Error('MCP connections require non-empty id and serverName.');
  }
  if (typeof definition.transport !== 'function') {
    throw new Error(`MCP connection '${definition.id}' requires a transport.`);
  }
};

const assertUniqueServerNames = (
  definitions: readonly McpConnectionDefinition[],
  active: ReadonlyMap<string, ActiveMcpConnection>,
): void => {
  const names = new Set(
    [...active.values()].map(({ serverName }) => serverName),
  );
  for (const definition of definitions) {
    if (names.has(definition.serverName)) {
      throw new Error(
        `Duplicate MCP server namespace '${definition.serverName}'.`,
      );
    }
    names.add(definition.serverName);
  }
};

const assertUniqueRequestedIds = (ids: readonly string[]): void => {
  const seen = new Set<string>();
  for (const id of ids) {
    if (!id) throw new Error('MCP connection IDs must not be empty.');
    if (seen.has(id)) {
      throw new Error(`Duplicate requested MCP connection '${id}'.`);
    }
    seen.add(id);
  }
};

const validateDiscoveredTools = (
  serverName: string,
  tools: readonly SdkTool[],
): void => {
  const names = new Set<string>();
  for (const tool of tools) {
    if (!tool.name)
      throw new Error(`MCP server '${serverName}' returned an unnamed tool.`);
    if (names.has(tool.name)) {
      throw new Error(
        `MCP server '${serverName}' returned duplicate tool '${tool.name}'.`,
      );
    }
    names.add(tool.name);
  }
};

const validateModelToolNames = (
  connections: readonly ActiveMcpConnection[],
): void => {
  const names = new Set<string>();
  for (const connection of connections) {
    for (const tool of connection.discoveredTools) {
      const name = namespaceMcpToolName(connection.serverName, tool.name);
      if (names.has(name))
        throw new Error(`Duplicate namespaced MCP tool '${name}'.`);
      names.add(name);
    }
  }
};

const mergeConnections = (
  current: ReadonlyMap<string, ActiveMcpConnection>,
  additions: readonly ActiveMcpConnection[],
): ReadonlyMap<string, ActiveMcpConnection> =>
  new Map(
    sortedConnections([...current.values(), ...additions]).map((connection) => [
      connection.id,
      connection,
    ]),
  );

const sortedConnections = (
  connections: Iterable<ActiveMcpConnection>,
): ActiveMcpConnection[] =>
  [...connections].sort((left, right) => left.id.localeCompare(right.id));

const sortedDefinitions = (
  definitions: readonly McpConnectionDefinition[],
): McpConnectionDefinition[] =>
  [...definitions].sort((left, right) => left.id.localeCompare(right.id));

const closeOnce = (client: McpClient): (() => Promise<void>) => {
  let closed = false;
  return async () => {
    if (closed) return;
    closed = true;
    await client.close();
  };
};

const closeFailedConnection = async (
  connection: ActiveMcpConnection,
  operationError: unknown,
): Promise<never> => {
  try {
    await connection.client.close();
  } catch (closeError) {
    throw new AggregateError(
      [operationError, closeError],
      'MCP connection and cleanup failed.',
    );
  }
  throw operationError;
};

const closeProvisional = async (
  connections: readonly ActiveMcpConnection[],
  operationError: unknown,
): Promise<never> => {
  const failures: unknown[] = [operationError];
  for (const connection of connections.toReversed()) {
    try {
      await connection.client.close();
    } catch (error) {
      failures.push(error);
    }
  }
  if (failures.length > 1) {
    throw new AggregateError(failures, 'MCP addition and rollback failed.');
  }
  throw operationError;
};
