import { Test } from '@nestjs/testing';
import {
  aUserContext,
  getFromUserContext,
} from 'src/common/context/testing/context.fixtures';
import { randomUUID } from 'crypto';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { TextMessageContent } from 'src/domain/messages/domain/message-contents/text-message-content.entity';
import { InferenceHandlerRegistry } from 'src/domain/models/application/registry/inference-handler.registry';
import { InferenceFailedError } from 'src/domain/models/application/models.errors';
import { GetInferenceUseCase } from 'src/domain/models/application/use-cases/get-inference/get-inference.use-case';
import { CollectUsageAsyncService } from 'src/domain/usage/application/services/collect-usage-async.service';
import { InferenceAdmissionGuard } from 'src/iam/quotas/application/services/inference-admission-guard.service';
import { IncrementTrialMessagesUseCase } from 'src/iam/trials/application/use-cases/increment-trial-messages/increment-trial-messages.use-case';
import { SkillTextModelResolver } from 'src/domain/skills/application/services/skill-text-model-resolver.service';
import {
  SkillTextImprovementFailedError,
  UnexpectedSkillError,
} from 'src/domain/skills/application/skills.errors';
import { QuotaExceededError } from 'src/iam/quotas/application/quotas.errors';
import {
  ImproveSkillTextCommand,
  SkillTextField,
} from './improve-skill-text.command';
import { ImproveSkillTextUseCase } from './improve-skill-text.use-case';

