import { describe, expect, it } from 'vitest';

import { AgentRuntimeError } from '../contracts/errors';
import type { RunEvent } from '../contracts/event';
import type { Hook } from '../contracts/hook';
import type { ToolResultContent } from '../contracts/message';
import type { ProviderChunk } from '../contracts/provider';
import type { Tool, ToolExecutionContext } from '../contracts/tool';
import { MockProvider, textTurn } from '../providers/mock/mock-provider';
import { run } from './run';
import { baseInput, collectEvents } from './test-helpers';
import { MAX_CONCURRENT_TOOL_CALLS } from './tool-executor';

interface Call {
  id: string;
  name: string;
  input?: Record<string, unknown>;
}

const multiCallTurn = (calls: readonly Call[]): ProviderChunk[] => [
  {
    toolCallDeltas: calls.map((call, index) => ({
      index,
      id: call.id,
      name: call.name,
      argumentsDelta: JSON.stringify(call.input ?? {}),
    })),
  },
  { finishReason: 'tool_calls' },
];

const searchCalls = (count: number): Call[] =>
  Array.from({ length: count }, (_, index) => ({
    id: `c${index + 1}`,
    name: 'search',
    input: { query: `q${index + 1}` },
  }));

const delay = (ms: number, signal?: AbortSignal): Promise<void> =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(timer);
        reject(new DOMException('The operation was aborted', 'AbortError'));
      },
      { once: true },
    );
  });

/** Records which calls are active at the same time. */
class ExecutionLog {
  active = 0;
  maxActive = 0;
  readonly started: string[] = [];
  readonly finished: string[] = [];
  readonly timeline: string[] = [];

  async track<T>(id: string, work: () => Promise<T>): Promise<T> {
    this.active++;
    this.maxActive = Math.max(this.maxActive, this.active);
    this.started.push(id);
    this.timeline.push(`start:${id}`);
    try {
      return await work();
    } finally {
      this.active--;
      this.finished.push(id);
      this.timeline.push(`end:${id}`);
    }
  }
}

const delayedTool = (
  log: ExecutionLog,
  delayFor: (query: string) => number,
  overrides: Partial<Tool> = {},
): Tool => ({
  name: 'search',
  description: 'Searches the web',
  parameters: { type: 'object', properties: { query: { type: 'string' } } },
  execute: (input, ctx: ToolExecutionContext) =>
    log.track(ctx.toolCallId, async () => {
      const query = String(input.query);
      await delay(delayFor(query), ctx.signal);
      return `results for ${query}`;
    }),
  ...overrides,
});

const toolResults = (events: readonly RunEvent[]) =>
  events.flatMap((event) => (event.type === 'tool_result' ? [event] : []));

const toolResultMessage = (
  events: readonly RunEvent[],
): ToolResultContent[] => {
  const event = events.find((e) => e.type === 'tool_result_message');
  if (event?.type !== 'tool_result_message') {
    throw new Error('Expected a tool_result_message event');
  }
  return event.message.content.flatMap((content) =>
    content.type === 'tool_result' ? [content] : [],
  );
};

const sorted = (values: readonly string[]): string[] =>
  values.toSorted((a, b) => a.localeCompare(b));

