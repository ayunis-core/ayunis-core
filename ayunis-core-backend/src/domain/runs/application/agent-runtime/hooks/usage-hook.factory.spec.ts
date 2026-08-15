import { MockProvider, run, textTurn } from '@ayunis/agent-runtime';
import type { RunEvent } from '@ayunis/agent-runtime';
import type { LanguageModel } from 'src/domain/models/domain/models/language.model';
import type { InferenceUsageGuard } from '../../services/inference-usage-guard.service';
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
});
