import type {
  AfterToolCallContext,
  RunContext,
  RunEvent,
  Tool,
  ToolExecutionContext,
} from '@ayunis/agent-runtime';
import { describe, expect, it, vi } from 'vitest';

import type {
  ExtensionContext,
  ExtensionDefinitionIdentity,
  ExtensionState,
} from '../extensions/context';
import { MissingExtensionError } from '../extensions/errors';
import { defineExtension, type ExtensionSetup } from '../extensions/extension';
import { KnowledgeBases } from '../knowledge-bases/knowledge-bases';
import { Skills } from './skills';
import type { SkillsConfig } from './skills';
import type {
  SkillDefinition,
  SkillSource,
  SkillSummary,
} from './skill-source';

const summary: SkillSummary = {
  name: 'legal-research',
  description: 'Research <laws> & regulations.',
};

const definition = () =>
  Skills.define({
    ...summary,
    instructions: 'Use primary legal sources.',
    tools: [tool('find_statute')],
  });

describe('Skills.define', () => {
  it('returns a validated frozen plain definition without extension lifecycle', () => {
    const skill = definition();

    expect(skill).toMatchObject({
      ...summary,
      instructions: 'Use primary legal sources.',
    });
    expect(Object.isFrozen(skill)).toBe(true);
    expect(Object.isFrozen(skill.tools)).toBe(true);
    expect(skill).not.toHaveProperty('setup');
    expect(skill).not.toHaveProperty('configure');
  });

  it.each([
    [{ ...summary, name: 'Invalid Name', instructions: 'valid' }, /name/i],
    [{ ...summary, description: '', instructions: 'valid' }, /description/i],
    [{ ...summary, instructions: '' }, /instructions/i],
    [
      {
        ...summary,
        instructions: 'valid',
        tools: [tool('same'), tool('same')],
      },
      /duplicate.*same/i,
    ],
  ])('rejects invalid definitions', (input, expected) => {
    expect(() => Skills.define(input)).toThrow(expected);
  });
});

