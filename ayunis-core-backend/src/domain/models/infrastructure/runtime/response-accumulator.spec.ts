import type { ProviderChunk } from '@ayunis/inference';
import { accumulateResponse } from './response-accumulator';
import { TextMessageContent } from 'src/domain/messages/domain/message-contents/text-message-content.entity';
import { ToolUseMessageContent } from 'src/domain/messages/domain/message-contents/tool-use.message-content.entity';
import { ThinkingMessageContent } from 'src/domain/messages/domain/message-contents/thinking-message-content.entity';
import { InferenceFailedError } from 'src/domain/models/application/models.errors';

async function* stream(chunks: ProviderChunk[]): AsyncIterable<ProviderChunk> {
  for (const chunk of chunks) yield chunk;
}

describe('accumulateResponse', () => {
  it('concatenates text deltas into a single text content', async () => {
    const response = await accumulateResponse(
      stream([{ textDelta: 'Hel' }, { textDelta: 'lo' }]),
    );
    expect(response.content).toHaveLength(1);
    expect(response.content[0]).toBeInstanceOf(TextMessageContent);
    expect((response.content[0] as TextMessageContent).text).toBe('Hello');
  });

  it('accumulates a tool call across deltas and parses its arguments', async () => {
    const response = await accumulateResponse(
      stream([
        { toolCallDeltas: [{ index: 0, id: 'c1', name: 'get_weather' }] },
        { toolCallDeltas: [{ index: 0, argumentsDelta: '{"city":' }] },
        { toolCallDeltas: [{ index: 0, argumentsDelta: '"berlin"}' }] },
      ]),
    );
    const toolUse = response.content[0] as ToolUseMessageContent;
    expect(toolUse).toBeInstanceOf(ToolUseMessageContent);
    expect(toolUse.id).toBe('c1');
    expect(toolUse.name).toBe('get_weather');
    expect(toolUse.params).toEqual({ city: 'berlin' });
  });

  it('orders content as thinking, text, then tool calls', async () => {
    const response = await accumulateResponse(
      stream([
        { thinkingDelta: 'hmm', thinkingSignature: 'sig' },
        { textDelta: 'answer' },
        {
          toolCallDeltas: [
            { index: 0, id: 'c1', name: 't', argumentsDelta: '{}' },
          ],
        },
      ]),
    );
    expect(response.content[0]).toBeInstanceOf(ThinkingMessageContent);
    expect(response.content[1]).toBeInstanceOf(TextMessageContent);
    expect(response.content[2]).toBeInstanceOf(ToolUseMessageContent);
  });

  it('falls back to empty params on invalid JSON arguments', async () => {
    const response = await accumulateResponse(
      stream([
        {
          toolCallDeltas: [
            { index: 0, id: 'c1', name: 't', argumentsDelta: 'not json' },
          ],
        },
      ]),
    );
    expect((response.content[0] as ToolUseMessageContent).params).toEqual({});
  });

  it('throws when the completion was truncated (finishReason length)', async () => {
    await expect(
      accumulateResponse(
        stream([{ textDelta: 'partial' }, { finishReason: 'length' }]),
      ),
    ).rejects.toBeInstanceOf(InferenceFailedError);
  });

  it('does not throw for normal stop/tool_calls finish reasons', async () => {
    await expect(
      accumulateResponse(
        stream([{ textDelta: 'done' }, { finishReason: 'stop' }]),
      ),
    ).resolves.toBeDefined();
    await expect(
      accumulateResponse(
        stream([
          { toolCallDeltas: [{ index: 0, id: 'c1', name: 't' }] },
          { finishReason: 'tool_calls' },
        ]),
      ),
    ).resolves.toBeDefined();
  });

  it('captures usage as response meta', async () => {
    const response = await accumulateResponse(
      stream([
        { textDelta: 'x' },
        { usage: { inputTokens: 7, outputTokens: 3 } },
      ]),
    );
    expect(response.meta).toEqual({
      inputTokens: 7,
      outputTokens: 3,
      totalTokens: 10,
    });
  });
});
