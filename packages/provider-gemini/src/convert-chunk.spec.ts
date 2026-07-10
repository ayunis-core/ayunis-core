import type { GenerateContentResponse } from '@google/genai';
import { FinishReason } from '@google/genai';
import { describe, expect, it } from 'vitest';

import { ToolNameCodec } from '@ayunis/inference';

import { convertChunk as convert } from './convert-chunk';

const chunk = (data: unknown): GenerateContentResponse =>
  data as GenerateContentResponse;

// Passthrough map — name translation is covered by its own tests below.
const convertChunk = (c: GenerateContentResponse) =>
  convert(c, new ToolNameCodec([]));

describe('convertChunk', () => {
  it('converts a text part to a text delta', () => {
    expect(
      convertChunk(
        chunk({ candidates: [{ content: { parts: [{ text: 'Hello' }] } }] }),
      ),
    ).toEqual({ textDelta: 'Hello' });
  });

  it('carries a text part thoughtSignature as provider metadata', () => {
    expect(
      convertChunk(
        chunk({
          candidates: [
            {
              content: {
                parts: [{ text: 'Hi', thoughtSignature: 'sig-1' }],
              },
            },
          ],
        }),
      ),
    ).toEqual({
      textDelta: 'Hi',
      textProviderMetadata: { gemini: { thoughtSignature: 'sig-1' } },
    });
  });

  it('converts a function-call part to a tool-call delta keyed by part index', () => {
    expect(
      convertChunk(
        chunk({
          candidates: [
            {
              content: {
                parts: [
                  {
                    functionCall: {
                      id: 'call_1',
                      name: 'search',
                      args: { q: 'x' },
                    },
                    thoughtSignature: 'sig-tool',
                  },
                ],
              },
            },
          ],
        }),
      ),
    ).toEqual({
      toolCallDeltas: [
        {
          index: 0,
          id: 'call_1',
          name: 'search',
          argumentsDelta: '{"q":"x"}',
          providerMetadata: { gemini: { thoughtSignature: 'sig-tool' } },
        },
      ],
    });
  });

  it('falls back to the function name when a call id is missing', () => {
    expect(
      convertChunk(
        chunk({
          candidates: [
            { content: { parts: [{ functionCall: { name: 'search' } }] } },
          ],
        }),
      ),
    ).toEqual({
      toolCallDeltas: [
        { index: 0, id: 'search', name: 'search', argumentsDelta: null },
      ],
    });
  });

  it('maps STOP and MAX_TOKENS finish reasons', () => {
    expect(
      convertChunk(
        chunk({ candidates: [{ finishReason: FinishReason.STOP }] }),
      ),
    ).toEqual({ finishReason: 'stop' });
    expect(
      convertChunk(
        chunk({ candidates: [{ finishReason: FinishReason.MAX_TOKENS }] }),
      ),
    ).toEqual({ finishReason: 'length' });
  });

  it('converts cumulative usage metadata', () => {
    expect(
      convertChunk(
        chunk({
          candidates: [],
          usageMetadata: { promptTokenCount: 11, candidatesTokenCount: 22 },
        }),
      ),
    ).toEqual({ usage: { inputTokens: 11, outputTokens: 22 } });
  });

  it('returns null for an empty chunk', () => {
    expect(
      convertChunk(chunk({ candidates: [{ content: { parts: [] } }] })),
    ).toBeNull();
  });
});

describe('convertChunk wire-name decoding', () => {
  it('maps a wire tool name back to the original and records the wire name', () => {
    const codec = new ToolNameCodec([
      { name: 'notion.search', description: 'd', parameters: {} },
    ]);
    const result = convert(
      chunk({
        candidates: [
          {
            content: {
              parts: [
                {
                  functionCall: {
                    id: 'fc_1',
                    name: 'notion_search',
                    args: { q: 'x' },
                  },
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
        id: 'fc_1',
        name: 'notion.search',
        argumentsDelta: '{"q":"x"}',
        providerMetadata: { wireName: 'notion_search' },
      },
    ]);
  });
});
