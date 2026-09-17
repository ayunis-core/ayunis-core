import { MockProvider, run, textTurn } from '@ayunis/agent-runtime';
import type { ModelProvider, RunEvent } from '@ayunis/agent-runtime';
import type { LanguageModel } from 'src/domain/models/domain/models/language.model';
import type { InferenceUsageGuard } from 'src/domain/runs/application/services/inference-usage-guard.service';
import { UsageHookFactory } from './usage-hook.factory';

describe('UsageHookFactory', () => {
  it('attributes reported usage to the agent-runtime path', async () => {
    const collectUsage = jest.fn();
    const factory = new UsageHookFactory({
      collectUsage,
    } as unknown as InferenceUsageGuard);
    const model = { name: 'municipal-assistant' } as LanguageModel;
    const events = run({
      instructions: 'Answer municipal service questions.',
      model: new MockProvider([
        textTurn('The office opens at 8.', {
          inputTokens: 12,
          outputTokens: 6,
        }),
      ]),
      messages: [
        {
          role: 'user',
          content: [{ type: 'text', text: 'When does the office open?' }],
        },
      ],
      hooks: [factory.create({ model })],
    });

    const completedEvents: RunEvent[] = [];
    for await (const event of events) completedEvents.push(event);

    expect(completedEvents).not.toHaveLength(0);
    expect(collectUsage).toHaveBeenCalledWith(
      model,
      { inputTokens: 12, outputTokens: 6 },
      expect.any(String),
      'agent_runtime',
    );
  });

  it('does not record usage when the provider reports no token fields', async () => {
    const collectUsage = jest.fn();
    const factory = new UsageHookFactory({
      collectUsage,
    } as unknown as InferenceUsageGuard);
    const model = { name: 'municipal-assistant' } as LanguageModel;
    const events = run({
      instructions: 'Answer municipal service questions.',
      model: new MockProvider([textTurn('The office opens at 8.', {})]),
      messages: [
        {
          role: 'user',
          content: [{ type: 'text', text: 'When does the office open?' }],
        },
      ],
      hooks: [factory.create({ model })],
    });

    const completedEvents: RunEvent[] = [];
    for await (const event of events) {
      completedEvents.push(event);
    }

    expect(completedEvents.at(-1)).toMatchObject({
      type: 'run_end',
      status: 'completed',
    });
    expect(collectUsage).not.toHaveBeenCalled();
  });

  it('records usage from a failed provider attempt before retrying', async () => {
    const collectUsage = jest.fn();
    const factory = new UsageHookFactory({
      collectUsage,
    } as unknown as InferenceUsageGuard);
    const model = { name: 'municipal-assistant' } as LanguageModel;
    let attempts = 0;
    const provider: ModelProvider = {
      name: 'retrying-provider',
      prepareRetry: jest.fn().mockResolvedValue(true),
      async *stream() {
        attempts++;
        if (attempts === 1) {
          yield { usage: { inputTokens: 11, outputTokens: 2 } };
          throw new Error('connection reset');
        }
        yield* textTurn('Recovered', { inputTokens: 13, outputTokens: 4 });
      },
    };

    const completedEvents: RunEvent[] = [];
    for await (const event of run({
      instructions: 'Answer municipal service questions.',
      model: provider,
      messages: [
        {
          role: 'user',
          content: [{ type: 'text', text: 'When does the office open?' }],
        },
      ],
      hooks: [factory.create({ model })],
    })) {
      completedEvents.push(event);
    }

    expect(completedEvents.at(-1)).toMatchObject({ status: 'completed' });
    expect(collectUsage).toHaveBeenCalledTimes(2);
    expect(collectUsage).toHaveBeenNthCalledWith(
      1,
      model,
      { inputTokens: 11, outputTokens: 2 },
      expect.any(String),
      'agent_runtime',
    );
    expect(collectUsage).toHaveBeenNthCalledWith(
      2,
      model,
      { inputTokens: 13, outputTokens: 4 },
      expect.any(String),
      'agent_runtime',
    );
  });
});
