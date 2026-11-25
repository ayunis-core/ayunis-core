import { Test } from '@nestjs/testing';
import { ContextService } from 'src/common/context/services/context.service';
import { createMockContextService } from 'src/common/context/testing/context.fixtures';
import { TextMessageContent } from 'src/domain/messages/domain/message-contents/text-message-content.entity';
import { InferenceCallService } from 'src/domain/models/application/services/inference-call.service';
import { InferenceFailedError } from 'src/domain/models/application/models.errors';
import { GetInferenceUseCase } from 'src/domain/models/application/use-cases/get-inference/get-inference.use-case';
import { CollectUsageAsyncService } from 'src/domain/usage/application/services/collect-usage-async.service';
import { QuotaExceededError } from 'src/iam/quotas/application/quotas.errors';
import { InferenceAdmissionGuard } from 'src/iam/quotas/application/services/inference-admission-guard.service';
import { IncrementTrialMessagesUseCase } from 'src/iam/trials/application/use-cases/increment-trial-messages/increment-trial-messages.use-case';
import {
  RoutinePromptImprovementFailedError,
  UnexpectedRoutineError,
} from 'src/domain/routines/application/routines.errors';
import { RoutineModelService } from 'src/domain/routines/application/services/routine-model.service';
import {
  TEST_ORG_ID,
  TEST_USER_ID,
} from 'src/domain/routines/application/testing/routine.fixtures';
import { ImproveRoutinePromptCommand } from './improve-routine-prompt.command';
import { ImproveRoutinePromptUseCase } from './improve-routine-prompt.use-case';

const PAID_MODEL = { id: 'org-model', consumesCredits: true };
const DRAFT = 'Schau jeden Morgen ins Amtsblatt, ob was Wichtiges drin ist.';
const REWRITE =
  'Prüfe das heutige Amtsblatt auf Bekanntmachungen zum Gewerberecht.';

function answer(text: string, usage = { inputTokens: 120, outputTokens: 30 }) {
  return { content: [new TextMessageContent(text)], meta: usage };
}

