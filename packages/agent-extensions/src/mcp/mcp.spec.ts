import type {
  CallToolResult,
  ListToolsResult,
  Transport,
} from '@modelcontextprotocol/client';
import type {
  RunContext,
  RunEvent,
  ToolExecutionContext,
} from '@ayunis/agent-runtime';
import { describe, expect, it, vi } from 'vitest';

import type {
  ExtensionApi,
  ExtensionContext,
  ExtensionDefinitionIdentity,
  ExtensionState,
} from '../extensions/context';
import type { McpClient, McpClientFactory } from './mcp-client';
import { Mcp, type McpConfig, type McpConnectionDefinition } from './mcp';
import { namespaceMcpToolName } from './mcp-tools';

const firstConnection: McpConnectionDefinition = {
  id: 'first',
  serverName: 'server one',
  instructions: 'Use the first server.',
  transport: () => ({}) as Transport,
  requestOptions: { timeout: 250 },
};

const secondConnection: McpConnectionDefinition = {
  id: 'second',
  serverName: 'server two',
  transport: () => ({}) as Transport,
};

const legacyCollisionIdentities = [
  { serverName: 'é?é', toolName: 'é' },
  { serverName: 'é', toolName: 'é?é' },
] as const;

const collisionModelNames = ['mcp_7_w6k_w6k_w6k', 'mcp_3_w6k_w6k_w6k'];