describe('concurrent tool calls', () => {
  it('finishes a turn of independent calls in about the time of the slowest call', async () => {
    const log = new ExecutionLog();
    const model = new MockProvider([
      multiCallTurn(searchCalls(4)),
      textTurn('done'),
    ]);

    const startedAt = Date.now();
    const events = await collectEvents(
      baseInput(model, { tools: [delayedTool(log, () => 150)] }),
    );
    const elapsed = Date.now() - startedAt;

    expect(log.maxActive).toBe(4);
    expect(elapsed).toBeLessThan(400);
    expect(toolResults(events)).toHaveLength(4);
    expect(events.at(-1)).toMatchObject({
      type: 'run_end',
      status: 'completed',
    });
  });

  it('keeps results, emits and afterToolCall hooks in call order when later calls finish first', async () => {
    const log = new ExecutionLog();
    const delays: Record<string, number> = { q1: 90, q2: 60, q3: 30, q4: 0 };
    const tool = delayedTool(log, (query) => delays[query] ?? 0);
    const execute = tool.execute!;
    tool.execute = async (input, ctx) => {
      const result = await execute(input, ctx);
      ctx.emit({ name: 'masks', data: ctx.toolCallId });
      return result;
    };
    const afterToolCalls: { id: string; isLastToolCall: boolean }[] = [];
    const observer: Hook = {
      name: 'observer',
      afterToolCall: (ctx) => {
        afterToolCalls.push({
          id: ctx.toolCall.id,
          isLastToolCall: ctx.isLastToolCall,
        });
      },
    };
    const model = new MockProvider([
      multiCallTurn(searchCalls(4)),
      textTurn('done'),
    ]);

    const events = await collectEvents(
      baseInput(model, { tools: [tool], hooks: [observer] }),
    );

    expect(log.finished).toEqual(['c4', 'c3', 'c2', 'c1']);
    const ids = ['c1', 'c2', 'c3', 'c4'];
    expect(toolResults(events).map((e) => e.toolCallId)).toEqual(ids);
    expect(toolResultMessage(events).map((c) => c.toolCallId)).toEqual(ids);
    expect(afterToolCalls).toEqual([
      { id: 'c1', isLastToolCall: false },
      { id: 'c2', isLastToolCall: false },
      { id: 'c3', isLastToolCall: false },
      { id: 'c4', isLastToolCall: true },
    ]);
    const phaseEvents = events
      .filter((e) => e.type === 'custom' || e.type === 'tool_result')
      .map((e) =>
        e.type === 'custom'
          ? `emit:${String(e.data)}`
          : `result:${e.toolCallId}`,
      );
    expect(phaseEvents).toEqual([
      'emit:c1',
      'result:c1',
      'emit:c2',
      'result:c2',
      'emit:c3',
      'result:c3',
      'emit:c4',
      'result:c4',
    ]);
  });

  it('runs every beforeToolCall hook in call order before any afterToolCall hook', async () => {
    const log = new ExecutionLog();
    const phases: string[] = [];
    const observer: Hook = {
      name: 'observer',
      beforeToolCall: (ctx) => {
        phases.push(`before:${ctx.toolCall.id}`);
      },
      afterToolCall: (ctx) => {
        phases.push(`after:${ctx.toolCall.id}`);
      },
    };
    const model = new MockProvider([
      multiCallTurn(searchCalls(3)),
      textTurn('done'),
    ]);

    await collectEvents(
      baseInput(model, {
        tools: [delayedTool(log, () => 10)],
        hooks: [observer],
      }),
    );

    expect(phases).toEqual([
      'before:c1',
      'before:c2',
      'before:c3',
      'after:c1',
      'after:c2',
      'after:c3',
    ]);
  });

  it(`runs at most ${MAX_CONCURRENT_TOOL_CALLS} calls at once`, async () => {
    const log = new ExecutionLog();
    const count = MAX_CONCURRENT_TOOL_CALLS + 3;
    const model = new MockProvider([
      multiCallTurn(searchCalls(count)),
      textTurn('done'),
    ]);

    const events = await collectEvents(
      baseInput(model, { tools: [delayedTool(log, () => 20)] }),
    );

    expect(log.maxActive).toBe(MAX_CONCURRENT_TOOL_CALLS);
    expect(toolResultMessage(events)).toHaveLength(count);
  });

  it('runs an exclusive tool alone, after the calls before it and before the calls after it', async () => {
    const log = new ExecutionLog();
    const activate: Tool = {
      name: 'activate_skill',
      description: 'Activates a skill',
      parameters: { type: 'object', properties: {} },
      exclusive: true,
      execute: (_input, ctx) =>
        log.track(ctx.toolCallId, async () => {
          await delay(20);
          return 'activated';
        }),
    };
    const model = new MockProvider([
      multiCallTurn([
        { id: 'c1', name: 'search', input: { query: 'q1' } },
        { id: 'c2', name: 'search', input: { query: 'q2' } },
        { id: 'c3', name: 'activate_skill' },
        { id: 'c4', name: 'search', input: { query: 'q4' } },
      ]),
      textTurn('done'),
    ]);

    const events = await collectEvents(
      baseInput(model, {
        tools: [delayedTool(log, () => 30), activate],
      }),
    );

    expect(log.timeline.slice(0, 2)).toEqual(['start:c1', 'start:c2']);
    expect(sorted(log.timeline.slice(2, 4))).toEqual(['end:c1', 'end:c2']);
    expect(log.timeline.slice(4)).toEqual([
      'start:c3',
      'end:c3',
      'start:c4',
      'end:c4',
    ]);
    expect(toolResultMessage(events).map((c) => c.toolCallId)).toEqual([
      'c1',
      'c2',
      'c3',
      'c4',
    ]);
  });

  it('cancels running calls and skips queued ones when the run is aborted mid-phase', async () => {
    const controller = new AbortController();
    const log = new ExecutionLog();
    const signalsSeen: boolean[] = [];
    const count = MAX_CONCURRENT_TOOL_CALLS + 2;
    const tool = delayedTool(log, (query) => (query === 'q1' ? 10 : 5_000));
    const execute = tool.execute!;
    tool.execute = async (input, ctx) => {
      try {
        return await execute(input, ctx);
      } finally {
        signalsSeen.push(ctx.signal?.aborted ?? false);
        if (ctx.toolCallId === 'c1') controller.abort();
      }
    };
    const model = new MockProvider([
      multiCallTurn(searchCalls(count)),
      textTurn('never reached'),
    ]);

    const startedAt = Date.now();
    const events = await collectEvents(
      baseInput(model, { tools: [tool], signal: controller.signal }),
    );

    expect(Date.now() - startedAt).toBeLessThan(2_000);
    expect(log.started).toHaveLength(MAX_CONCURRENT_TOOL_CALLS);
    expect(signalsSeen.slice(1).every(Boolean)).toBe(true);
    const contents = toolResultMessage(events);
    expect(contents).toHaveLength(count);
    expect(contents[0]).toMatchObject({
      toolCallId: 'c1',
      result: 'results for q1',
      isError: false,
    });
    for (const content of contents.slice(1)) {
      expect(content.isError).toBe(true);
    }
    expect(contents.at(-1)?.result).toContain('aborted before');
    expect(model.requests).toHaveLength(1);
    expect(events.at(-1)).toMatchObject({ type: 'run_end', status: 'aborted' });
  });

  it('reports calls cancelled mid-execution to afterToolCall as aborted', async () => {
    const controller = new AbortController();
    const outcomes: Record<string, string> = {};
    const observer: Hook = {
      name: 'observer',
      afterToolCall: (ctx) => {
        outcomes[ctx.toolCall.id] = ctx.outcome;
      },
    };
    const log = new ExecutionLog();
    const tool = delayedTool(log, () => 5_000);
    const execute = tool.execute!;
    tool.execute = (input, ctx) => {
      if (ctx.toolCallId === 'c2') setTimeout(() => controller.abort(), 10);
      return execute(input, ctx);
    };
    const model = new MockProvider([multiCallTurn(searchCalls(2))]);

    await collectEvents(
      baseInput(model, {
        tools: [tool],
        hooks: [observer],
        signal: controller.signal,
      }),
    );

    expect(outcomes).toEqual({ c1: 'aborted', c2: 'aborted' });
  });

  it('cancels sibling calls when a hook aborts the run during the phase', async () => {
    const log = new ExecutionLog();
    const tool = delayedTool(log, (query) => (query === 'q1' ? 0 : 5_000));
    const abortAfterFirst: Hook = {
      name: 'abort-after-first',
      afterToolCall: (ctx) => {
        if (ctx.toolCall.id === 'c1') ctx.abort('thread no longer exists');
      },
    };
    const model = new MockProvider([multiCallTurn(searchCalls(2))]);

    const startedAt = Date.now();
    const events = await collectEvents(
      baseInput(model, { tools: [tool], hooks: [abortAfterFirst] }),
    );

    expect(Date.now() - startedAt).toBeLessThan(2_000);
    expect(toolResultMessage(events)[1]).toMatchObject({
      toolCallId: 'c2',
      isError: true,
    });
    expect(events.at(-1)).toMatchObject({ type: 'run_end', status: 'aborted' });
  });

  it('does not start queued calls after a fatal tool error and fails the run with it', async () => {
    const log = new ExecutionLog();
    const tool = delayedTool(log, () => 20);
    const execute = tool.execute!;
    tool.execute = (input, ctx) => {
      if (ctx.toolCallId === 'c1') {
        throw new AgentRuntimeError(
          'ANONYMIZATION_UNAVAILABLE',
          'Anonymization is currently unavailable',
        );
      }
      return execute(input, ctx);
    };
    const count = MAX_CONCURRENT_TOOL_CALLS + 2;
    const model = new MockProvider([multiCallTurn(searchCalls(count))]);

    const events = await collectEvents(baseInput(model, { tools: [tool] }));

    expect(log.started).not.toContain(`c${count}`);
    expect(toolResultMessage(events)).toHaveLength(count);
    expect(events.find((e) => e.type === 'error')).toMatchObject({
      code: 'ANONYMIZATION_UNAVAILABLE',
    });
  });

  it('settles running calls before the stream closes when the consumer abandons it', async () => {
    const log = new ExecutionLog();
    const tool = delayedTool(log, (query) => (query === 'q1' ? 0 : 5_000));
    const model = new MockProvider([multiCallTurn(searchCalls(3))]);

    const startedAt = Date.now();
    for await (const event of run(baseInput(model, { tools: [tool] }))) {
      if (event.type === 'tool_result') break;
    }

    expect(Date.now() - startedAt).toBeLessThan(2_000);
    expect(log.active).toBe(0);
    expect(sorted(log.finished)).toEqual(['c1', 'c2', 'c3']);
  });
});
