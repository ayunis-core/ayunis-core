import { describe, expect, it } from 'vitest';

import { RunContext } from '../context/run-context';
import { AgentRuntimeError } from '../contracts/errors';
import type { Hook } from '../contracts/hook';
import type { ModelProvider } from '../contracts/provider';
import { EmitBuffer } from './event-queue';
import { HookRunner } from './hook-runner';
import { PendingMutations } from './mutations';
import { AbortState } from './run-state';
import {
  MockProvider,
  textTurn,
  toolCallTurn,
} from '../providers/mock/mock-provider';
import { baseInput, collectEvents, echoTool, eventTypes } from './test-helpers';

describe('hook lifecycle', () => {
  it('fires the standard phases in order across a tool-call run', async () => {
    const phases: string[] = [];
    const recorder: Hook = {
      name: 'recorder',
      runStart: () => {
        phases.push('runStart');
      },
      beforeModelCall: (ctx) => {
        phases.push(`beforeModelCall:${ctx.iteration}`);
      },
      afterModelCall: (ctx) => {
        phases.push(`afterModelCall:${ctx.iteration}`);
      },
      beforeToolCall: () => {
        phases.push('beforeToolCall');
      },
      afterToolCall: () => {
        phases.push('afterToolCall');
      },
      runEnd: (ctx) => {
        phases.push(`runEnd:${ctx.status}`);
      },
    };
    const model = new MockProvider([
      toolCallTurn({ id: 'c1', name: 'echo', input: { value: 'x' } }),
      textTurn('Done'),
    ]);
    await collectEvents(
      baseInput(model, { tools: [echoTool()], hooks: [recorder] }),
    );

    expect(phases).toEqual([
      'runStart',
      'beforeModelCall:0',
      'afterModelCall:0',
      'beforeToolCall',
      'afterToolCall',
      'beforeModelCall:1',
      'afterModelCall:1',
      'runEnd:completed',
    ]);
  });

  it('completes afterModelCall before exposing the authoritative assistant message', async () => {
    const phases: string[] = [];
    const persistence: Hook = {
      name: 'persistence',
      afterModelCall: async () => {
        await Promise.resolve();
        phases.push('afterModelCall');
      },
    };
    const model = new MockProvider([textTurn('Final answer')]);
    const { run } = await import('./run');

    for await (const event of run(baseInput(model, { hooks: [persistence] }))) {
      if (event.type === 'assistant_message') {
        phases.push('assistant_message');
        break;
      }
    }

    expect(phases).toEqual(['afterModelCall', 'assistant_message']);
  });

  it('fires multiple hooks in registration order within a phase', async () => {
    const order: string[] = [];
    const hook = (name: string): Hook => ({
      name,
      beforeModelCall: () => {
        order.push(name);
      },
    });
    const model = new MockProvider([textTurn('Hi')]);
    await collectEvents(
      baseInput(model, { hooks: [hook('first'), hook('second')] }),
    );

    expect(order).toEqual(['first', 'second']);
  });

  it('awaits async hooks before proceeding', async () => {
    const order: string[] = [];
    const slow: Hook = {
      name: 'slow',
      runStart: async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        order.push('slow-done');
      },
    };
    const after: Hook = {
      name: 'after',
      runStart: () => {
        order.push('after');
      },
    };
    const model = new MockProvider([textTurn('Hi')]);
    await collectEvents(baseInput(model, { hooks: [slow, after] }));

    expect(order).toEqual(['slow-done', 'after']);
  });

  it('ends the run with status aborted when a runStart hook aborts', async () => {
    const guard: Hook = {
      name: 'guard',
      runStart: (ctx) => ctx.abort('quota exhausted'),
    };
    const model = new MockProvider([textTurn('never')]);
    const events = await collectEvents(baseInput(model, { hooks: [guard] }));

    expect(events.at(-1)).toMatchObject({
      type: 'run_end',
      status: 'aborted',
    });
    expect(model.requests).toHaveLength(0);
  });

  it('fails the run with hook attribution when a hook throws', async () => {
    const broken: Hook = {
      name: 'broken',
      beforeModelCall: () => {
        throw new Error('hook exploded');
      },
    };
    const model = new MockProvider([textTurn('never')]);
    const events = await collectEvents(baseInput(model, { hooks: [broken] }));

    const error = events.find((e) => e.type === 'error');
    expect(error).toMatchObject({
      code: 'HOOK_FAILED',
      message: "Hook 'broken' failed in beforeModelCall: hook exploded",
      details: { hookName: 'broken', phase: 'beforeModelCall' },
    });
    expect(events.at(-1)).toMatchObject({ type: 'run_end', status: 'error' });
  });

  it('preserves an intentional runtime error thrown by a hook', async () => {
    const guard: Hook = {
      name: 'context-budget',
      beforeModelCall: () => {
        throw new AgentRuntimeError(
          'CONTEXT_BUDGET_EXCEEDED',
          'The latest turn exceeds the context budget',
        );
      },
    };
    const model = new MockProvider([textTurn('never')]);

    const events = await collectEvents(baseInput(model, { hooks: [guard] }));

    expect(events.find((event) => event.type === 'error')).toMatchObject({
      code: 'CONTEXT_BUDGET_EXCEEDED',
    });
    expect(model.requests).toHaveLength(0);
  });

  it('streams hook emits as custom events in order', async () => {
    const emitter: Hook = {
      name: 'emitter',
      beforeModelCall: (ctx) => ctx.emit({ name: 'masks', data: { count: 2 } }),
    };
    const model = new MockProvider([textTurn('Hi')]);
    const events = await collectEvents(baseInput(model, { hooks: [emitter] }));

    const types = eventTypes(events);
    expect(types.indexOf('custom')).toBeLessThan(
      types.indexOf('assistant_message'),
    );
    const custom = events.find((e) => e.type === 'custom');
    expect(custom).toMatchObject({ name: 'masks', data: { count: 2 } });
  });

  it('lets tools emit custom events through their execution context', async () => {
    const emittingTool = echoTool({
      execute: (input, ctx) => {
        ctx.emit({ name: 'progress', data: 'halfway' });
        return `echo: ${String(input.value)}`;
      },
    });
    const model = new MockProvider([
      toolCallTurn({ id: 'c1', name: 'echo', input: { value: 'x' } }),
      textTurn('Done'),
    ]);
    const events = await collectEvents(
      baseInput(model, { tools: [emittingTool] }),
    );

    const custom = events.find((e) => e.type === 'custom');
    expect(custom).toMatchObject({ name: 'progress', data: 'halfway' });
  });

  it('rewrites a tool call in beforeToolCall before execution', async () => {
    const rewriter: Hook = {
      name: 'rewriter',
      beforeToolCall: (ctx) =>
        ctx.rewriteToolCall({ input: { value: 'rewritten' } }),
    };
    const model = new MockProvider([
      toolCallTurn({ id: 'c1', name: 'echo', input: { value: 'original' } }),
      textTurn('Done'),
    ]);
    const events = await collectEvents(
      baseInput(model, { tools: [echoTool()], hooks: [rewriter] }),
    );

    const toolResult = events.find((e) => e.type === 'tool_result');
    expect(toolResult).toMatchObject({ result: 'echo: rewritten' });
  });

  it('resolves ctx.tool from the rewritten name for subsequent hooks', async () => {
    const seenToolNames: (string | undefined)[] = [];
    const renamer: Hook = {
      name: 'renamer',
      beforeToolCall: (ctx) => ctx.rewriteToolCall({ name: 'echo-internal' }),
    };
    const inspector: Hook = {
      name: 'inspector',
      beforeToolCall: (ctx) => {
        seenToolNames.push(ctx.tool?.name);
      },
    };
    const internalTool = echoTool({
      name: 'echo-internal',
      execute: (input) => `internal: ${String(input.value)}`,
    });
    const model = new MockProvider([
      toolCallTurn({ id: 'c1', name: 'echo', input: { value: 'x' } }),
      textTurn('Done'),
    ]);
    const events = await collectEvents(
      baseInput(model, {
        tools: [echoTool(), internalTool],
        hooks: [renamer, inspector],
      }),
    );

    expect(seenToolNames).toEqual(['echo-internal']);
    const toolResult = events.find((e) => e.type === 'tool_result');
    expect(toolResult).toMatchObject({ result: 'internal: x' });
  });

  it('passes the run context to hooks for per-run state', async () => {
    const seen: unknown[] = [];
    const statefulHook: Hook = {
      name: 'stateful',
      runStart: (ctx) => ctx.context.set('marker', 'set-at-start'),
      runEnd: (ctx) => {
        seen.push(ctx.context.get('marker'));
      },
    };
    const model = new MockProvider([textTurn('Hi')]);
    await collectEvents(baseInput(model, { hooks: [statefulHook] }));

    expect(seen).toEqual(['set-at-start']);
  });

  it('notifies runEnd hooks when the consumer abandons the stream', async () => {
    const statuses: string[] = [];
    const observer: Hook = {
      name: 'observer',
      runEnd: (ctx) => {
        statuses.push(ctx.status);
      },
    };
    const model = new MockProvider([textTurn('Hello there')]);
    const { run } = await import('./run');
    for await (const event of run(baseInput(model, { hooks: [observer] }))) {
      if (event.type === 'text_delta') {
        break;
      }
    }

    expect(statuses).toEqual(['aborted']);
  });

  it('exposes partial text and thinking when a model call fails', async () => {
    const interruptions: unknown[] = [];
    const observer: Hook = {
      name: 'observer',
      afterModelCall: (ctx) => {
        if (ctx.outcome.type !== 'provider_failure') return;
        interruptions.push({
          iteration: ctx.iteration,
          message: ctx.outcome.message,
          reason: 'error',
        });
      },
    };
    const model: ModelProvider = {
      name: 'failing',
      async *stream() {
        yield {
          thinkingDelta: 'Working',
          textDelta: 'Partial answer',
          toolCallDeltas: [
            {
              index: 0,
              id: 'call-1',
              name: 'echo',
              argumentsDelta: '{"value":',
            },
          ],
        };
        throw new Error('provider disconnected');
      },
    };

    const events = await collectEvents(baseInput(model, { hooks: [observer] }));

    expect(interruptions).toEqual([
      {
        iteration: 0,
        reason: 'error',
        message: {
          role: 'assistant',
          content: [
            {
              type: 'thinking',
              thinking: 'Working',
              id: null,
              signature: null,
            },
            { type: 'text', text: 'Partial answer' },
          ],
        },
      },
    ]);
    expect(events.find((event) => event.type === 'error')).toMatchObject({
      code: 'PROVIDER_FAILED',
    });
  });

  it('surfaces a critical call-hook failure with the provider failure retained', async () => {
    const brokenPersistence: Hook = {
      name: 'persistence',
      afterModelCall: () => {
        throw new Error('database unavailable');
      },
    };
    const model: ModelProvider = {
      name: 'classified-failure',
      async *stream() {
        yield { textDelta: 'Partial answer' };
        throw new AgentRuntimeError(
          'PROVIDER_UNAVAILABLE_TIMEOUT_ANTHROPIC',
          'Provider anthropic request timed out',
        );
      },
    };

    const events = await collectEvents(
      baseInput(model, { hooks: [brokenPersistence] }),
    );

    expect(events.find((event) => event.type === 'error')).toMatchObject({
      code: 'HOOK_FAILED',
      details: {
        hookName: 'persistence',
        phase: 'afterModelCall',
        underlyingError: {
          code: 'PROVIDER_UNAVAILABLE_TIMEOUT_ANTHROPIC',
        },
      },
    });
  });

  it('preserves an aborted outcome when a best-effort terminal hook fails', async () => {
    const controller = new AbortController();
    const brokenPersistence: Hook = {
      name: 'persistence',
      afterModelCallFailureMode: 'best_effort',
      afterModelCall: () => {
        throw new Error('database unavailable');
      },
    };
    const model: ModelProvider = {
      name: 'cancelled',
      async *stream() {
        yield { textDelta: 'Partial answer' };
        controller.abort();
        throw new DOMException('The operation was aborted', 'AbortError');
      },
    };

    const events = await collectEvents(
      baseInput(model, {
        hooks: [brokenPersistence],
        signal: controller.signal,
      }),
    );

    expect(events.find((event) => event.type === 'error')).toBeUndefined();
    expect(events.at(-1)).toMatchObject({ type: 'run_end', status: 'aborted' });
  });

  it('exposes partial content before runEnd when the consumer disconnects', async () => {
    const phases: string[] = [];
    const observer: Hook = {
      name: 'observer',
      afterModelCall: (ctx) => {
        phases.push(
          `call:${ctx.outcome.type}:${ctx.outcome.message.content.length}`,
        );
      },
      runEnd: (ctx) => {
        phases.push(`runEnd:${ctx.status}`);
      },
    };
    const model = new MockProvider([textTurn('Hello there')]);
    const { run } = await import('./run');

    for await (const event of run(baseInput(model, { hooks: [observer] }))) {
      if (event.type === 'text_delta') {
        break;
      }
    }

    expect(phases).toEqual(['call:consumer_abandoned:1', 'runEnd:aborted']);
  });

  it('reports critical runEnd failures without replacing the original outcome', async () => {
    const broken: Hook = {
      name: 'critical-persistence',
      runEnd: () => {
        throw new Error('database unavailable');
      },
    };
    const events = await collectEvents(
      baseInput(new MockProvider([textTurn('Done')]), { hooks: [broken] }),
    );

    expect(
      events.find((event) => event.type === 'finalization_error'),
    ).toMatchObject({
      hookName: 'critical-persistence',
      message:
        "Hook 'critical-persistence' failed in runEnd: database unavailable",
      critical: true,
      outcome: 'completed',
    });
    expect(events.at(-1)).toMatchObject({
      type: 'run_end',
      status: 'completed',
    });
  });

  it('preserves max-iterations while reporting a critical finalization failure', async () => {
    const broken: Hook = {
      name: 'critical-persistence',
      runEnd: () => {
        throw new Error('final tool result was not saved');
      },
    };
    const model = new MockProvider([
      toolCallTurn({ id: 'call-1', name: 'echo', input: { value: 'x' } }),
    ]);
    const events = await collectEvents(
      baseInput(model, {
        hooks: [broken],
        tools: [echoTool()],
        maxIterations: 1,
      }),
    );

    expect(events.find((event) => event.type === 'error')).toMatchObject({
      code: 'MAX_ITERATIONS_REACHED',
    });
    expect(
      events.find((event) => event.type === 'finalization_error'),
    ).toMatchObject({
      hookName: 'critical-persistence',
      critical: true,
      outcome: 'max_iterations',
    });
    expect(events.at(-1)).toMatchObject({
      type: 'run_end',
      status: 'max_iterations',
    });
  });

  it('allows non-critical runEnd hooks to opt into best-effort finalization', async () => {
    const phases: string[] = [];
    const bestEffort: Hook = {
      name: 'telemetry',
      runEndFailureMode: 'best_effort',
      runEnd: () => {
        phases.push('telemetry');
        throw new Error('collector unavailable');
      },
    };
    const later: Hook = {
      name: 'later',
      runEnd: () => {
        phases.push('later');
      },
    };
    const events = await collectEvents(
      baseInput(new MockProvider([textTurn('Done')]), {
        hooks: [bestEffort, later],
      }),
    );

    expect(phases).toEqual(['telemetry', 'later']);
    expect(
      events.find((event) => event.type === 'finalization_error'),
    ).toMatchObject({
      hookName: 'telemetry',
      critical: false,
      outcome: 'completed',
    });
    expect(events.at(-1)).toMatchObject({
      type: 'run_end',
      status: 'completed',
    });
  });

  it('rejects consumer abandonment when critical finalization fails', async () => {
    const broken: Hook = {
      name: 'critical-persistence',
      runEnd: () => {
        throw new Error('database unavailable');
      },
    };
    const consumeUntilFirstDelta = async (): Promise<void> => {
      const model = new MockProvider([textTurn('Hello there')]);
      const { run } = await import('./run');
      for await (const event of run(baseInput(model, { hooks: [broken] }))) {
        if (event.type === 'text_delta') break;
      }
    };

    await expect(consumeUntilFirstDelta()).rejects.toMatchObject({
      code: 'HOOK_FAILED',
      details: { hookName: 'critical-persistence', phase: 'runEnd' },
    });
  });

  it('exposes only effective controls to call and run terminal hooks', async () => {
    const apiShapes: Array<{ phase: string; keys: string[] }> = [];
    const hook: Hook = {
      name: 'terminal-controls',
      afterModelCall: (ctx) => {
        ctx.context.set('call-finished', true);
        ctx.emit({ name: 'call_observed', data: null });
        apiShapes.push({ phase: 'afterModelCall', keys: Object.keys(ctx) });
      },
      runEnd: (ctx) => {
        expect(ctx.context.get('call-finished')).toBe(true);
        ctx.emit({ name: 'run_observed', data: null });
        apiShapes.push({ phase: 'runEnd', keys: Object.keys(ctx) });
      },
    };

    const events = await collectEvents(
      baseInput(new MockProvider([textTurn('Done')]), { hooks: [hook] }),
    );

    const mutationKeys = [
      'transformMessages',
      'addTools',
      'removeTools',
      'setTools',
      'addInstructions',
      'setInstructions',
    ];
    for (const shape of apiShapes) {
      expect(shape.keys, shape.phase).toEqual(
        expect.arrayContaining(['context', 'abort', 'emit']),
      );
      expect(
        shape.keys.filter((key) => mutationKeys.includes(key)),
        shape.phase,
      ).toEqual([]);
    }
    expect(
      events
        .filter((event) => event.type === 'custom')
        .map((event) => event.name),
    ).toEqual(['call_observed', 'run_observed']);
  });

  it('retains the original outcome when a critical afterModelTurn hook fails', async () => {
    const brokenPersistence: Hook = {
      name: 'persistence',
      afterModelTurn: () => {
        throw new Error('database unavailable');
      },
    };

    const events = await collectEvents(
      baseInput(new MockProvider([textTurn('Done')]), {
        hooks: [brokenPersistence],
      }),
    );

    expect(events.find((event) => event.type === 'error')).toMatchObject({
      code: 'HOOK_FAILED',
      details: {
        hookName: 'persistence',
        phase: 'afterModelTurn',
        originalOutcome: 'accepted',
      },
    });
  });

  it('isolates and freezes afterModelTurn messages without disabling its mutations', async () => {
    const mutationErrors: string[] = [];
    const observedTexts: string[] = [];
    const mutator: Hook = {
      name: 'turn-mutator',
      afterModelTurn: (ctx) => {
        if (ctx.turn !== 1) return;
        ctx.addInstructions('Persisted turn instruction.');
        const content = ctx.messages[0]?.content[0];
        if (content?.type !== 'text') return;
        try {
          (content as { text: string }).text = 'Tampered';
        } catch (error) {
          mutationErrors.push(error instanceof Error ? error.name : 'error');
        }
      },
    };
    const observer: Hook = {
      name: 'turn-observer',
      afterModelTurn: (ctx) => {
        if (ctx.turn !== 1) return;
        const content = ctx.messages[0]?.content[0];
        if (content?.type === 'text') observedTexts.push(content.text);
      },
    };
    const model = new MockProvider([
      toolCallTurn({ id: 'call-1', name: 'echo', input: { value: 'x' } }),
      textTurn('Done'),
    ]);

    await collectEvents(
      baseInput(model, {
        messages: [
          {
            role: 'user',
            content: [{ type: 'text', text: 'Original request' }],
          },
        ],
        tools: [echoTool()],
        hooks: [mutator, observer],
      }),
    );

    expect(mutationErrors).toEqual(['TypeError']);
    expect(observedTexts).toEqual(['Original request']);
    expect(model.requests[1].messages[0]?.content[0]).toMatchObject({
      type: 'text',
      text: 'Original request',
    });
    expect(model.requests[1].instructions).toContain(
      'Persisted turn instruction.',
    );
  });

  it('gives every runEnd hook the same isolated frozen message snapshot', async () => {
    const mutationErrors: string[] = [];
    const observedTexts: string[] = [];
    const mutator: Hook = {
      name: 'run-end-mutator',
      runEnd: (ctx) => {
        const content = ctx.messages[0]?.content[0];
        if (content?.type !== 'text') return;
        try {
          (content as { text: string }).text = 'Tampered';
        } catch (error) {
          mutationErrors.push(error instanceof Error ? error.name : 'error');
        }
      },
    };
    const observer: Hook = {
      name: 'run-end-observer',
      runEnd: (ctx) => {
        const content = ctx.messages[0]?.content[0];
        if (content?.type === 'text') observedTexts.push(content.text);
      },
    };

    await collectEvents(
      baseInput(new MockProvider([textTurn('Done')]), {
        messages: [
          {
            role: 'user',
            content: [{ type: 'text', text: 'Original request' }],
          },
        ],
        hooks: [mutator, observer],
      }),
    );

    expect(mutationErrors).toEqual(['TypeError']);
    expect(observedTexts).toEqual(['Original request']);
  });

  it('does not build beforeModelCall snapshots for hooks without that callback', async () => {
    let schemaReads = 0;
    const parameters: Record<string, unknown> = { type: 'object' };
    Object.defineProperty(parameters, 'properties', {
      enumerable: true,
      get: () => {
        schemaReads += 1;
        return {};
      },
    });
    const model = new MockProvider([textTurn('Done')]);
    const hooks: Hook[] = [
      { name: 'run-start-only', runStart: () => undefined },
      { name: 'run-end-only', runEnd: () => undefined },
      { name: 'active', beforeModelCall: () => undefined },
      { name: 'tool-only', afterToolCall: () => undefined },
    ];
    const runner = new HookRunner({
      hooks,
      context: RunContext.create(),
      mutations: new PendingMutations(),
      emits: new EmitBuffer(),
      abortState: new AbortState(),
    });

    await runner.beforeModelCall({
      iteration: 0,
      identity: {
        modelCallId: crypto.randomUUID(),
        runId: crypto.randomUUID(),
        turn: 1,
        callSequence: 1,
        trigger: 'initial',
        model,
      },
      config: {
        instructions: 'Be helpful.',
        messages: [
          {
            role: 'user',
            content: [{ type: 'text', text: 'Hello' }],
          },
        ],
        tools: [echoTool({ parameters })],
      },
      mode: 'normal',
      signal: new AbortController().signal,
    });

    expect(schemaReads).toBe(2);
  });
});
