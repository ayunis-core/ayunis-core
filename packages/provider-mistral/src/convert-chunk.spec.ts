import type { CompletionEvent } from '@mistralai/mistralai/models/components';
import { describe, expect, it } from 'vitest';

import { ToolNameCodec } from '@ayunis/inference';

import { convertChunk as convert } from './convert-chunk';

const event = (data: unknown): CompletionEvent => ({ data }) as CompletionEvent;

// Passthrough map — name translation is covered by its own tests below.
const convertChunk = (e: CompletionEvent) => convert(e, new ToolNameCodec([]));

describe('convertChunk', () => {
  it('converts a text content delta', () => {
    expect(
      convertChunk(
        event({ choices: [{ index: 0, delta: { content: 'Hello' } }] }),
      ),
    ).toEqual({ textDelta: 'Hello' });
  });

  it('joins text-chunk array content into a single delta', () => {
    expect(
      convertChunk(
        event({
          choices: [
            {
              index: 0,
              delta: {
                content: [
                  { type: 'text', text: 'Hel' },
                  { type: 'text', text: 'lo' },
                ],
              },
            },
          ],
        }),
      ),
    ).toEqual({ textDelta: 'Hello' });
  });

  it('converts tool_call deltas, carrying id, name and arguments', () => {
    expect(
      convertChunk(
        event({
          choices: [
            {
              index: 0,
              delta: {
                toolCalls: [
                  {
                    index: 0,
                    id: 'call_1',
                    function: { name: 'search', arguments: '{"q":' },
                  },
                ],
              },
            },
          ],
        }),
      ),
    ).toEqual({
      toolCallDeltas: [
        { index: 0, id: 'call_1', name: 'search', argumentsDelta: '{"q":' },
      ],
    });
  });

  it('defaults a missing tool_call id to null and stringifies object arguments', () => {
    expect(
      convertChunk(
        event({
          choices: [
            {
              index: 0,
              delta: {
                toolCalls: [
                  { index: 0, function: { name: 'x', arguments: { a: 1 } } },
                ],
              },
            },
          ],
        }),
      ),
    ).toEqual({
      toolCallDeltas: [
        { index: 0, id: null, name: 'x', argumentsDelta: '{"a":1}' },
      ],
    });
  });

  it.each([
    ['stop', 'stop'],
    ['length', 'length'],
    ['tool_calls', 'tool_calls'],
    ['error', null],
  ])('maps finishReason %s to %s', (finishReason, expected) => {
    expect(
      convertChunk(event({ choices: [{ index: 0, delta: {}, finishReason }] })),
    ).toEqual({ finishReason: expected });
  });

  it('converts a trailing usage chunk', () => {
    expect(
      convertChunk(
        event({
          choices: [],
          usage: { promptTokens: 11, completionTokens: 22, totalTokens: 33 },
        }),
      ),
    ).toEqual({ usage: { inputTokens: 11, outputTokens: 22 } });
  });

  it('returns null for an empty delta chunk', () => {
    expect(
      convertChunk(event({ choices: [{ index: 0, delta: {} }] })),
    ).toBeNull();
  });
});

describe('convertChunk wire-name decoding', () => {
  it('maps a wire tool name back to the original and records the wire name', () => {
    const codec = new ToolNameCodec([
      { name: 'notion.search', description: 'd', parameters: {} },
    ]);
    const result = convert(
      event({
        choices: [
          {
            delta: {
              toolCalls: [
                {
                  index: 0,
                  id: 'call_1',
                  function: { name: 'notion_search', arguments: '{}' },
                },
              ],
            },
          },
        ],
      }),
      codec,
    );
    expect(result?.toolCallDeltas).toEqual([
      {
        index: 0,
        id: 'call_1',
        name: 'notion.search',
        argumentsDelta: '{}',
        providerMetadata: { wireName: 'notion_search' },
      },
    ]);
  });
});