describe('ImproveSkillTextUseCase', () => {
  const userId = randomUUID();
  const orgId = randomUUID();
  let useCase: ImproveSkillTextUseCase;
  let getInference: { execute: jest.Mock };
  let modelResolver: { resolve: jest.Mock };
  let admissionGuard: {
    preflight: jest.Mock;
    ensureModelCallAllowed: jest.Mock;
  };
  let collectUsage: { collectCritical: jest.Mock };
  let incrementTrialMessages: { execute: jest.Mock };
  const permittedModel = { model: { id: 'org-model', consumesCredits: true } };

  function answer(text: string) {
    return {
      content: [new TextMessageContent(text)],
      meta: { inputTokens: 120, outputTokens: 30 },
    };
  }

  async function setup(
    values: Record<string, unknown> = { ...aUserContext({ userId, orgId }) },
  ) {
    getInference = {
      execute: jest
        .fn()
        .mockResolvedValue(answer('Wenn es um Fristen bei Bauanträgen geht.')),
    };
    modelResolver = { resolve: jest.fn().mockResolvedValue(permittedModel) };
    admissionGuard = {
      preflight: jest.fn().mockResolvedValue(undefined),
      ensureModelCallAllowed: jest.fn().mockResolvedValue(undefined),
    };
    collectUsage = { collectCritical: jest.fn().mockResolvedValue(undefined) };
    incrementTrialMessages = {
      execute: jest.fn().mockResolvedValue(undefined),
    };
    const module = await Test.createTestingModule({
      providers: [
        ImproveSkillTextUseCase,
        GetInferenceUseCase,
        {
          provide: InferenceHandlerRegistry,
          useValue: {
            getHandler: () => ({ answer: getInference.execute }),
          },
        },
        { provide: SkillTextModelResolver, useValue: modelResolver },
        { provide: InferenceAdmissionGuard, useValue: admissionGuard },
        { provide: CollectUsageAsyncService, useValue: collectUsage },
        {
          provide: IncrementTrialMessagesUseCase,
          useValue: incrementTrialMessages,
        },
        {
          provide: ContextService,
          useValue: { get: (key: string) => values[key] },
        },
      ],
    }).compile();
    useCase = module.get(ImproveSkillTextUseCase);
  }

  beforeEach(async () => {
    await setup();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  function aCommand(
    field = SkillTextField.TRIGGER,
    consumeTrialMessage = false,
  ) {
    return new ImproveSkillTextCommand({
      field,
      name: 'Fristenprüfung',
      trigger: 'Immer wenn relevant',
      instructions: 'Prüfe die Fristen im Bauantrag.',
      consumeTrialMessage,
    });
  }

  it('returns the rewritten text for the requested field', async () => {
    await expect(useCase.execute(aCommand())).resolves.toBe(
      'Wenn es um Fristen bei Bauanträgen geht.',
    );
  });

  it('shows the model both texts so each can inform the other', async () => {
    await useCase.execute(aCommand(SkillTextField.INSTRUCTIONS));

    const prompt = getInference.execute.mock.calls[0][0].messages[0].content[0]
      .text as string;

    expect(prompt).toContain('Immer wenn relevant');
    expect(prompt).toContain('Prüfe die Fristen im Bauantrag.');
    expect(prompt).toContain('INSTRUCTIONS');
  });

  it('calls the model the resolver picked for the caller', async () => {
    await useCase.execute(aCommand());

    expect(modelResolver.resolve).toHaveBeenCalledWith(orgId, userId);
    expect(getInference.execute.mock.calls[0][0].model).toBe(
      permittedModel.model,
    );
  });

  it('checks the caller’s usage limits before calling the model', async () => {
    await useCase.execute(aCommand());

    const principal = { userId, orgId };
    expect(admissionGuard.preflight).toHaveBeenCalledWith(
      principal,
      permittedModel.model,
    );
    expect(admissionGuard.ensureModelCallAllowed).toHaveBeenCalledWith(
      principal,
      permittedModel.model,
    );
  });

  it('does not call the model when the caller is over a limit', async () => {
    admissionGuard.preflight.mockRejectedValue(
      new QuotaExceededError('FAIR_USE_MESSAGES_MEDIUM', 10, 3_600_000, 60),
    );

    await expect(useCase.execute(aCommand())).rejects.toThrow(
      QuotaExceededError,
    );
    expect(getInference.execute).not.toHaveBeenCalled();
  });

  it('counts the tokens the rewrite used', async () => {
    await useCase.execute(aCommand());

    expect(collectUsage.collectCritical).toHaveBeenCalledWith(
      permittedModel.model,
      120,
      30,
    );
  });

  it('drops quotes the model wrapped around a single sentence', async () => {
    getInference.execute.mockResolvedValue(
      answer('"Wenn eine Frist genannt wird."'),
    );

    await expect(useCase.execute(aCommand())).resolves.toBe(
      'Wenn eine Frist genannt wird.',
    );
  });

  it('reports an empty answer instead of clearing the field', async () => {
    getInference.execute.mockResolvedValue({
      content: [],
      meta: { inputTokens: 5, outputTokens: 0 },
    });

    await expect(useCase.execute(aCommand())).rejects.toThrow(
      SkillTextImprovementFailedError,
    );
  });

  it('reports an answer of only quotes instead of clearing the field', async () => {
    getInference.execute.mockResolvedValue(answer('" "'));

    await expect(useCase.execute(aCommand())).rejects.toThrow(
      SkillTextImprovementFailedError,
    );
  });

  it('keeps quoted keywords inside the rewritten text', async () => {
    getInference.execute.mockResolvedValue(answer('"Frist" oder "Termin"'));

    await expect(useCase.execute(aCommand())).resolves.toBe(
      '"Frist" oder "Termin"',
    );
  });

  it('drops typographic quotes the model wrapped around the answer', async () => {
    getInference.execute.mockResolvedValue(
      answer('“Wenn eine Frist genannt wird.”'),
    );

    await expect(useCase.execute(aCommand())).resolves.toBe(
      'Wenn eine Frist genannt wird.',
    );
  });

  it('drops the wrapping around an answer that contains an apostrophe', async () => {
    getInference.execute.mockResolvedValue(
      answer('"Geht\'s um Fristen im Bauantrag."'),
    );

    await expect(useCase.execute(aCommand())).resolves.toBe(
      "Geht's um Fristen im Bauantrag.",
    );
  });

  it('leaves a mismatched quote pair alone', async () => {
    const mismatched = `"Wenn eine Frist genannt wird.'`;
    getInference.execute.mockResolvedValue(answer(mismatched));

    await expect(useCase.execute(aCommand())).resolves.toBe(mismatched);
  });

  it('fails the rewrite when a paid model reports no usage', async () => {
    getInference.execute.mockResolvedValue({
      content: [new TextMessageContent('Wenn Fristen genannt werden.')],
      meta: {},
    });

    await expect(useCase.execute(aCommand())).rejects.toThrow(
      SkillTextImprovementFailedError,
    );
    expect(collectUsage.collectCritical).not.toHaveBeenCalled();
  });

  it('returns the rewrite of a free model that reports no usage', async () => {
    modelResolver.resolve.mockResolvedValue({
      model: { id: 'free-model', consumesCredits: false },
    });
    getInference.execute.mockResolvedValue({
      content: [new TextMessageContent('Wenn Fristen genannt werden.')],
      meta: {},
    });

    await expect(useCase.execute(aCommand())).resolves.toBe(
      'Wenn Fristen genannt werden.',
    );
    expect(collectUsage.collectCritical).not.toHaveBeenCalled();
  });

  it('does not hand out the rewrite when usage persistence fails', async () => {
    collectUsage.collectCritical.mockRejectedValue(
      new Error('usage database unavailable'),
    );

    await expect(useCase.execute(aCommand())).rejects.toThrow(
      UnexpectedSkillError,
    );
  });

  it('rejects an unauthenticated caller', async () => {
    await setup({});

    await expect(useCase.execute(aCommand())).rejects.toThrow(
      UnauthorizedAccessError,
    );
  });
});

describe('ImproveSkillTextUseCase trial accounting', () => {
  const userId = randomUUID();
  const orgId = randomUUID();
  let useCase: ImproveSkillTextUseCase;
  let getInference: { execute: jest.Mock };
  let admissionGuard: {
    preflight: jest.Mock;
    ensureModelCallAllowed: jest.Mock;
  };
  let incrementTrialMessages: { execute: jest.Mock };

  beforeEach(async () => {
    getInference = {
      execute: jest.fn().mockResolvedValue({
        content: [new TextMessageContent('Wenn Fristen genannt werden.')],
        meta: { inputTokens: 1, outputTokens: 1 },
      }),
    };
    admissionGuard = {
      preflight: jest.fn().mockResolvedValue(undefined),
      ensureModelCallAllowed: jest.fn().mockResolvedValue(undefined),
    };
    incrementTrialMessages = {
      execute: jest.fn().mockResolvedValue(undefined),
    };
    const module = await Test.createTestingModule({
      providers: [
        ImproveSkillTextUseCase,
        GetInferenceUseCase,
        {
          provide: InferenceHandlerRegistry,
          useValue: {
            getHandler: () => ({ answer: getInference.execute }),
          },
        },
        {
          provide: SkillTextModelResolver,
          useValue: {
            resolve: jest.fn().mockResolvedValue({ model: { id: 'm' } }),
          },
        },
        { provide: InferenceAdmissionGuard, useValue: admissionGuard },
        {
          provide: CollectUsageAsyncService,
          useValue: { collectCritical: jest.fn().mockResolvedValue(undefined) },
        },
        {
          provide: IncrementTrialMessagesUseCase,
          useValue: incrementTrialMessages,
        },
        {
          provide: ContextService,
          useValue: { get: getFromUserContext({ userId, orgId }) },
        },
      ],
    }).compile();
    useCase = module.get(ImproveSkillTextUseCase);
  });

  function aCommand(consumeTrialMessage: boolean) {
    return new ImproveSkillTextCommand({
      field: SkillTextField.TRIGGER,
      trigger: 'Immer wenn relevant',
      instructions: 'Prüfe die Fristen.',
      consumeTrialMessage,
    });
  }

  it('consumes a trial message when the caller was admitted on trial capacity', async () => {
    await useCase.execute(aCommand(true));

    expect(incrementTrialMessages.execute).toHaveBeenCalledTimes(1);
    expect(incrementTrialMessages.execute.mock.calls[0][0]).toMatchObject({
      orgId,
    });
    expect(
      incrementTrialMessages.execute.mock.invocationCallOrder[0],
    ).toBeLessThan(getInference.execute.mock.invocationCallOrder[0]);
  });

  it('leaves the trial counter alone for subscribed callers', async () => {
    await useCase.execute(aCommand(false));

    expect(incrementTrialMessages.execute).not.toHaveBeenCalled();
  });

  it('does not consume a trial message when the caller is over a limit', async () => {
    admissionGuard.preflight.mockRejectedValue(
      new QuotaExceededError('FAIR_USE_MESSAGES_MEDIUM', 10, 3_600_000, 60),
    );

    await expect(useCase.execute(aCommand(true))).rejects.toThrow(
      QuotaExceededError,
    );
    expect(incrementTrialMessages.execute).not.toHaveBeenCalled();
  });

  it('still returns the rewrite when trial accounting fails', async () => {
    incrementTrialMessages.execute.mockRejectedValue(
      new Error('trial store unavailable'),
    );

    await expect(useCase.execute(aCommand(true))).resolves.toBe(
      'Wenn Fristen genannt werden.',
    );
  });
});

describe('ImproveSkillTextUseCase with real inference accounting', () => {
  it('records consumed tokens even when a truncated rewrite is rejected', async () => {
    const orgId = randomUUID();
    const userId = randomUUID();
    const model = {
      id: randomUUID(),
      name: 'municipal-assistant',
      consumesCredits: true,
    };
    const charges: Array<{ inputTokens: number; outputTokens: number }> = [];
    const module = await Test.createTestingModule({
      providers: [
        ImproveSkillTextUseCase,
        GetInferenceUseCase,
        {
          provide: SkillTextModelResolver,
          useValue: { resolve: async () => ({ model }) },
        },
        {
          provide: InferenceAdmissionGuard,
          useValue: {
            preflight: async () => undefined,
            ensureModelCallAllowed: async () => undefined,
          },
        },
        {
          provide: CollectUsageAsyncService,
          useValue: {
            collectCritical: async (
              _model: unknown,
              inputTokens: number,
              outputTokens: number,
            ) => {
              charges.push({ inputTokens, outputTokens });
            },
          },
        },
        {
          provide: IncrementTrialMessagesUseCase,
          useValue: { execute: async () => undefined },
        },
        {
          provide: ContextService,
          useValue: { get: getFromUserContext({ userId, orgId }) },
        },
        {
          provide: InferenceHandlerRegistry,
          useValue: {
            getHandler: () => ({
              answer: async () => ({
                content: [new TextMessageContent('Prüfe zuerst die')],
                meta: { inputTokens: 500, outputTokens: 1024 },
                finishReason: 'length',
              }),
            }),
          },
        },
      ],
    }).compile();

    await expect(
      module.get(ImproveSkillTextUseCase).execute(
        new ImproveSkillTextCommand({
          field: SkillTextField.INSTRUCTIONS,
          trigger: 'Bei Bauanträgen',
          instructions: 'Prüfe die Vollständigkeit.',
          consumeTrialMessage: false,
        }),
      ),
    ).rejects.toThrow(InferenceFailedError);
    expect(charges).toEqual([{ inputTokens: 500, outputTokens: 1024 }]);
  });
});