describe('Mcp', () => {
  it('rejects duplicate requested IDs before resolution or opening clients', async () => {
    const resolveAuthorized = vi.fn(async () => [firstConnection]);
    const createClient = vi.fn<McpClientFactory>();
    const run = await setupMcp(
      createConfig({ resolveAuthorized, createClient }),
    );

    await expect(run.api.addConnections(['first', 'first'])).rejects.toThrow(
      /duplicate requested.*first/i,
    );
    expect(resolveAuthorized).not.toHaveBeenCalled();
    expect(createClient).not.toHaveBeenCalled();
  });

  it('rejects duplicate server namespaces before opening clients', async () => {
    const duplicate = { ...secondConnection, serverName: 'server one' };
    const createClient = vi.fn<McpClientFactory>();
    const run = await setupMcp(
      createConfig({
        resolveAuthorized: vi.fn(async () => [firstConnection, duplicate]),
        createClient,
      }),
    );

    await expect(run.api.addConnections(['first', 'second'])).rejects.toThrow(
      /duplicate MCP server namespace.*server one/i,
    );
    expect(createClient).not.toHaveBeenCalled();
  });

  it('rolls back every provisional client when discovery fails', async () => {
    const firstClient = fakeClient([mcpTool('search')]);
    const secondClient = fakeClient([], new Error('discovery failed'));
    const createClient = clientFactory([firstClient, secondClient]);
    const run = await setupMcp(
      createConfig({
        resolveAuthorized: vi.fn(async () => [
          firstConnection,
          secondConnection,
        ]),
        createClient,
      }),
    );

    await expect(run.api.addConnections(['first', 'second'])).rejects.toThrow(
      'discovery failed',
    );

    expect(firstClient.close).toHaveBeenCalledOnce();
    expect(secondClient.close).toHaveBeenCalledOnce();
    expect(run.active()).toEqual([]);
    expect(run.contribution()).toEqual({});
  });

  it('commits a complete addition once and keeps repeated IDs idempotent', async () => {
    const firstClient = fakeClient([mcpTool('search')]);
    const createClient = clientFactory([firstClient]);
    const resolveAuthorized = vi.fn(async () => [firstConnection]);
    const run = await setupMcp(
      createConfig({ resolveAuthorized, createClient }),
    );

    await run.api.addConnections(['first']);
    await run.api.addConnections(['first']);

    expect(resolveAuthorized).toHaveBeenCalledOnce();
    expect(createClient).toHaveBeenCalledOnce();
    expect(firstClient.connect).toHaveBeenCalledOnce();
    expect(firstClient.listTools).toHaveBeenCalledOnce();
    expect(run.active().map(({ id }) => id)).toEqual(['first']);
    expect(run.contribution().instructions).toContain('Use the first server.');
  });

  it('namespaces the same original tool name injectively by server', async () => {
    const firstClient = fakeClient([mcpTool('search')]);
    const secondClient = fakeClient([mcpTool('search')]);
    const run = await setupMcp(
      createConfig({
        resolveAuthorized: vi.fn(async () => [
          secondConnection,
          firstConnection,
        ]),
        createClient: clientFactory([secondClient, firstClient]),
      }),
    );
    await run.api.addConnections(['second', 'first']);

    const names = run.contribution().tools?.map(({ name }) => name) ?? [];
    expect(names).toHaveLength(2);
    expect(new Set(names).size).toBe(2);
    expect(names).toEqual(
      [...names].sort((left, right) => left.localeCompare(right)),
    );
  });

  it('namespaces a legacy collision injectively and deterministically', () => {
    expect(legacyMcpToolName(legacyCollisionIdentities[0])).toBe(
      legacyMcpToolName(legacyCollisionIdentities[1]),
    );

    const names = legacyCollisionIdentities.map(({ serverName, toolName }) =>
      namespaceMcpToolName(serverName, toolName),
    );
    expect(names).toEqual(collisionModelNames);
    expect(new Set(names).size).toBe(legacyCollisionIdentities.length);
    expect(
      legacyCollisionIdentities.map(({ serverName, toolName }) =>
        namespaceMcpToolName(serverName, toolName),
      ),
    ).toEqual(names);
    expect(names.every((name) => /^[A-Za-z0-9_-]{1,64}$/.test(name))).toBe(
      true,
    );
  });

  it('executes legacy-colliding names with their original identities', async () => {
    const definitions = legacyCollisionIdentities.map(
      ({ serverName }, index) => ({
        ...firstConnection,
        id: `collision-${index}`,
        serverName,
      }),
    );
    const clients = legacyCollisionIdentities.map(({ toolName }) =>
      fakeClient([mcpTool(toolName)]),
    );
    const run = await setupMcp(
      createConfig({
        resolveAuthorized: vi.fn(async () => definitions),
        createClient: clientFactory(clients),
      }),
    );
    await run.api.addConnections(definitions.map(({ id }) => id));

    const toolsByName = new Map(
      run.contribution().tools?.map((tool) => [tool.name, tool]),
    );
    for (const name of collisionModelNames) {
      const execute = toolsByName.get(name)?.execute;
      if (!execute) throw new Error(`Missing namespaced MCP tool '${name}'.`);
      await execute({}, toolContext());
    }
    legacyCollisionIdentities.forEach(({ toolName }, index) => {
      expect(clients[index]?.callTool).toHaveBeenCalledWith(
        { name: toolName, arguments: {} },
        { timeout: 250, signal: expect.any(AbortSignal) },
      );
    });
  });

  it('maps execution to the original identity and preserves result fields', async () => {
    const result: CallToolResult = {
      content: [{ type: 'text', text: 'found' }],
      structuredContent: { total: 1 },
      isError: true,
    };
    const client = fakeClient([mcpTool('search')], undefined, result);
    const run = await setupMcp(
      createConfig({
        resolveAuthorized: vi.fn(async () => [firstConnection]),
        createClient: clientFactory([client]),
      }),
    );
    await run.api.addConnections(['first']);
    const [tool] = run.contribution().tools ?? [];
    const context = toolContext();

    await expect(
      tool.execute?.({ phrase: 'permit' }, context),
    ).resolves.toEqual({
      result: JSON.stringify({
        content: result.content,
        structuredContent: { total: 1 },
        isError: true,
      }),
      isError: true,
    });
    expect(client.callTool).toHaveBeenCalledWith(
      { name: 'search', arguments: { phrase: 'permit' } },
      { timeout: 250, signal: context.signal },
    );
  });

  it('registers each committed client for one aggregate-safe disposal', async () => {
    const firstClient = fakeClient([mcpTool('first')]);
    const secondClient = fakeClient([mcpTool('second')]);
    firstClient.close.mockRejectedValueOnce(new Error('first close failed'));
    secondClient.close.mockRejectedValueOnce(new Error('second close failed'));
    const run = await setupMcp(
      createConfig({
        resolveAuthorized: vi.fn(async () => [
          firstConnection,
          secondConnection,
        ]),
        createClient: clientFactory([firstClient, secondClient]),
      }),
    );
    await run.api.addConnections(['first', 'second']);

    await expect(run.dispose()).rejects.toThrow(AggregateError);
    expect(firstClient.close).toHaveBeenCalledOnce();
    expect(secondClient.close).toHaveBeenCalledOnce();
  });

  it('creates independent clients and active maps for concurrent contexts', async () => {
    const clients = [fakeClient([]), fakeClient([])];
    const config = createConfig({
      resolveAuthorized: vi.fn(async () => [firstConnection]),
      createClient: clientFactory(clients),
    });
    const configured = Mcp.configure(config);
    const [first, second] = await Promise.all([
      setupConfigured(configured.definition, configured.config),
      setupConfigured(configured.definition, configured.config),
    ]);

    await Promise.all([
      first.api.addConnections(['first']),
      second.api.addConnections(['first']),
    ]);

    expect(first.active()).toHaveLength(1);
    expect(second.active()).toHaveLength(1);
    expect(clients[0].connect).toHaveBeenCalledOnce();
    expect(clients[1].connect).toHaveBeenCalledOnce();
  });
});

