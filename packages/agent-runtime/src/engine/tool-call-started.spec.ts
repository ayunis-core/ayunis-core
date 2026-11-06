import { describe, expect, it } from 'vitest';
import type { RunEvent } from '../contracts/event';
import type { Hook, ModelCallOutcomeSnapshot } from '../contracts/hook';
import type { ProviderChunk } from '../contracts/provider';
import type { Tool } from '../contracts/tool';
import { MockProvider, textTurn } from '../providers/mock/mock-provider';
import { baseInput, collectEvents, eventTypes } from './test-helpers';

const documentTool: Tool = {
  name: 'create_document',
  description: 'Creates a document',
  parameters: {
    type: 'object',
    properties: { title: { type: 'string' } },
    required: ['title'],
  },
  execute: () => 'created',
};

const documentTurn = (
  argumentsJson: string,
  id = 'call_doc',
): ProviderChunk[] => [
  { toolCallDeltas: [{ index: 0, id, name: 'create_document' }] },
  { toolCallDeltas: [{ index: 0, argumentsDelta: argumentsJson }] },
  { finishReason: 'tool_calls' },
];

const startedEvents = (events: readonly RunEvent[]) =>
  events.filter((event) => event.type === 'tool_call_started');

describe('tool_call_started', () => {
  it('names a tool-only call before its held-back snapshots are revealed', async () => {
    const provider = new MockProvider([
      documentTurn('{"title":"Bericht"}'),
      textTurn('Done'),
    ]);

    const events = await collectEvents(
      baseInput(provider, { tools: [documentTool] }),
    );

    const types = eventTypes(events);
    expect(types.indexOf('tool_call_started')).toBeLessThan(
      types.indexOf('tool_call_snapshot'),
    );
    expect(startedEvents(events)).toEqual([
      expect.objectContaining({
        toolCall: { index: 0, id: 'call_doc', name: 'create_document' },
      }),
    ]);
  });

  it('is emitted once per call, when the provider first names it', async () => {
    const provider = new MockProvider([
      [
        { toolCallDeltas: [{ index: 0, id: 'call_a', argumentsDelta: '' }] },
        { toolCallDeltas: [{ index: 0, name: 'create_document' }] },
        { toolCallDeltas: [{ index: 0, name: 'create_document' }] },
        { toolCallDeltas: [{ index: 1, id: 'call_b', name: 'echo' }] },
        {
          toolCallDeltas: [
            { index: 0, argumentsDelta: '{"title":"A"}' },
            { index: 1, argumentsDelta: '{}' },
          ],
        },
        { finishReason: 'tool_calls' },
      ],
      textTurn('Done'),
    ]);

    const events = await collectEvents(
      baseInput(provider, {
        tools: [
          documentTool,
          { ...documentTool, name: 'echo', parameters: { type: 'object' } },
        ],
      }),
    );

    expect(startedEvents(events).map((event) => event.toolCall)).toEqual([
      { index: 0, id: 'call_a', name: 'create_document' },
      { index: 1, id: 'call_b', name: 'echo' },
    ]);
  });

  it('does not count as visible output, so a malformed call is still retried', async () => {
    const outcomes: ModelCallOutcomeSnapshot[] = [];
    const observer: Hook = {
      name: 'outcome-observer',
      afterModelCall: (ctx) => {
        outcomes.push(ctx.outcome);
      },
    };
    const provider = new MockProvider([
      documentTurn('{"title":', 'call_bad'),
      documentTurn('{"title":"Bericht"}', 'call_good'),
      textTurn('Done'),
    ]);

    const events = await collectEvents(
      baseInput(provider, { tools: [documentTool], hooks: [observer] }),
    );

    expect(events.find((event) => event.type === 'error')).toBeUndefined();
    expect(provider.requests).toHaveLength(3);
    expect(outcomes[0]).toMatchObject({
      type: 'rejected',
      reason: 'malformed',
      visibleOutput: false,
    });
    expect(startedEvents(events).map((event) => event.toolCall.id)).toEqual([
      'call_bad',
      'call_good',
    ]);
  });

  it('is not emitted by the tool-disabled fallback', async () => {
    const malformed = documentTurn('{"title":', 'call_bad');
    const provider = new MockProvider([
      malformed,
      malformed,
      malformed,
      [
        { textDelta: 'I cannot do that.' },
        {
          toolCallDeltas: [
            { index: 0, id: 'fallback_call', name: 'create_document' },
          ],
        },
        { finishReason: 'tool_calls' },
      ],
    ]);

    const events = await collectEvents(
      baseInput(provider, { tools: [documentTool] }),
    );

    expect(provider.requests).toHaveLength(4);
    expect(startedEvents(events).map((event) => event.toolCall.id)).toEqual([
      'call_bad',
      'call_bad',
      'call_bad',
    ]);
  });
});
