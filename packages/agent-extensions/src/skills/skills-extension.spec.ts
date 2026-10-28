import {
  MockProvider,
  run,
  RunContext,
  textTurn,
  toolCallTurn,
  type Hook,
  type Tool,
} from '@ayunis/agent-runtime';
import { describe, expect, it, vi } from 'vitest';

import type {
  SkillDefinition,
  SkillSource,
  SkillSummary,
} from './skill-source';
import { skillsExtension } from './skills-extension';

const summaries: SkillSummary[] = [
  { name: 'incident_response', description: 'Triage <urgent> incidents' },
  { name: 'access_review', description: 'Review access & permissions' },
];

const definitions: Record<string, SkillDefinition> = {
  access_review: {
    name: 'access_review',
    description: 'Review access & permissions',
    instructions: 'Follow the access review checklist.',
    tools: [tool('list_access')],
  },
  incident_response: {
    name: 'incident_response',
    description: 'Triage <urgent> incidents',
    instructions: 'Follow the incident response playbook.',
    tools: [tool('page_responder')],
  },
};

function tool(name: string): Tool {
  return {
    name,
    description: `${name} description`,
    parameters: { type: 'object', properties: {} },
    execute: () => `${name} result`,
  };
}

function source(overrides: Partial<SkillSource> = {}): SkillSource {
  return {
    list: vi.fn(async () => summaries),
    load: vi.fn(async (name) => {
      const definition = definitions[name];
      if (!definition) {
        throw new Error(`Skill not found: ${name}`);
      }
      return definition;
    }),
    ...overrides,
  };
}

type ExecutableTool = Tool & Required<Pick<Tool, 'execute'>>;

function isExecutableTool(tool: Tool | undefined): tool is ExecutableTool {
  return typeof tool?.execute === 'function';
}

async function initialize(skillSource: SkillSource = source()) {
  const instance = await skillsExtension({ source: skillSource });
  const activationTool = instance.tools?.[0];
  const hook = instance.hooks?.[0];
  if (!isExecutableTool(activationTool) || !hook) {
    throw new Error('Skills extension did not expose its activation lifecycle');
  }
  return { instance, activationTool, hook };
}

function startRun(
  hook: Hook,
  context: RunContext,
  tools: readonly Tool[] = [],
) {
  return hook.runStart?.({
    context,
    messages: [],
    instructions: '',
    tools: [...tools],
    transformMessages: vi.fn(),
    addTools: vi.fn(),
    removeTools: vi.fn(),
    setTools: vi.fn(),
    addInstructions: vi.fn(),
    setInstructions: vi.fn(),
    abort: vi.fn(),
    emit: vi.fn(),
  });
}

async function executeActivation(
  activationTool: ExecutableTool,
  context: RunContext,
  name: unknown,
  toolCallId = `activate-${String(name)}`,
  toolNames: readonly string[] = [activationTool.name],
  signal?: AbortSignal,
) {
  return activationTool.execute(
    { name },
    {
      context,
      toolCallId,
      toolNames,
      signal,
      emit: vi.fn(),
      runChild: vi.fn(),
    },
  );
}

async function completeActivation(
  hook: Hook,
  context: RunContext,
  toolCallId: string,
  isError = false,
) {
  const addTools = vi.fn();
  const addInstructions = vi.fn();
  await hook.afterToolCall?.({
    context,
    iteration: 1,
    toolCall: { id: toolCallId, name: 'activate_skill', input: {} },
    result: isError ? 'activation failed' : 'activation succeeded',
    isError,
    outcome: isError ? 'error' : 'success',
    isLastToolCall: true,
    transformMessages: vi.fn(),
    addTools,
    removeTools: vi.fn(),
    setTools: vi.fn(),
    addInstructions,
    setInstructions: vi.fn(),
    abort: vi.fn(),
    emit: vi.fn(),
  });
  return { addTools, addInstructions };
}

