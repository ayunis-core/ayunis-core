import { Test } from '@nestjs/testing';
import { randomUUID } from 'crypto';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { TextMessageContent } from 'src/domain/messages/domain/message-contents/text-message-content.entity';
import { GetInferenceUseCase } from 'src/domain/models/application/use-cases/get-inference/get-inference.use-case';
import { InferenceUsageGuard } from 'src/domain/runs/application/services/inference-usage-guard.service';
import { SkillTextModelResolver } from 'src/domain/skill-authoring/application/services/skill-text-model-resolver.service';
import { SkillTextImprovementFailedError } from 'src/domain/skill-authoring/application/skill-authoring.errors';
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
  let usageGuard: {
    preflight: jest.Mock;
    ensureModelCallAllowed: jest.Mock;
    collectUsage: jest.Mock;
  };
  const permittedModel = { model: { id: 'org-model' } };

  function answer(text: string) {
    return {
      content: [new TextMessageContent(text)],
      meta: { inputTokens: 120, outputTokens: 30 },
    };
  }

  async function setup(values: Record<string, unknown> = { userId, orgId }) {
    getInference = {
      execute: jest
        .fn()
        .mockResolvedValue(answer('Wenn es um Fristen bei Bauanträgen geht.')),
    };
    modelResolver = { resolve: jest.fn().mockResolvedValue(permittedModel) };
    usageGuard = {
      preflight: jest.fn().mockResolvedValue(undefined),
      ensureModelCallAllowed: jest.fn().mockResolvedValue(undefined),
      collectUsage: jest.fn(),
    };
    const module = await Test.createTestingModule({
      providers: [
        ImproveSkillTextUseCase,
        { provide: GetInferenceUseCase, useValue: getInference },
        { provide: SkillTextModelResolver, useValue: modelResolver },
        { provide: InferenceUsageGuard, useValue: usageGuard },
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

  function aCommand(field = SkillTextField.TRIGGER) {
    return new ImproveSkillTextCommand({
      field,
      name: 'Fristenprüfung',
      trigger: 'Immer wenn relevant',
      instructions: 'Prüfe die Fristen im Bauantrag.',
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
    expect(usageGuard.preflight).toHaveBeenCalledWith(
      principal,
      permittedModel.model,
    );
    expect(usageGuard.ensureModelCallAllowed).toHaveBeenCalledWith(
      principal,
      permittedModel.model,
    );
  });

  it('does not call the model when the caller is over a limit', async () => {
    usageGuard.preflight.mockRejectedValue(
      new QuotaExceededError('FAIR_USE_MESSAGES_MEDIUM', 10, 3_600_000, 60),
    );

    await expect(useCase.execute(aCommand())).rejects.toThrow(
      QuotaExceededError,
    );
    expect(getInference.execute).not.toHaveBeenCalled();
  });

  it('counts the tokens the rewrite used', async () => {
    await useCase.execute(aCommand());

    expect(usageGuard.collectUsage).toHaveBeenCalledWith(permittedModel.model, {
      inputTokens: 120,
      outputTokens: 30,
    });
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
    getInference.execute.mockResolvedValue({ content: [], meta: {} });

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

  it('rejects an unauthenticated caller', async () => {
    await setup({});

    await expect(useCase.execute(aCommand())).rejects.toThrow(
      UnauthorizedAccessError,
    );
  });
});