describe('Skills extension', () => {
  it('contributes no catalog, activation tool, or hook for an empty source', async () => {
    const engine = controlledEngine();
    const config = { source: sourceWith([]) };
    const setup = await engine.setup(Skills, config);

    expect(
      Skills.contribute({ state: setup.state.current, api: setup.api }, config),
    ).toEqual({});
  });

  it('lists once and contributes a deterministic escaped catalog and exact choices', async () => {
    const source = sourceWith([
      { name: 'zebra', description: 'Last' },
      summary,
    ]);
    const run = await setupSkills({ source });

    expect(source.list).toHaveBeenCalledOnce();
    expect(source.load).not.toHaveBeenCalled();
    expect(run.contribution().instructions).toContain(
      '<name>legal-research</name>',
    );
    expect(run.contribution().instructions).toContain(
      'Research &lt;laws&gt; &amp; regulations.',
    );
    expect(activationNameSchema(run.activationTool).enum).toEqual([
      'legal-research',
      'zebra',
    ]);
    expect(run.contribution().tools?.map(({ name }) => name)).toEqual([
      'activate_skill',
    ]);
  });

  it('loads only the selected definition and validates loaded metadata', async () => {
    const source = sourceWith([summary], async () => ({
      ...definition(),
      description: 'Changed description',
    }));
    const run = await setupSkills({ source });

    await expect(run.activate('legal-research')).rejects.toThrow(
      /legal-research.*metadata/i,
    );
    expect(source.load).toHaveBeenCalledWith('legal-research', {
      signal: expect.any(AbortSignal),
    });
    expect(run.state().pendingByCall.size).toBe(0);
    expect(run.state().activated.size).toBe(0);
  });

  it('forwards cancellation to skill loading and preserves abort failures', async () => {
    const abortError = new DOMException(
      'The operation was aborted',
      'AbortError',
    );
    const source = {
      list: vi.fn(async () => [summary]),
      load: vi.fn(async () => {
        throw abortError;
      }),
    } satisfies SkillSource;
    const run = await setupSkills({ source });

    await expect(run.activate('legal-research')).rejects.toBe(abortError);
    expect(source.load).toHaveBeenCalledWith('legal-research', {
      signal: expect.any(AbortSignal),
    });
  });

  it('returns attributed model-actionable source and activation failures', async () => {
    const failingSource = sourceWith([summary], async () => {
      throw new Error('source unavailable');
    });
    const sourceRun = await setupSkills({ source: failingSource });

    await expect(sourceRun.activate('legal-research')).rejects.toThrow(
      'Could not activate skill "legal-research": source unavailable',
    );

    const missingDependency = Skills.define({
      ...summary,
      instructions: 'Needs knowledge.',
      activate: (context) => context.use(KnowledgeBases).add(['legal']),
    });
    const dependencyRun = await setupSkills({
      source: sourceWith([summary], async () => missingDependency),
    });

    await expect(
      dependencyRun.activate('legal-research'),
    ).rejects.toMatchObject({
      message: expect.stringMatching(/legal-research.*knowledge-bases/i),
      cause: expect.objectContaining({
        consumerName: 'skills',
        missingExtensionName: 'knowledge-bases',
      }),
    });
  });

  it('prepares capabilities transactionally and rolls back state and resources on failure', async () => {
    const cleanup = vi.fn();
    let dependencyState: ExtensionState<boolean>;
    const Dependency = defineExtension({
      name: 'dependency',
      setup: (context, config: Record<string, never>) => {
        dependencyState = context.state(false);
        return {
          state: dependencyState,
          api: {
            activate: () => {
              dependencyState.update(() => true);
              context.own(cleanup);
            },
            config,
          },
        };
      },
      contribute: () => ({}),
    });
    const engine = controlledEngine();
    const dependency = await engine.setup(Dependency, {});
    const skill = Skills.define({
      ...summary,
      instructions: 'Failure should not leak.',
      activate: (context) => {
        context.use(Dependency).activate();
        throw new Error('trusted activation failed');
      },
    });
    const run = await setupSkills(
      { source: sourceWith([summary], async () => skill) },
      engine,
    );

    await expect(
      engine.transaction(() => run.activate('legal-research')),
    ).rejects.toThrow(/legal-research.*trusted activation failed/i);

    expect(dependency.state.current).toBe(false);
    expect(cleanup).toHaveBeenCalledOnce();
    expect(run.state().pendingByCall.size).toBe(0);
    expect(run.contribution().tools?.map(({ name }) => name)).toEqual([
      'activate_skill',
    ]);
  });

  it('keeps prepared instructions and tools staged until successful completion', async () => {
    const activate = vi.fn();
    const skill = Skills.define({
      ...summary,
      instructions: 'Activated instructions.',
      tools: [tool('activated_tool')],
      activate,
    });
    const run = await setupSkills({
      source: sourceWith([summary], async () => skill),
    });

    const output = await run.activate('legal-research', 'call-1');
    expect(output).toMatchObject({ isError: false });
    expect(run.state().activated.size).toBe(0);
    expect(run.state().pendingByCall.size).toBe(1);
    expect(run.contribution().instructions).toContain(
      'Activated instructions.',
    );
    expect(run.contribution().tools?.map(({ name }) => name)).toEqual([
      'activate_skill',
      'activated_tool',
    ]);

    await run.complete('call-1', 'success');

    expect(run.state().pendingByCall.size).toBe(0);
    expect([...run.state().activated.keys()]).toEqual(['legal-research']);
    expect(run.state().activated.get('legal-research')).toMatchObject({
      name: skill.name,
      description: skill.description,
      instructions: skill.instructions,
    });
    expect(activate).toHaveBeenCalledOnce();
  });

  it.each(['error', 'aborted'] as const)(
    'discards prepared activation after an %s outcome',
    async (outcome) => {
      const run = await setupSkills({
        source: sourceWith([summary], async () => definition()),
      });
      await run.activate('legal-research', 'call-1');

      await run.complete('call-1', outcome);

      expect(run.state().pendingByCall.size).toBe(0);
      expect(run.state().activated.size).toBe(0);
      expect(run.contribution().tools?.map(({ name }) => name)).toEqual([
        'activate_skill',
      ]);
    },
  );

  it('makes repeated activation idempotent and completes it only once', async () => {
    const activate = vi.fn();
    const skill = Skills.define({ ...definition(), activate });
    const source = sourceWith([summary], async () => skill);
    const run = await setupSkills({ source });

    await run.activate('legal-research', 'first-call');
    await run.complete('first-call', 'success');
    await run.activate('legal-research', 'second-call');
    await run.complete('first-call', 'success');
    await run.complete('second-call', 'success');

    expect(source.load).toHaveBeenCalledOnce();
    expect(activate).toHaveBeenCalledOnce();
    expect(run.state().activated.size).toBe(1);
    expect(run.contribution().hooks?.[0]).toBe(run.hook);
  });
});

