import { defineExtension } from '@ayunis/agent-extensions';
import {
  KnowledgeBases,
  type KnowledgeBaseApi,
} from '@ayunis/agent-extensions/knowledge-bases';
import {
  Mcp,
  type McpApi,
  type McpClient,
  type McpClientFactory,
  type McpConnectionDefinition,
} from '@ayunis/agent-extensions/mcp';
import {
  Skills,
  type SkillDefinition,
  type SkillSource,
} from '@ayunis/agent-extensions/skills';
import {
  MockProvider,
  RunContext,
  textTurn,
  toolCallTurn,
  type Message,
  type ProviderRequest,
  type RunEvent,
  type Tool,
} from '@ayunis/agent-runtime';
import { describe, expect, it, vi } from 'vitest';

import { createAgent } from '../index';

const userMessage = (text: string): Message => ({
  role: 'user',
  content: [{ type: 'text', text }],
});

const collect = async (
  events: AsyncIterable<RunEvent>,
): Promise<RunEvent[]> => {
  const collected: RunEvent[] = [];
  for await (const event of events) collected.push(event);
  return collected;
};

const tool = (name: string, execute?: Tool['execute']): Tool => ({
  name,
  description: `${name} description`,
  parameters: { type: 'object', properties: {} },
  ...(execute ? { execute } : {}),
});

const skillSource = (definitions: readonly SkillDefinition[]): SkillSource => ({
  list: async () =>
    definitions.map(({ name, description }) => ({ name, description })),
  load: async (name) => {
    const definition = definitions.find((candidate) => candidate.name === name);
    if (!definition) throw new Error(`Unknown skill '${name}'.`);
    return definition;
  },
});

const knowledgeBases = () =>
  KnowledgeBases.configure({
    resolveAuthorized: async (ids) =>
      ids.map((id) => ({ id, name: id.toUpperCase() })),
    query: async () => 'query result',
    getText: async () => 'text result',
  });

const connection = (
  id: string,
  serverName = id,
  instructions = `Use the ${id} MCP server.`,
): McpConnectionDefinition => ({
  id,
  serverName,
  instructions,
  transport: () => ({}) as never,
});

const fakeMcpClient = (toolNames: readonly string[], discoveryError?: Error) =>
  ({
    connect: vi.fn(async () => undefined),
    listTools: vi.fn(async () => {
      if (discoveryError) throw discoveryError;
      return {
        tools: toolNames.map((name) => ({
          name,
          description: `${name} description`,
          inputSchema: { type: 'object' as const, properties: {} },
        })),
      };
    }),
    callTool: vi.fn(async () => ({ content: [], isError: false })),
    close: vi.fn(async () => undefined),
  }) satisfies McpClient;

const clientFactory = (clients: readonly McpClient[]): McpClientFactory => {
  let index = 0;
  return vi.fn(() => {
    const client = clients[index++];
    if (!client) throw new Error('No fake MCP client available.');
    return client;
  });
};

const mcp = (
  definitions: readonly McpConnectionDefinition[],
  clients: readonly McpClient[],
) =>
  Mcp.configure({
    resolveAuthorized: async (ids) =>
      ids.map((id) => {
        const definition = definitions.find((candidate) => candidate.id === id);
        if (!definition) throw new Error(`Unknown MCP connection '${id}'.`);
        return definition;
      }),
    createClient: clientFactory(clients),
  });

const mcpToolName = (serverName: string, toolName: string): string => {
  const encodedServer = Buffer.from(serverName).toString('base64url');
  const encodedTool = Buffer.from(toolName).toString('base64url');
  return `mcp_${encodedServer.length}_${encodedServer}_${encodedTool}`;
};

const toolNames = (request: ProviderRequest): string[] =>
  request.tools.map(({ name }) => name);

const expectOnlyActivationTool = (request: ProviderRequest): void => {
  expect(toolNames(request)).toEqual(['activate_skill']);
};