const createConfig = (overrides: Partial<McpConfig> = {}): McpConfig => ({
  resolveAuthorized: vi.fn(async () => []),
  createClient: vi.fn(() => fakeClient([])),
  ...overrides,
});

const setupMcp = (config: McpConfig) => setupConfigured(Mcp, config);

const setupConfigured = async (
  definition: typeof Mcp,
  config: Readonly<McpConfig>,
) => {
  const controlled = controlledContext();
  const setup = await definition.setup(controlled.context, config);
  return {
    api: setup.api,
    active: () => [...setup.state.current.connections.values()],
    contribution: () =>
      definition.contribute(
        { state: setup.state.current, api: setup.api },
        config,
      ),
    dispose: controlled.dispose,
  };
};

const controlledContext = (): {
  context: ExtensionContext;
  dispose(): Promise<void>;
} => {
  const cleanups: Array<() => void | Promise<void>> = [];
  return {
    context: {
      extensionName: 'mcp',
      state: <State>(initial: State): ExtensionState<State> => {
        let value = initial;
        return {
          get current() {
            return value;
          },
          update(updater) {
            value = updater(value);
          },
        };
      },
      use: <Definition extends ExtensionDefinitionIdentity>(
        definition: Definition,
      ): ExtensionApi<Definition> => {
        throw new Error(`Missing controlled API: ${definition.name}`);
      },
      useOptional: () => undefined,
      own: (cleanup) => cleanups.push(cleanup),
    },
    dispose: async () => {
      const failures: unknown[] = [];
      for (const cleanup of cleanups.toReversed()) {
        try {
          await cleanup();
        } catch (error) {
          failures.push(error);
        }
      }
      if (failures.length > 0) {
        throw new AggregateError(failures, 'Cleanup failed.');
      }
    },
  };
};

const legacyMcpToolName = ({
  serverName,
  toolName,
}: {
  serverName: string;
  toolName: string;
}): string =>
  `mcp_${Buffer.from(serverName).toString('base64url')}_${Buffer.from(toolName).toString('base64url')}`;

const mcpTool = (name: string) => ({
  name,
  description: `${name} description`,
  inputSchema: { type: 'object', properties: {} },
});

const fakeClient = (
  tools: ReturnType<typeof mcpTool>[],
  discoveryError?: Error,
  result: CallToolResult = { content: [], isError: false },
) =>
  ({
    connect: vi.fn(async () => undefined),
    listTools: vi.fn(async (): Promise<ListToolsResult> => {
      if (discoveryError) throw discoveryError;
      return { tools } as ListToolsResult;
    }),
    callTool: vi.fn(async () => result),
    close: vi.fn(async () => undefined),
  }) satisfies McpClient;

const clientFactory = (
  clients: McpClient[],
): ReturnType<typeof vi.fn<McpClientFactory>> => {
  let index = 0;
  return vi.fn(() => {
    const client = clients[index++];
    if (!client) throw new Error('No fake MCP client available.');
    return client;
  });
};

const toolContext = (): ToolExecutionContext => ({
  context: {} as RunContext,
  toolCallId: 'call-1',
  signal: new AbortController().signal,
  emit: vi.fn(),
  runChild: () => emptyChildRun(),
});

async function* emptyChildRun(): AsyncGenerator<RunEvent> {
  yield* [];
}
