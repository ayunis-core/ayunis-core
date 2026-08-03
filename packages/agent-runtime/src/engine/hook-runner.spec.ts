import { describe, expect, it } from 'vitest';

import { AgentRuntimeError } from '../contracts/errors';
import type { Hook } from '../contracts/hook';
import type { ModelProvider } from '../contracts/provider';
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
      modelCallInterrupted: (ctx) => {
        interruptions.push({
          iteration: ctx.iteration,
          message: ctx.message,
          reason: ctx.reason,
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

  it('preserves a provider failure when an interruption hook also fails', async () => {
    const brokenPersistence: Hook = {
      name: 'persistence',
      modelCallInterrupted: () => {
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
      code: 'PROVIDER_UNAVAILABLE_TIMEOUT_ANTHROPIC',
    });
  });

  it('preserves an aborted outcome when an interruption hook fails', async () => {
    const controller = new AbortController();
    const brokenPersistence: Hook = {
      name: 'persistence',
      modelCallInterrupted: () => {
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
      modelCallInterrupted: (ctx) => {
        phases.push(`interrupted:${ctx.reason}:${ctx.message.content.length}`);
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

    expect(phases).toEqual([
      'interrupted:consumer_abandoned:1',
      'runEnd:aborted',
    ]);
  });
});
