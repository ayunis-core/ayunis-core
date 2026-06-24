import { describe, expect, it } from 'vitest';

import type { Hook } from '../contracts/hook';
import {
  MockProvider,
  textTurn,
  toolCallTurn,
} from '../providers/mock/mock-provider';
import { baseInput, collectEvents, echoTool, eventTypes } from './test-helpers';

describe('hook lifecycle', () => {
  it('fires all six phases in order across a tool-call run', async () => {
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
});
