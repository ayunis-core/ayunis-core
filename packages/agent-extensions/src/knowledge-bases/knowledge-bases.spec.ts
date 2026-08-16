import type {
  AfterToolCallContext,
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
import {
  KnowledgeBases,
  type KnowledgeBaseConfig,
  type KnowledgeBaseSummary,
} from './knowledge-bases';

const alpha: KnowledgeBaseSummary = { id: 'alpha', name: 'Alpha & more' };
const beta: KnowledgeBaseSummary = { id: 'beta', name: 'Beta' };

const createConfig = (
  overrides: Partial<KnowledgeBaseConfig> = {},
): KnowledgeBaseConfig => ({
  resolveAuthorized: vi.fn(async (ids: readonly string[]) =>
    ids.map((id) => ({ id, name: id.toUpperCase() })),
  ),
  query: vi.fn(async () => 'query result'),
  getText: vi.fn(async () => 'text result'),
  ...overrides,
});

describe('KnowledgeBases', () => {
  it('contributes nothing while no knowledge base is active', async () => {
    const run = await setupKnowledgeBases(createConfig());

    expect(run.contribution()).toEqual({ hooks: [run.hook] });
  });

  it.each([
    {
      name: 'missing',
      resolved: [alpha],
      expected: /missing.*beta/i,
    },
    {
      name: 'duplicate',
      resolved: [alpha, alpha],
      expected: /duplicate.*alpha/i,
    },
    {
      name: 'unrequested',
      resolved: [alpha, { id: 'gamma', name: 'Gamma' }],
      expected: /unrequested.*gamma/i,
    },
  ])(
    'commits nothing for $name resolver results',
    async ({ resolved, expected }) => {
      const run = await setupKnowledgeBases(
        createConfig({ resolveAuthorized: vi.fn(async () => resolved) }),
      );

      await expect(run.api.add(['alpha', 'beta'])).rejects.toThrow(expected);
      expect(run.active()).toEqual([]);
      expect(run.contribution().tools).toBeUndefined();
    },
  );

  it('rejects duplicate requested IDs before resolving', async () => {
    const resolveAuthorized = vi.fn(async () => [alpha]);
    const run = await setupKnowledgeBases(createConfig({ resolveAuthorized }));

    await expect(run.api.add(['alpha', 'alpha'])).rejects.toThrow(
      /duplicate requested.*alpha/i,
    );
    expect(resolveAuthorized).not.toHaveBeenCalled();
  });

  it('adds and removes deterministically and idempotently', async () => {
    const resolveAuthorized = vi.fn(async () => [beta, alpha]);
    const run = await setupKnowledgeBases(createConfig({ resolveAuthorized }));

    await run.api.add(['beta', 'alpha']);
    await run.api.add(['alpha', 'beta']);
    run.api.remove(['missing', 'alpha', 'alpha']);
    run.api.remove(['alpha']);

    expect(resolveAuthorized).toHaveBeenCalledOnce();
    expect(run.active()).toEqual([beta]);
  });

  it('derives escaped instructions and both schemas from one sorted snapshot', async () => {
    const run = await setupKnowledgeBases(
      createConfig({ resolveAuthorized: vi.fn(async () => [beta, alpha]) }),
    );
    await run.api.add(['beta', 'alpha']);

    const contribution = run.contribution();
    expect(contribution.instructions).toContain(
      '<knowledge_base id="alpha" name="Alpha &amp; more" />',
    );
    expect(contribution.instructions?.indexOf('alpha')).toBeLessThan(
      contribution.instructions?.indexOf('beta') ?? 0,
    );
    expect(contribution.tools?.map(({ name }) => name)).toEqual([
      'knowledge_query',
      'knowledge_get_text',
    ]);
    for (const tool of contribution.tools ?? []) {
      expect(
        (
          tool.parameters.properties as Record<
            string,
            { enum?: readonly string[] }
          >
        ).knowledgeBaseId.enum,
      ).toEqual(['alpha', 'beta']);
    }
  });

  it('delegates validated typed input and runtime context to host ports', async () => {
    const query = vi.fn(async () => 'query result');
    const getText = vi.fn(async () => 'text result');
    const run = await setupKnowledgeBases(createConfig({ query, getText }));
    await run.api.add(['alpha']);
    const [queryTool, textTool] = run.contribution().tools ?? [];
    const context = toolContext();

    await expect(
      queryTool.execute?.(
        { knowledgeBaseId: 'alpha', query: 'permits' },
        context,
      ),
    ).resolves.toBe('query result');
    await expect(
      textTool.execute?.(
        {
          knowledgeBaseId: 'alpha',
          documentId: 'doc-1',
          startLine: 2,
          numLines: 4,
        },
        context,
      ),
    ).resolves.toBe('text result');
    expect(query).toHaveBeenCalledWith(
      { knowledgeBaseId: 'alpha', query: 'permits' },
      context,
    );
    expect(getText).toHaveBeenCalledWith(
      {
        knowledgeBaseId: 'alpha',
        documentId: 'doc-1',
        startLine: 2,
        numLines: 4,
      },
      context,
    );
  });

  it('applies advertised text defaults before delegating to the host', async () => {
    const getText = vi.fn(async () => 'text result');
    const run = await setupKnowledgeBases(createConfig({ getText }));
    await run.api.add(['alpha']);
    const textTool = run
      .contribution()
      .tools?.find(({ name }) => name === 'knowledge_get_text');
    const context = toolContext();

    await textTool?.execute?.(
      { knowledgeBaseId: 'alpha', documentId: 'doc-1' },
      context,
    );

    expect(getText).toHaveBeenCalledWith(
      {
        knowledgeBaseId: 'alpha',
        documentId: 'doc-1',
        startLine: 1,
        numLines: 100,
      },
      context,
    );
  });

  it('keeps one usage hook that observes current active knowledge bases', async () => {
    const recordUsage = vi.fn();
    const run = await setupKnowledgeBases(createConfig({ recordUsage }));
    const hook = run.hook;
    await run.api.add(['alpha']);

    await hook.afterToolCall?.(
      afterToolCallContext('knowledge_query') as AfterToolCallContext,
    );
    run.api.remove(['alpha']);
    await hook.afterToolCall?.(
      afterToolCallContext('knowledge_get_text') as AfterToolCallContext,
    );

    expect(
      recordUsage.mock.calls.map(([event]) => event.activeKnowledgeBases),
    ).toEqual([[{ id: 'alpha', name: 'ALPHA' }], []]);
    expect(run.contribution().hooks?.[0]).toBe(hook);
  });

  it('does not share active knowledge bases between controlled runs', async () => {
    const configured = KnowledgeBases.configure(createConfig());
    const first = await setupConfigured(
      configured.definition,
      configured.config,
    );
    const second = await setupConfigured(
      configured.definition,
      configured.config,
    );

    await first.api.add(['alpha']);

    expect(first.active()).toHaveLength(1);
    expect(second.active()).toEqual([]);
  });
});

const setupKnowledgeBases = (config: KnowledgeBaseConfig) =>
  setupConfigured(KnowledgeBases, config);

const setupConfigured = async (
  definition: typeof KnowledgeBases,
  config: Readonly<KnowledgeBaseConfig>,
) => {
  const controlled = controlledContext();
  const setup = await definition.setup(controlled.context, config);
  const contribution = () =>
    definition.contribute(
      { state: setup.state.current, api: setup.api },
      config,
    );
  const hook = contribution().hooks?.[0];
  if (!hook) throw new Error('Expected the stable usage hook.');
  return {
    api: setup.api,
    hook,
    contribution,
    active: () => [...setup.state.current.knowledgeBases.values()],
  };
};

const controlledContext = (): { context: ExtensionContext } => ({
  context: {
    extensionName: 'knowledge-bases',
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
    own: () => undefined,
  },
});

const toolContext = (): ToolExecutionContext =>
  ({
    context: {} as RunContext,
    toolCallId: 'call-1',
    signal: new AbortController().signal,
    emit: vi.fn(),
    runChild: () => emptyChildRun(),
  }) satisfies ToolExecutionContext;

async function* emptyChildRun(): AsyncGenerator<RunEvent> {
  yield* [];
}

const afterToolCallContext = (name: string) => ({
  toolCall: { id: 'call-1', name, input: {} },
  result: 'ok',
  isError: false,
  outcome: 'success' as const,
  isLastToolCall: true,
});
