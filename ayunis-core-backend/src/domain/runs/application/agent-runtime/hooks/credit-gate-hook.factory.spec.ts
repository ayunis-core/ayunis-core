import {
  MockProvider,
  run,
  textTurn,
  type RunEvent,
} from '@ayunis/agent-runtime';
import type { UUID } from 'crypto';
import type { LanguageModel } from 'src/domain/models/domain/models/language.model';
import type { InferenceUsageGuard } from 'src/domain/runs/application/services/inference-usage-guard.service';
import { CreditBudgetExceededError } from 'src/iam/subscriptions/application/subscription.errors';
import { CreditGateHookFactory } from './credit-gate-hook.factory';

const userId = '223e4567-e89b-12d3-a456-426614174000' as UUID;
const orgId = '323e4567-e89b-12d3-a456-426614174000' as UUID;
const model = { name: 'Municipal Assistant' } as LanguageModel;
const messages = [
  {
    role: 'user' as const,
    content: [{ type: 'text' as const, text: 'When does the office open?' }],
  },
];

async function collectEvents(
  events: AsyncIterable<RunEvent>,
): Promise<RunEvent[]> {
  const collected: RunEvent[] = [];
  for await (const event of events) collected.push(event);
  return collected;
}

describe('CreditGateHookFactory', () => {
  it('checks monetary policy before every actual model call', async () => {
    const ensureModelCallAllowed = jest.fn().mockResolvedValue(undefined);
    const factory = new CreditGateHookFactory({
      ensureModelCallAllowed,
    } as unknown as InferenceUsageGuard);
    const provider = new MockProvider([
      [{ usage: { inputTokens: 4 }, finishReason: 'stop' }],
      textTurn('The office opens at 8.'),
    ]);

    await collectEvents(
      run({
        instructions: 'Answer municipal service questions.',
        model: provider,
        messages,
        hooks: [
          factory.create({
            principal: { userId, orgId },
            resolveModel: () => model,
          }),
        ],
        retry: { maxRetries: 1 },
      }),
    );

    expect(ensureModelCallAllowed).toHaveBeenNthCalledWith(
      1,
      { userId, orgId },
      model,
    );
    expect(ensureModelCallAllowed).toHaveBeenNthCalledWith(
      2,
      { userId, orgId },
      model,
    );
  });

  it('preserves credit policy codes and metadata through the runtime boundary', async () => {
    const ensureModelCallAllowed = jest.fn().mockRejectedValue(
      new CreditBudgetExceededError({
        orgId,
        creditsUsed: 105,
        monthlyCredits: 100,
      }),
    );
    const factory = new CreditGateHookFactory({
      ensureModelCallAllowed,
    } as unknown as InferenceUsageGuard);
    const provider = new MockProvider([textTurn('Not called')]);

    const events = await collectEvents(
      run({
        instructions: 'Answer municipal service questions.',
        model: provider,
        messages,
        hooks: [
          factory.create({
            principal: { userId, orgId },
            resolveModel: () => model,
          }),
        ],
      }),
    );

    expect(provider.requests).toHaveLength(0);
    expect(events).toContainEqual(
      expect.objectContaining({
        type: 'error',
        code: 'CREDIT_BUDGET_EXCEEDED',
        details: {
          orgId,
          creditsUsed: 105,
          monthlyCredits: 100,
          modelTurn: 1,
        },
      }),
    );
  });
});