describe('skillsExtension', () => {
  it('contributes no activation manifest when the source has no skills', async () => {
    const skillSource = source({ list: vi.fn(async () => []) });

    const instance = await skillsExtension({ source: skillSource });

    expect(skillSource.list).toHaveBeenCalledOnce();
    expect(instance).toEqual({ name: 'skills' });
  });

  it('lists once and exposes deterministic escaped summaries with an exact activation enum', async () => {
    const skillSource = source();
    const { instance, activationTool } = await initialize(skillSource);

    expect(skillSource.list).toHaveBeenCalledTimes(1);
    expect(instance.instructions).toContain(
      '<name>access_review</name>\n    <description>Review access &amp; permissions</description>',
    );
    expect(instance.instructions).toContain(
      '<name>incident_response</name>\n    <description>Triage &lt;urgent&gt; incidents</description>',
    );
    expect(instance.instructions?.indexOf('access_review')).toBeLessThan(
      instance.instructions?.indexOf('incident_response') ?? 0,
    );
    expect(activationTool.parameters).toEqual({
      type: 'object',
      properties: {
        name: {
          type: 'string',
          enum: ['access_review', 'incident_response'],
          description: 'The name of the skill to activate.',
        },
      },
      required: ['name'],
      additionalProperties: false,
    });
  });

  it.each([{}, { name: 42 }, { name: 'unknown_skill' }])(
    'validates activation input before execution: %j',
    async (input) => {
      const skillSource = source();
      const { activationTool } = await initialize(skillSource);

      expect(() => activationTool.validateInput?.(input)).toThrow(
        /valid skill name|Unknown skill/,
      );
      expect(skillSource.load).not.toHaveBeenCalled();
    },
  );

  it('returns source load failures as model-actionable tool errors', async () => {
    const skillSource = source({
      load: vi.fn(async () => {
        throw new Error('definition disappeared');
      }),
    });
    const { activationTool, hook } = await initialize(skillSource);
    const context = RunContext.create();
    await startRun(hook, context, [activationTool]);

    await expect(
      executeActivation(activationTool, context, 'access_review'),
    ).resolves.toEqual({
      result:
        'Could not activate skill "access_review": definition disappeared',
      isError: true,
    });
  });

  it('returns invalid loaded definitions as model-actionable tool errors', async () => {
    const skillSource = source({
      load: vi.fn(async () => ({
        ...definitions.access_review,
        name: 'different_skill',
      })),
    });
    const { activationTool, hook } = await initialize(skillSource);
    const context = RunContext.create();
    await startRun(hook, context, [activationTool]);

    const result = await executeActivation(
      activationTool,
      context,
      'access_review',
    );

    expect(result).toMatchObject({ isError: true });
    expect((result as { result: string }).result).toContain(
      'loaded definition name does not match',
    );
  });

  it('injects a successfully loaded skill after its tool call for the next iteration', async () => {
    const { activationTool, hook } = await initialize();
    const context = RunContext.create();
    await startRun(hook, context, [activationTool]);
    const toolCallId = 'activate-access';

    await expect(
      executeActivation(activationTool, context, 'access_review', toolCallId),
    ).resolves.toEqual({
      result: 'Activated skill "access_review".',
      isError: false,
    });
    const injection = await completeActivation(hook, context, toolCallId);

    expect(injection.addInstructions).toHaveBeenCalledWith(
      'Follow the access review checklist.',
    );
    expect(injection.addTools).toHaveBeenCalledWith(
      definitions.access_review.tools?.[0],
    );
  });

  it('never injects capabilities after a failed activation tool call', async () => {
    const { activationTool, hook } = await initialize();
    const context = RunContext.create();
    await startRun(hook, context, [activationTool]);
    const toolCallId = 'activate-access';
    await executeActivation(
      activationTool,
      context,
      'access_review',
      toolCallId,
    );

    const injection = await completeActivation(hook, context, toolCallId, true);

    expect(injection.addInstructions).not.toHaveBeenCalled();
    expect(injection.addTools).not.toHaveBeenCalled();
  });

  it.each([
    ['a host tool', [tool('list_access')], 'list_access'],
    ['the activation tool', [], 'activate_skill'],
  ])('rejects activated tools that replace %s', async (_, hostTools, name) => {
    const skillSource = source({
      load: vi.fn(async () => ({
        ...definitions.access_review,
        tools: [tool(name)],
      })),
    });
    const { activationTool, hook } = await initialize(skillSource);
    const context = RunContext.create();
    await startRun(hook, context, [activationTool, ...hostTools]);

    const result = await executeActivation(
      activationTool,
      context,
      'access_review',
      'activate-access',
      [activationTool.name, ...hostTools.map(({ name }) => name)],
    );

    expect(result).toMatchObject({ isError: true });
    expect((result as { result: string }).result).toContain(
      `tool name conflicts: ${name}`,
    );
  });

  it('allows skill tools after a host removes the conflicting tool', async () => {
    const hostTool = tool('list_access');
    const { activationTool, hook } = await initialize();
    const context = RunContext.create();
    await startRun(hook, context, [activationTool, hostTool]);

    const result = await executeActivation(
      activationTool,
      context,
      'access_review',
      'activate-access',
      [activationTool.name],
    );

    expect(result).toEqual({
      result: 'Activated skill "access_review".',
      isError: false,
    });
  });

  it('rejects skill tools that replace tools added by host runStart hooks', async () => {
    const hostTool = tool('shared_tool');
    const skillSource = source({
      load: vi.fn(async () => ({
        ...definitions.access_review,
        tools: [tool('shared_tool')],
      })),
    });
    const instance = await skillsExtension({ source: skillSource });
    const model = new MockProvider([
      toolCallTurn({
        id: 'activate-access',
        name: 'activate_skill',
        input: { name: 'access_review' },
      }),
      textTurn('Activation handled.'),
    ]);
    const dynamicHostHook: Hook = {
      name: 'dynamic-host-tools',
      runStart: ({ addTools }) => addTools(hostTool),
    };
    const results: Array<{ result: string; isError: boolean }> = [];

    for await (const event of run({
      instructions: 'Use the available skills.',
      model,
      messages: [{ role: 'user', content: [{ type: 'text', text: 'go' }] }],
      tools: [...(instance.tools ?? [])],
      hooks: [dynamicHostHook, ...(instance.hooks ?? [])],
    })) {
      if (event.type === 'tool_result') {
        results.push({ result: event.result, isError: event.isError });
      }
    }

    expect(results[0]).toEqual({
      result:
        'Could not activate skill "access_review": tool name conflicts: shared_tool',
      isError: true,
    });
  });

  it('passes the run abort signal to the skill source', async () => {
    let receivedSignal: AbortSignal | undefined;
    const skillSource = source({
      load: vi.fn(
        async (_name: string, options?: { readonly signal?: AbortSignal }) => {
          receivedSignal = options?.signal;
          return definitions.access_review;
        },
      ),
    });
    const { activationTool, hook } = await initialize(skillSource);
    const context = RunContext.create();
    const controller = new AbortController();
    await startRun(hook, context, [activationTool]);

    await executeActivation(
      activationTool,
      context,
      'access_review',
      'activate-access',
      [activationTool.name],
      controller.signal,
    );

    expect(receivedSignal).toBe(controller.signal);
  });

  it('does not load a skill when the run is already aborted', async () => {
    const skillSource = source();
    const { activationTool, hook } = await initialize(skillSource);
    const context = RunContext.create();
    const controller = new AbortController();
    controller.abort();
    await startRun(hook, context, [activationTool]);

    const result = await executeActivation(
      activationTool,
      context,
      'access_review',
      'activate-access',
      [activationTool.name],
      controller.signal,
    );

    expect(result).toMatchObject({ isError: true });
    expect(skillSource.load).not.toHaveBeenCalled();
  });

  it('rejects tools from a later skill that replace an activated tool', async () => {
    const skillSource = source({
      load: vi.fn(async (name) => ({
        ...definitions[name],
        tools: [tool('shared_tool')],
      })),
    });
    const { activationTool, hook } = await initialize(skillSource);
    const context = RunContext.create();
    await startRun(hook, context, [activationTool]);
    await executeActivation(activationTool, context, 'access_review', 'first');
    await completeActivation(hook, context, 'first');

    const result = await executeActivation(
      activationTool,
      context,
      'incident_response',
      'second',
    );

    expect(result).toMatchObject({ isError: true });
    expect((result as { result: string }).result).toContain(
      'tool name conflicts: shared_tool',
    );
  });

  it('makes duplicate activation idempotent', async () => {
    const skillSource = source();
    const { activationTool, hook } = await initialize(skillSource);
    const context = RunContext.create();
    await startRun(hook, context, [activationTool]);
    await executeActivation(activationTool, context, 'access_review', 'first');
    await completeActivation(hook, context, 'first');

    await expect(
      executeActivation(activationTool, context, 'access_review', 'second'),
    ).resolves.toEqual({
      result: 'Skill "access_review" is already active.',
      isError: false,
    });
    const injection = await completeActivation(hook, context, 'second');

    expect(skillSource.load).toHaveBeenCalledTimes(1);
    expect(injection.addInstructions).not.toHaveBeenCalled();
    expect(injection.addTools).not.toHaveBeenCalled();
  });

  it('isolates pending and activated state across concurrent root and child runs', async () => {
    const { activationTool, hook } = await initialize();
    const root = RunContext.create();
    const child = root.deriveChild();
    await Promise.all([
      startRun(hook, root, [activationTool]),
      startRun(hook, child, [activationTool]),
    ]);

    await executeActivation(
      activationTool,
      root,
      'access_review',
      'root-activation',
    );
    const childBeforeActivation = await completeActivation(
      hook,
      child,
      'root-activation',
    );
    await executeActivation(
      activationTool,
      child,
      'access_review',
      'child-activation',
    );
    const childActivation = await completeActivation(
      hook,
      child,
      'child-activation',
    );

    expect(childBeforeActivation.addTools).not.toHaveBeenCalled();
    expect(childActivation.addTools).toHaveBeenCalledOnce();
  });
});