const setupSkills = async (
  config: SkillsConfig,
  engine = controlledEngine(),
) => {
  const setup = await engine.setup(Skills, config);
  const contribution = () =>
    Skills.contribute({ state: setup.state.current, api: setup.api }, config);
  const activationTool = contribution().tools?.find(
    ({ name }) => name === 'activate_skill',
  );
  const hook = contribution().hooks?.[0];
  if (!activationTool || !hook) {
    throw new Error('Expected Skills activation tool and hook.');
  }
  return {
    activationTool,
    hook,
    contribution,
    state: () => setup.state.current,
    activate: (name: string, toolCallId = 'call-1') =>
      activationTool.execute?.({ name }, toolContext(toolCallId)),
    complete: (toolCallId: string, outcome: 'success' | 'error' | 'aborted') =>
      hook.afterToolCall?.(
        afterToolCallContext(
          toolCallId,
          outcome,
        ) as unknown as AfterToolCallContext,
      ),
  };
};

const sourceWith = (
  summaries: readonly SkillSummary[],
  load: (name: string) => Promise<SkillDefinition> = async () => definition(),
): SkillSource & {
  list: ReturnType<typeof vi.fn>;
  load: ReturnType<typeof vi.fn>;
} => ({
  list: vi.fn(async () => summaries),
  load: vi.fn(load),
});

const controlledEngine = () => {
  const registry = new Map<ExtensionDefinitionIdentity, unknown>();
  const cleanups: Array<() => void | Promise<void>> = [];
  let consumerName = 'skills';
  let transaction: Transaction | undefined;
  const context: ExtensionContext = {
    get extensionName() {
      return consumerName;
    },
    state: <State>(initial: State): ExtensionState<State> => {
      return controlledCell(initial, () => transaction);
    },
    use: <Definition extends ExtensionDefinitionIdentity>(
      definition: Definition,
    ) => {
      if (!registry.has(definition)) {
        throw new MissingExtensionError(consumerName, definition.name);
      }
      return registry.get(definition);
    },
    useOptional: <Definition extends ExtensionDefinitionIdentity>(
      definition: Definition,
    ) => registry.get(definition),
    own: (cleanup) =>
      transaction ? transaction.cleanups.push(cleanup) : cleanups.push(cleanup),
  };
  return {
    setup: async <Config, State, Api>(
      definition: ExtensionDefinitionIdentity & {
        setup(
          context: ExtensionContext,
          config: Readonly<Config>,
        ): ExtensionSetup<State, Api> | Promise<ExtensionSetup<State, Api>>;
      },
      config: Readonly<Config>,
    ) => {
      consumerName = definition.name;
      const setup = await definition.setup(context, config);
      registry.set(definition, setup.api);
      return setup;
    },
    transaction: async <Result>(operation: () => Result | Promise<Result>) => {
      const active: Transaction = { staged: new Map(), cleanups: [] };
      transaction = active;
      try {
        const result = await operation();
        for (const [cell, value] of active.staged) cell.commit(value);
        cleanups.push(...active.cleanups);
        return result;
      } catch (error) {
        for (const cleanup of active.cleanups.toReversed()) await cleanup();
        throw error;
      } finally {
        transaction = undefined;
      }
    },
  };
};

interface Transaction {
  readonly staged: Map<ControlledCell<unknown>, unknown>;
  readonly cleanups: Array<() => void | Promise<void>>;
}

interface ControlledCell<State> extends ExtensionState<State> {
  commit(value: unknown): void;
}

const controlledCell = <State>(
  initial: State,
  activeTransaction: () => Transaction | undefined,
): ControlledCell<State> => {
  let committed = initial;
  const cell: ControlledCell<State> = {
    get current() {
      const staged = activeTransaction()?.staged.get(cell);
      return (staged === undefined ? committed : staged) as State;
    },
    update(updater) {
      const next = updater(cell.current);
      const active = activeTransaction();
      if (active) active.staged.set(cell, next);
      else committed = next;
    },
    commit(value) {
      committed = value as State;
    },
  };
  return cell;
};

const tool = (name: string): Tool => ({
  name,
  description: `${name} description`,
  parameters: { type: 'object', properties: {} },
  execute: () => 'ok',
});

const activationNameSchema = (activationTool: Tool): { enum?: string[] } =>
  (activationTool.parameters.properties as Record<string, { enum?: string[] }>)
    .name;

const toolContext = (toolCallId: string): ToolExecutionContext => ({
  context: {} as RunContext,
  toolCallId,
  toolNames: ['activate_skill'],
  signal: new AbortController().signal,
  emit: vi.fn(),
  runChild: () => emptyChildRun(),
});

async function* emptyChildRun(): AsyncGenerator<RunEvent> {
  yield* [];
}

const afterToolCallContext = (
  id: string,
  outcome: 'success' | 'error' | 'aborted',
) => ({
  toolCall: { id, name: 'activate_skill', input: { name: summary.name } },
  result: outcome,
  isError: outcome !== 'success',
  outcome,
  isLastToolCall: true,
});