const activationResult = (events: readonly RunEvent[], callId: string) =>
  events.find(
    (event) => event.type === 'tool_result' && event.toolCallId === callId,
  );

interface CapturedApis {
  readonly knowledgeBases: KnowledgeBaseApi;
  readonly mcp: McpApi;
}

const captureApis = (
  captured: CapturedApis[],
  context: Parameters<NonNullable<SkillDefinition['activate']>>[0],
): CapturedApis => {
  const apis = {
    knowledgeBases: context.use(KnowledgeBases),
    mcp: context.use(Mcp),
  };
  captured.push(apis);
  return apis;
};

describe('foundational extension integration', () => {
  it('exposes knowledge, MCP, and skill capabilities together after activation', async () => {
    const client = fakeMcpClient(['search']);
    const records = connection('records', 'records-server');
    const skill = Skills.define({
      name: 'legal-research',
      description: 'Research laws and regulations.',
      instructions: 'Prefer primary legal sources.',
      tools: [tool('summarize_record')],
      async activate(context) {
        await context.use(KnowledgeBases).add(['legal']);
        await context.use(Mcp).addConnections(['records']);
      },
    });
    const model = new MockProvider([
      toolCallTurn({
        id: 'activate-legal-research',
        name: 'activate_skill',
        input: { name: skill.name },
      }),
      textTurn('research complete'),
    ]);
    const agent = createAgent({
      name: 'researcher',
      instructions: 'Research safely.',
      modelSelector: 'mock',
      resolveModel: () => model,
      extensions: [
        knowledgeBases(),
        mcp([records], [client]),
        Skills.configure({ source: skillSource([skill]) }),
      ],
    });

    await collect(agent.run({ messages: [userMessage('start')] }));

    expectOnlyActivationTool(model.requests[0]);
    expect(new Set(toolNames(model.requests[1]))).toEqual(
      new Set([
        'knowledge_query',
        'knowledge_get_text',
        mcpToolName('records-server', 'search'),
        'activate_skill',
        'summarize_record',
      ]),
    );
    expect(model.requests[1].instructions).toContain(
      '<knowledge_base id="legal" name="LEGAL" />',
    );
    expect(model.requests[1].instructions).toContain(records.instructions);
    expect(model.requests[1].instructions).toContain(skill.instructions);
    expect(client.close).toHaveBeenCalledOnce();
  });

  it('rolls back knowledge bases staged by a skill that then fails', async () => {
    const skill = Skills.define({
      name: 'failing-research',
      description: 'Prepare research capabilities and then fail.',
      instructions: 'This failed skill instruction must not be exposed.',
      async activate(context) {
        await context.use(KnowledgeBases).add(['legal']);
        throw new Error('activation failed after knowledge-base staging');
      },
    });
    const model = new MockProvider([
      toolCallTurn({
        id: 'activate-failing-research',
        name: 'activate_skill',
        input: { name: skill.name },
      }),
      textTurn('continued safely'),
    ]);
    const agent = createAgent({
      name: 'researcher',
      instructions: 'Research safely.',
      modelSelector: 'mock',
      resolveModel: () => model,
      extensions: [
        knowledgeBases(),
        Skills.configure({ source: skillSource([skill]) }),
      ],
    });

    const events = await collect(
      agent.run({ messages: [userMessage('start')] }),
    );

    expect(activationResult(events, 'activate-failing-research')).toMatchObject(
      {
        isError: true,
        result: expect.stringContaining(
          'activation failed after knowledge-base staging',
        ),
      },
    );
    expect(model.requests).toHaveLength(2);
    expectOnlyActivationTool(model.requests[1]);
    expect(model.requests[1].instructions).not.toContain(skill.instructions);
    expect(model.requests[1].instructions).not.toContain(
      '<available_knowledge_bases>',
    );
  });

  it('closes every provisional MCP client and rolls back earlier state after discovery failure', async () => {
    const firstClient = fakeMcpClient(['search']);
    const secondClient = fakeMcpClient([], new Error('discovery unavailable'));
    const definitions = [connection('first'), connection('second')];
    const skill = Skills.define({
      name: 'broken-connections',
      description: 'Prepare connections that cannot all be discovered.',
      instructions: 'Failed connection instructions must not appear.',
      async activate(context) {
        await context.use(KnowledgeBases).add(['temporary']);
        await context.use(Mcp).addConnections(['first', 'second']);
      },
    });
    const model = new MockProvider([
      toolCallTurn({
        id: 'activate-broken-connections',
        name: 'activate_skill',
        input: { name: skill.name },
      }),
      textTurn('continued safely'),
    ]);
    const agent = createAgent({
      name: 'researcher',
      instructions: 'Research safely.',
      modelSelector: 'mock',
      resolveModel: () => model,
      extensions: [
        knowledgeBases(),
        mcp(definitions, [firstClient, secondClient]),
        Skills.configure({ source: skillSource([skill]) }),
      ],
    });

    const events = await collect(
      agent.run({ messages: [userMessage('start')] }),
    );

    expect(
      activationResult(events, 'activate-broken-connections'),
    ).toMatchObject({
      isError: true,
      result: expect.stringContaining('discovery unavailable'),
    });
    expect(firstClient.close).toHaveBeenCalledOnce();
    expect(secondClient.close).toHaveBeenCalledOnce();
    expectOnlyActivationTool(model.requests[1]);
    expect(model.requests[1].instructions).not.toContain(skill.instructions);
    expect(model.requests[1].instructions).not.toContain(
      '<available_knowledge_bases>',
    );
  });

  it('rolls a skill back when one of its tools collides with a host tool', async () => {
    const skill = Skills.define({
      name: 'host-collision',
      description: 'Contributes a tool already owned by the host.',
      instructions: 'Colliding skill instructions must not appear.',
      tools: [tool('shared_tool')],
      activate: (context) => context.use(KnowledgeBases).add(['temporary']),
    });
    const model = new MockProvider([
      toolCallTurn({
        id: 'activate-host-collision',
        name: 'activate_skill',
        input: { name: skill.name },
      }),
      textTurn('continued safely'),
    ]);
    const agent = createAgent({
      name: 'researcher',
      instructions: 'Research safely.',
      modelSelector: 'mock',
      resolveModel: () => model,
      extensions: [
        knowledgeBases(),
        Skills.configure({ source: skillSource([skill]) }),
      ],
    });

    const events = await collect(
      agent.run({
        messages: [userMessage('start')],
        tools: [tool('shared_tool')],
      }),
    );

    expect(activationResult(events, 'activate-host-collision')).toMatchObject({
      isError: true,
      result: expect.stringMatching(/shared_tool.*collides.*host/i),
    });
    expect(new Set(toolNames(model.requests[1]))).toEqual(
      new Set(['shared_tool', 'activate_skill']),
    );
    expect(model.requests[1].instructions).not.toContain(skill.instructions);
    expect(model.requests[1].instructions).not.toContain(
      '<available_knowledge_bases>',
    );
  });

  it('rolls later skill state and resources back after a skill-to-skill collision', async () => {
    const client = fakeMcpClient(['search']);
    const records = connection('records');
    const first = Skills.define({
      name: 'first-skill',
      description: 'Owns the shared skill tool first.',
      instructions: 'First skill remains active.',
      tools: [tool('shared_skill_tool')],
    });
    const second = Skills.define({
      name: 'second-skill',
      description: 'Attempts to reuse a skill tool name.',
      instructions: 'Second skill must be rolled back.',
      tools: [tool('shared_skill_tool')],
      async activate(context) {
        await context.use(KnowledgeBases).add(['temporary']);
        await context.use(Mcp).addConnections(['records']);
      },
    });
    const model = new MockProvider([
      toolCallTurn({
        id: 'activate-first',
        name: 'activate_skill',
        input: { name: first.name },
      }),
      toolCallTurn({
        id: 'activate-second',
        name: 'activate_skill',
        input: { name: second.name },
      }),
      textTurn('continued safely'),
    ]);
    const agent = createAgent({
      name: 'researcher',
      instructions: 'Research safely.',
      modelSelector: 'mock',
      resolveModel: () => model,
      extensions: [
        knowledgeBases(),
        mcp([records], [client]),
        Skills.configure({ source: skillSource([first, second]) }),
      ],
    });

    const events = await collect(
      agent.run({ messages: [userMessage('start')] }),
    );

    expect(activationResult(events, 'activate-second')).toMatchObject({
      isError: true,
      result: expect.stringMatching(/shared_skill_tool.*collides.*skills/i),
    });
    expect(new Set(toolNames(model.requests[2]))).toEqual(
      new Set(['activate_skill', 'shared_skill_tool']),
    );
    expect(model.requests[2].instructions).toContain(first.instructions);
    expect(model.requests[2].instructions).not.toContain(second.instructions);
    expect(model.requests[2].instructions).not.toContain(
      '<available_knowledge_bases>',
    );
    expect(client.close).toHaveBeenCalledOnce();
  });

  it('rolls state and resources back after a skill-to-MCP tool collision', async () => {
    const client = fakeMcpClient(['search']);
    const records = connection('records', 'records-server');
    const collisionName = mcpToolName(records.serverName, 'search');
    const skill = Skills.define({
      name: 'cross-extension-collision',
      description: 'Attempts to reuse a namespaced MCP tool name.',
      instructions: 'Cross-extension collision instructions must not appear.',
      tools: [tool(collisionName)],
      async activate(context) {
        await context.use(KnowledgeBases).add(['temporary']);
        await context.use(Mcp).addConnections(['records']);
      },
    });
    const model = new MockProvider([
      toolCallTurn({
        id: 'activate-cross-extension-collision',
        name: 'activate_skill',
        input: { name: skill.name },
      }),
      textTurn('continued safely'),
    ]);
    const agent = createAgent({
      name: 'researcher',
      instructions: 'Research safely.',
      modelSelector: 'mock',
      resolveModel: () => model,
      extensions: [
        knowledgeBases(),
        mcp([records], [client]),
        Skills.configure({ source: skillSource([skill]) }),
      ],
    });

    const events = await collect(
      agent.run({ messages: [userMessage('start')] }),
    );

    expect(
      activationResult(events, 'activate-cross-extension-collision'),
    ).toMatchObject({
      isError: true,
      result: expect.stringContaining(collisionName),
    });
    expectOnlyActivationTool(model.requests[1]);
    expect(model.requests[1].instructions).not.toContain(skill.instructions);
    expect(model.requests[1].instructions).not.toContain(
      '<available_knowledge_bases>',
    );
    expect(client.close).toHaveBeenCalledOnce();
  });

  it.each([
    { name: 'knowledge-bases', dependency: KnowledgeBases },
    { name: 'mcp', dependency: Mcp },
  ])(
    'returns a model-actionable, skill-attributed error when $name is missing',
    async ({ name, dependency }) => {
      const skill = Skills.define({
        name: `needs-${name}`,
        description: `Requires the ${name} extension.`,
        instructions: 'Missing dependency instructions must not appear.',
        activate(context) {
          context.use(dependency);
        },
      });
      const callId = `activate-needs-${name}`;
      const model = new MockProvider([
        toolCallTurn({
          id: callId,
          name: 'activate_skill',
          input: { name: skill.name },
        }),
        textTurn('continued safely'),
      ]);
      const agent = createAgent({
        name: 'researcher',
        instructions: 'Research safely.',
        modelSelector: 'mock',
        resolveModel: () => model,
        extensions: [Skills.configure({ source: skillSource([skill]) })],
      });

      const events = await collect(
        agent.run({ messages: [userMessage('start')] }),
      );

      expect(activationResult(events, callId)).toMatchObject({
        isError: true,
        result: expect.stringMatching(
          new RegExp(
            `Could not activate skill.*skills.*missing extension '${name}'`,
            'i',
          ),
        ),
      });
      expectOnlyActivationTool(model.requests[1]);
      expect(model.requests[1].instructions).not.toContain(skill.instructions);
    },
  );

  it('isolates active capabilities, APIs, clients, and cleanup across concurrent runs', async () => {
    const clients = [fakeMcpClient(['search']), fakeMcpClient(['search'])];
    const definitions = [connection('alpha'), connection('beta')];
    const captured: CapturedApis[] = [];
    let activationIndex = 0;
    const skill = Skills.define({
      name: 'isolated-research',
      description: 'Activates one run-local capability set.',
      instructions: 'Use only this run capability set.',
      async activate(context) {
        const id = definitions[activationIndex++]?.id;
        if (!id) throw new Error('Unexpected extra activation.');
        const apis = captureApis(captured, context);
        await apis.knowledgeBases.add([id]);
        await apis.mcp.addConnections([id]);
      },
    });
    const models = [
      new MockProvider([
        toolCallTurn({
          id: 'activate-alpha',
          name: 'activate_skill',
          input: { name: skill.name },
        }),
        textTurn('alpha complete'),
      ]),
      new MockProvider([
        toolCallTurn({
          id: 'activate-beta',
          name: 'activate_skill',
          input: { name: skill.name },
        }),
        textTurn('beta complete'),
      ]),
    ];
    const agent = createAgent({
      name: 'researcher',
      instructions: 'Research safely.',
      modelSelector: 'mock',
      resolveModel: (_selector, { context }) =>
        models[context.get<number>('slot') ?? 0],
      extensions: [
        knowledgeBases(),
        mcp(definitions, clients),
        Skills.configure({ source: skillSource([skill]) }),
      ],
    });

    await Promise.all(
      models.map((_model, slot) =>
        collect(
          agent.run({
            messages: [userMessage('start')],
            context: RunContext.create({ slot }),
          }),
        ),
      ),
    );

    expect(captured).toHaveLength(2);
    expect(captured[0].knowledgeBases).not.toBe(captured[1].knowledgeBases);
    expect(captured[0].mcp).not.toBe(captured[1].mcp);
    const secondRequests = models.map((model) => model.requests[1]);
    expect(
      secondRequests.map((request) => request.instructions).join('\n'),
    ).toContain('id="alpha"');
    expect(
      secondRequests.map((request) => request.instructions).join('\n'),
    ).toContain('id="beta"');
    for (const request of secondRequests) {
      expect(request.instructions.match(/<knowledge_base /g)).toHaveLength(1);
    }
    for (const client of clients) expect(client.close).toHaveBeenCalledOnce();
  });

  it('gives a child run fresh foundational state, APIs, clients, and cleanup ownership', async () => {
    const clients = [fakeMcpClient(['search']), fakeMcpClient(['search'])];
    const definitions = [connection('parent'), connection('child')];
    const captured: CapturedApis[] = [];
    const childEvents: RunEvent[] = [];
    let activationIndex = 0;
    const childModel = new MockProvider([
      toolCallTurn({
        id: 'activate-child',
        name: 'activate_skill',
        input: { name: 'nested-research' },
      }),
      textTurn('child complete'),
    ]);
    const spawnChild = tool('spawn_child', async (_input, context) => {
      childEvents.push(
        ...(await collect(
          context.runChild({
            instructions: 'Child instructions.',
            model: childModel,
            messages: [userMessage('child start')],
          }),
        )),
      );
      return 'child completed';
    });
    const skill = Skills.define({
      name: 'nested-research',
      description: 'Activates isolated parent or child capabilities.',
      instructions: 'Use only this agent-run capability set.',
      tools: [spawnChild],
      async activate(context) {
        const id = definitions[activationIndex++]?.id;
        if (!id) throw new Error('Unexpected extra activation.');
        const apis = captureApis(captured, context);
        await apis.knowledgeBases.add([id]);
        await apis.mcp.addConnections([id]);
      },
    });
    const parentModel = new MockProvider([
      toolCallTurn({
        id: 'activate-parent',
        name: 'activate_skill',
        input: { name: skill.name },
      }),
      toolCallTurn({ id: 'spawn-child', name: 'spawn_child', input: {} }),
      textTurn('parent complete'),
    ]);
    const agent = createAgent({
      name: 'researcher',
      instructions: 'Parent instructions.',
      modelSelector: 'mock',
      resolveModel: () => parentModel,
      extensions: [
        knowledgeBases(),
        mcp(definitions, clients),
        Skills.configure({ source: skillSource([skill]) }),
      ],
    });

    await collect(agent.run({ messages: [userMessage('parent start')] }));

    expectOnlyActivationTool(childModel.requests[0]);
    expect(childModel.requests[0].instructions).not.toContain('id="parent"');
    expect(childModel.requests[1].instructions).toContain('id="child"');
    expect(childModel.requests[1].instructions).not.toContain('id="parent"');
    expect(parentModel.requests[2].instructions).toContain('id="parent"');
    expect(parentModel.requests[2].instructions).not.toContain('id="child"');
    expect(captured[0].knowledgeBases).not.toBe(captured[1].knowledgeBases);
    expect(captured[0].mcp).not.toBe(captured[1].mcp);
    expect(childEvents[0]).toMatchObject({ type: 'run_start', depth: 1 });
    for (const client of clients) expect(client.close).toHaveBeenCalledOnce();
  });

  it('finalizes the runtime and every acquired extension resource once after abandonment', async () => {
    const extensionCleanup = vi.fn();
    const runtimeFinalized = vi.fn();
    const LifecycleProbe = defineExtension({
      name: 'lifecycle-probe',
      setup: (context, config: Record<string, never>) => {
        context.own(extensionCleanup);
        return { state: context.state(config), api: {} };
      },
      contribute: () => ({
        hooks: [{ name: 'lifecycle-probe', runEnd: runtimeFinalized }],
      }),
    });
    const client = fakeMcpClient(['search']);
    const records = connection('records');
    const skill = Skills.define({
      name: 'resourceful-research',
      description: 'Acquires one run-owned MCP client.',
      instructions: 'Use the acquired resource.',
      activate: (context) => context.use(Mcp).addConnections(['records']),
    });
    const model = new MockProvider([
      toolCallTurn({
        id: 'activate-resource',
        name: 'activate_skill',
        input: { name: skill.name },
      }),
      textTurn('unreachable after abandonment'),
    ]);
    const agent = createAgent({
      name: 'researcher',
      instructions: 'Research safely.',
      modelSelector: 'mock',
      resolveModel: () => model,
      extensions: [
        mcp([records], [client]),
        Skills.configure({ source: skillSource([skill]) }),
        LifecycleProbe.configure({}),
      ],
    });
    const iterator = agent
      .run({ messages: [userMessage('start')] })
      [Symbol.asyncIterator]();

    let next = await iterator.next();
    while (!next.done && next.value.type !== 'tool_result') {
      next = await iterator.next();
    }
    expect(next).toMatchObject({
      done: false,
      value: { type: 'tool_result', toolCallId: 'activate-resource' },
    });
    await iterator.return?.();
    await iterator.return?.();

    expect(runtimeFinalized).toHaveBeenCalledOnce();
    expect(extensionCleanup).toHaveBeenCalledOnce();
    expect(client.close).toHaveBeenCalledOnce();
    expect(model.requests).toHaveLength(1);
  });
});
