import { ModelToolChoice } from 'src/domain/models/domain/value-objects/model-tool-choice.enum';
import type { Model } from 'src/domain/models/domain/model.entity';
import { lastValueFrom } from 'rxjs';
import {
  InferenceCallService,
  type InferenceCall,
} from 'src/domain/models/application/services/inference-call.service';
import type { InferenceProviderRegistry } from 'src/domain/models/application/registry/inference-provider.registry';
import type { ImageContentService } from 'src/domain/messages/application/services/image-content.service';
import { MockInferenceProviderFactory } from './mock.inference-provider';

function callService(): InferenceCallService {
  const factory = new MockInferenceProviderFactory();
  return new InferenceCallService(
    {
      resolve: (model: Model) => factory.resolveProvider(model),
    } as InferenceProviderRegistry,
    {} as ImageContentService,
  );
}

const input = (
  onCallTerminal: InferenceCall['onCallTerminal'],
): InferenceCall => ({
  model: { provider: 'openai', name: 'gpt-4o' } as Model,
  messages: [],
  tools: [],
  toolChoice: ModelToolChoice.AUTO,
  orgId: '123e4567-e89b-12d3-a456-426614174000',
  onCallTerminal,
});

describe('Mock provider terminal accounting', () => {
  it('records one cost-free completion before returning its response', async () => {
    const calls: unknown[] = [];
    const response = await callService().complete(
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

  it('records a cost-free streaming completion once', async () => {
    const calls: unknown[] = [];
    await lastValueFrom(
      callService().stream(
        input(async (call) => {
          calls.push(call);
        }),
      ),
    );
    expect(calls).toEqual([
      { outcome: 'completed', usage: { inputTokens: 0, outputTokens: 0 } },
    ]);
  });

  it('does not return ordinary success when terminal accounting fails', async () => {
    const failure = new Error('usage persistence unavailable');
    await expect(
      callService().complete(input(() => Promise.reject(failure))),
    ).rejects.toBe(failure);
  });
});
