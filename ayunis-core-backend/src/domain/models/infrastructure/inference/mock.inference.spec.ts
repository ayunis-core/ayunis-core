import { ModelToolChoice } from 'src/domain/models/domain/value-objects/model-tool-choice.enum';
import type { Model } from 'src/domain/models/domain/model.entity';
import { InferenceInput } from 'src/domain/models/application/ports/inference.handler';
import { MockInferenceHandler } from './mock.inference';

const input = (onCallTerminal: InferenceInput['onCallTerminal']) =>
  new InferenceInput({
    model: { provider: 'openai', name: 'gpt-4o' } as Model,
    messages: [],
    tools: [],
    toolChoice: ModelToolChoice.AUTO,
    orgId: '123e4567-e89b-12d3-a456-426614174000',
    onCallTerminal,
  });

describe('MockInferenceHandler terminal accounting', () => {
  it('records one cost-free completion before returning its response', async () => {
    const calls: unknown[] = [];
    const response = await new MockInferenceHandler().answer(
      input(async (call) => {
        calls.push(call);
      }),
    );

    expect(calls).toEqual([
      {
        outcome: 'completed',
        usage: { inputTokens: 0, outputTokens: 0 },
      },
    ]);
    expect(response.meta).toEqual({
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
    });
  });

  it('does not return ordinary success when terminal accounting fails', async () => {
    const failure = new Error('usage persistence unavailable');
    await expect(
      new MockInferenceHandler().answer(input(() => Promise.reject(failure))),
    ).rejects.toBe(failure);
  });
});