describe('ImproveRoutinePromptUseCase', () => {
  let useCase: ImproveRoutinePromptUseCase;
  const complete = jest.fn();
  const forPromptImprovement = jest.fn();
  const preflight = jest.fn();
  const ensureModelCallAllowed = jest.fn();
  const collectCritical = jest.fn();
  const incrementTrialMessages = jest.fn();

  beforeEach(async () => {
    jest.resetAllMocks();
    complete.mockResolvedValue(answer(REWRITE));
    forPromptImprovement.mockResolvedValue(PAID_MODEL);
    preflight.mockResolvedValue(undefined);
    ensureModelCallAllowed.mockResolvedValue(undefined);
    collectCritical.mockResolvedValue(undefined);
    incrementTrialMessages.mockResolvedValue(undefined);
    const module = await Test.createTestingModule({
      providers: [
        ImproveRoutinePromptUseCase,
        GetInferenceUseCase,
        { provide: InferenceCallService, useValue: { complete } },
        { provide: RoutineModelService, useValue: { forPromptImprovement } },
        {
          provide: InferenceAdmissionGuard,
          useValue: { preflight, ensureModelCallAllowed },
        },
        { provide: CollectUsageAsyncService, useValue: { collectCritical } },
        {
          provide: IncrementTrialMessagesUseCase,
          useValue: { execute: incrementTrialMessages },
        },
        { provide: ContextService, useValue: createMockContextService() },
      ],
    }).compile();
    useCase = module.get(ImproveRoutinePromptUseCase);
  });

  function aCommand(
    overrides: Partial<
      ConstructorParameters<typeof ImproveRoutinePromptCommand>[0]
    > = {},
  ) {
    return new ImproveRoutinePromptCommand({
      name: 'Amtsblatt',
      prompt: DRAFT,
      consumeTrialMessage: false,
      ...overrides,
    });
  }

  function sentPrompt(): string {
    return complete.mock.calls[0][0].messages[0].content[0].text as string;
  }

  it('returns the rewritten task', async () => {
    await expect(useCase.execute(aCommand())).resolves.toBe(REWRITE);
  });

  it("rewrites the author's draft, not a stored routine", async () => {
    await useCase.execute(aCommand());

    expect(sentPrompt()).toContain(DRAFT);
    expect(sentPrompt()).toContain('Routine name: Amtsblatt');
  });

  it.each([
    ['de', 'German'],
    ['en', 'English'],
    [undefined, 'English'],
  ] as const)(
    'falls back to the UI language %s when the draft has none',
    async (language, fallback) => {
      await useCase.execute(aCommand({ language, prompt: '12345' }));

      expect(sentPrompt()).toContain(
        `If the language cannot be confidently determined, write in ${fallback}`,
      );
    },
  );

  it('does not call the model when the caller is over a limit', async () => {
    preflight.mockRejectedValue(
      new QuotaExceededError('FAIR_USE_MESSAGES_MEDIUM', 10, 3_600_000, 60),
    );

    await expect(
      useCase.execute(aCommand({ consumeTrialMessage: true })),
    ).rejects.toThrow(QuotaExceededError);
    expect(complete).not.toHaveBeenCalled();
    expect(incrementTrialMessages).not.toHaveBeenCalled();
  });

  it('checks the limits of the caller for the model it calls', async () => {
    await useCase.execute(aCommand());

    const principal = { userId: TEST_USER_ID, orgId: TEST_ORG_ID };
    expect(preflight).toHaveBeenCalledWith(principal, PAID_MODEL);
    expect(ensureModelCallAllowed).toHaveBeenCalledWith(principal, PAID_MODEL);
    expect(complete.mock.calls[0][0].model).toBe(PAID_MODEL);
  });

  it('charges the tokens the rewrite used', async () => {
    await useCase.execute(aCommand());

    expect(collectCritical).toHaveBeenCalledWith(PAID_MODEL, 120, 30);
  });

  it('fails the rewrite when a paid model reports no usage', async () => {
    complete.mockResolvedValue({
      content: [new TextMessageContent(REWRITE)],
      meta: {},
    });

    await expect(useCase.execute(aCommand())).rejects.toThrow(
      RoutinePromptImprovementFailedError,
    );
  });

  it('returns the rewrite of a free model that reports no usage', async () => {
    forPromptImprovement.mockResolvedValue({
      id: 'free',
      consumesCredits: false,
    });
    complete.mockResolvedValue({
      content: [new TextMessageContent(REWRITE)],
      meta: {},
    });

    await expect(useCase.execute(aCommand())).resolves.toBe(REWRITE);
  });

  it('does not hand out the rewrite when its usage cannot be stored', async () => {
    collectCritical.mockRejectedValue(new Error('usage database unavailable'));

    await expect(useCase.execute(aCommand())).rejects.toThrow(
      UnexpectedRoutineError,
    );
  });

  it('charges a truncated rewrite even though it is rejected', async () => {
    complete.mockResolvedValue({
      ...answer('Prüfe zuerst das', { inputTokens: 500, outputTokens: 1024 }),
      finishReason: 'length',
    });

    await expect(useCase.execute(aCommand())).rejects.toThrow(
      InferenceFailedError,
    );
    expect(collectCritical).toHaveBeenCalledWith(PAID_MODEL, 500, 1024);
  });

  it.each(['', '" "'])(
    'reports the answer %p instead of clearing the task',
    async (text) => {
      complete.mockResolvedValue(answer(text));

      await expect(useCase.execute(aCommand())).rejects.toThrow(
        RoutinePromptImprovementFailedError,
      );
    },
  );

  it('consumes a trial message when the caller was admitted on trial capacity', async () => {
    await useCase.execute(aCommand({ consumeTrialMessage: true }));

    expect(incrementTrialMessages).toHaveBeenCalledTimes(1);
    expect(incrementTrialMessages.mock.calls[0][0]).toMatchObject({
      orgId: TEST_ORG_ID,
    });
  });

  it('leaves the trial counter alone for subscribed callers', async () => {
    await useCase.execute(aCommand());

    expect(incrementTrialMessages).not.toHaveBeenCalled();
  });

  it('still returns the rewrite when trial accounting fails', async () => {
    incrementTrialMessages.mockRejectedValue(new Error('trial store down'));

    await expect(
      useCase.execute(aCommand({ consumeTrialMessage: true })),
    ).resolves.toBe(REWRITE);
  });
});
