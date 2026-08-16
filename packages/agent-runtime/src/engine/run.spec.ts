import { describe, expect, it } from 'vitest';

import { RunContext } from '../context/run-context';
import { InvalidRunInputError } from '../contracts/errors';
import type { RunEvent } from '../contracts/event';
import type { Hook } from '../contracts/hook';
import {
  MockProvider,
  textTurn,
  toolCallTurn,
} from '../providers/mock/mock-provider';
import { run } from './run';
import {
  baseInput,
  collectEvents,
  echoTool,
  userMessage,
} from './test-helpers';

describe('run input validation', () => {
  it('throws synchronously on empty messages', () => {
    const model = new MockProvider([]);
    expect(() => run({ instructions: '', model, messages: [] })).toThrow(
      InvalidRunInputError,
    );
  });

  it('throws synchronously on a non-positive iteration cap', () => {
    const model = new MockProvider([]);
    expect(() =>
      run({
        instructions: '',
        model,
        messages: [userMessage('Hi')],
        maxIterations: 0,
      }),
    ).toThrow(InvalidRunInputError);
  });
});

describe('re-entrancy and child runs', () => {
  it('runs two concurrent runs without shared state', async () => {
    const modelA = new MockProvider([textTurn('A')]);
    const modelB = new MockProvider([textTurn('B')]);
    const [eventsA, eventsB] = await Promise.all([
      collectEvents(baseInput(modelA)),
      collectEvents(baseInput(modelB)),
    ]);

    const runIdA = eventsA[0].runId;
    const runIdB = eventsB[0].runId;
    expect(runIdA).not.toBe(runIdB);
    expect(eventsA.every((e) => e.runId === runIdA)).toBe(true);
    expect(eventsB.every((e) => e.runId === runIdB)).toBe(true);
  });

  it('lets a tool re-enter the loop via runChild with a derived context', async () => {
    const childModel = new MockProvider([textTurn('child says hi')]);
    const childEvents: RunEvent[] = [];
    const spawningTool = echoTool({
      name: 'spawn',
      execute: async (_input, ctx) => {
        for await (const event of ctx.runChild({
          instructions: 'You are the child.',
          model: childModel,
          messages: [userMessage('Go')],
        })) {
          childEvents.push(event);
        }
        return 'child finished';
      },
    });
    const parentModel = new MockProvider([
      toolCallTurn({ id: 'c1', name: 'spawn', input: {} }),
      textTurn('parent done'),
    ]);
    const parentEvents = await collectEvents(
      baseInput(parentModel, { tools: [spawningTool] }),
    );

    expect(childEvents.at(-1)).toMatchObject({
      type: 'run_end',
      status: 'completed',
    });
    expect(childEvents[0].depth).toBe(1);
    expect(childEvents[0].path).toHaveLength(2);
    expect(childEvents[0].path[0]).toBe(parentEvents[0].runId);
    const toolResult = parentEvents.find((e) => e.type === 'tool_result');
    expect(toolResult).toMatchObject({ result: 'child finished' });
  });

  it('inherits parent hooks in child runs by default', async () => {
    const phases: string[] = [];
    const childStatuses: string[] = [];
    const observer: Hook = {
      name: 'observer',
      runStart: (ctx) => {
        phases.push(`start:${ctx.context.depth}`);
      },
    };
    const childModel = new MockProvider([textTurn('child')]);
    const spawningTool = echoTool({
      name: 'spawn',
      execute: async (_input, ctx) => {
        for await (const event of ctx.runChild({
          instructions: '',
          model: childModel,
          messages: [userMessage('Go')],
        })) {
          if (event.type === 'run_end') {
            childStatuses.push(event.status);
          }
        }
        return 'done';
      },
    });
    const parentModel = new MockProvider([
      toolCallTurn({ id: 'c1', name: 'spawn', input: {} }),
      textTurn('parent done'),
    ]);
    await collectEvents(
      baseInput(parentModel, { tools: [spawningTool], hooks: [observer] }),
    );

    expect(phases).toEqual(['start:0', 'start:1']);
    expect(childStatuses).toEqual(['completed']);
  });

  it('reads parent context values from the child run', async () => {
    const seen: unknown[] = [];
    const childStatuses: string[] = [];
    const reader: Hook = {
      name: 'reader',
      runStart: (ctx) => {
        seen.push(ctx.context.get('orgId'));
      },
    };
    const childModel = new MockProvider([textTurn('child')]);
    const spawningTool = echoTool({
      name: 'spawn',
      execute: async (_input, ctx) => {
        for await (const event of ctx.runChild({
          instructions: '',
          model: childModel,
          messages: [userMessage('Go')],
        })) {
          if (event.type === 'run_end') {
            childStatuses.push(event.status);
          }
        }
        return 'done';
      },
    });
    const parentModel = new MockProvider([
      toolCallTurn({ id: 'c1', name: 'spawn', input: {} }),
      textTurn('parent done'),
    ]);
    await collectEvents(
      baseInput(parentModel, {
        tools: [spawningTool],
        hooks: [reader],
        context: RunContext.create({ orgId: 'org-1' }),
      }),
    );

    expect(seen).toEqual(['org-1', 'org-1']);
    expect(childStatuses).toEqual(['completed']);
  });

  it('delegates child runs with a derived context and no implicit hooks', async () => {
    const parentPhases: number[] = [];
    const delegatedContexts: RunContext[] = [];
    const observer: Hook = {
      name: 'observer',
      runStart: (ctx) => {
        parentPhases.push(ctx.context.depth);
      },
    };
    const childModel = new MockProvider([textTurn('child')]);
    const childRunHandler = (input: Parameters<typeof run>[0]) => {
      if (input.context) {
        delegatedContexts.push(input.context);
      }
      return run(input);
    };
    const spawningTool = echoTool({
      name: 'spawn',
      execute: async (_input, ctx) => {
        await collectAsync(
          ctx.runChild({
            instructions: 'Child.',
            model: childModel,
            messages: [userMessage('Go')],
          }),
        );
        return 'done';
      },
    });
    const parentModel = new MockProvider([
      toolCallTurn({ id: 'c1', name: 'spawn', input: {} }),
      textTurn('parent done'),
    ]);

    await collectEvents(
      baseInput(parentModel, {
        tools: [spawningTool],
        hooks: [observer],
        childRunHandler,
      }),
    );

    expect(parentPhases).toEqual([0]);
    expect(delegatedContexts[0]).toMatchObject({ depth: 1 });
  });

  it('preserves path metadata for nested delegated child events', async () => {
    const delegatedEvents: RunEvent[] = [];
    const grandchildModel = new MockProvider([textTurn('grandchild')]);
    const childModel = new MockProvider([
      toolCallTurn({ id: 'nested', name: 'nest', input: {} }),
      textTurn('child'),
    ]);
    const nestingTool = echoTool({
      name: 'nest',
      execute: async (_input, ctx) => {
        delegatedEvents.push(
          ...(await collectAsync(
            ctx.runChild({
              instructions: 'Grandchild.',
              model: grandchildModel,
              messages: [userMessage('Go deeper')],
            }),
          )),
        );
        return 'nested';
      },
    });
    const childRunHandler = (input: Parameters<typeof run>[0]) => run(input);
    const spawningTool = echoTool({
      name: 'spawn',
      execute: async (_input, ctx) => {
        delegatedEvents.push(
          ...(await collectAsync(
            ctx.runChild({
              instructions: 'Child.',
              model: childModel,
              tools: [nestingTool],
              messages: [userMessage('Go')],
            }),
          )),
        );
        return 'done';
      },
    });
    const parentModel = new MockProvider([
      toolCallTurn({ id: 'c1', name: 'spawn', input: {} }),
      textTurn('parent'),
    ]);

    const parentEvents = await collectEvents(
      baseInput(parentModel, { tools: [spawningTool], childRunHandler }),
    );

    const grandchildStart = delegatedEvents.find((event) => event.depth === 2);
    expect(grandchildStart).toMatchObject({ depth: 2 });
    expect(grandchildStart?.path).toHaveLength(3);
    expect(grandchildStart?.path[0]).toBe(parentEvents[0].runId);
  });
});

const collectAsync = async <T>(iterable: AsyncIterable<T>): Promise<T[]> => {
  const values: T[] = [];
  for await (const value of iterable) {
    values.push(value);
  }
  return values;
};
