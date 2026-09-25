import { Test } from '@nestjs/testing';
import { randomUUID } from 'crypto';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { TextMessageContent } from 'src/domain/messages/domain/message-contents/text-message-content.entity';
import { GetDefaultModelUseCase } from 'src/domain/models/application/use-cases/get-default-model/get-default-model.use-case';
import { GetEffectiveLanguageModelsUseCase } from 'src/domain/models/application/use-cases/get-effective-language-models/get-effective-language-models.use-case';
import { GetOrgDefaultModelUseCase } from 'src/domain/models/application/use-cases/get-org-default-model/get-org-default-model.use-case';
import { GetInferenceUseCase } from 'src/domain/models/application/use-cases/get-inference/get-inference.use-case';
import { SkillTextImprovementFailedError } from 'src/domain/skills/application/skills.errors';
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
  let getDefaultModel: { execute: jest.Mock };
  let getOrgDefaultModel: { execute: jest.Mock };
  let getEffectiveModels: { execute: jest.Mock };
  const orgModel = { model: { id: 'org-model' } };
  const fallbackModel = { model: { id: 'fallback-model' } };

  async function setup(values: Record<string, unknown> = { userId, orgId }) {
    getInference = {
      execute: jest.fn().mockResolvedValue({
        content: [
          new TextMessageContent('Wenn es um Fristen bei Bauanträgen geht.'),
        ],
      }),
    };
    getDefaultModel = { execute: jest.fn().mockResolvedValue(fallbackModel) };
    getOrgDefaultModel = { execute: jest.fn().mockResolvedValue(orgModel) };
    getEffectiveModels = {
      execute: jest.fn().mockResolvedValue({ models: [orgModel] }),
    };
    const module = await Test.createTestingModule({
      providers: [
        ImproveSkillTextUseCase,
        { provide: GetInferenceUseCase, useValue: getInference },
        { provide: GetDefaultModelUseCase, useValue: getDefaultModel },
        { provide: GetOrgDefaultModelUseCase, useValue: getOrgDefaultModel },
        {
          provide: GetEffectiveLanguageModelsUseCase,
          useValue: getEffectiveModels,
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

  function usedModel() {
    return getInference.execute.mock.calls[0][0].model as { id: string };
  }

  it('uses the organization default model', async () => {
    await useCase.execute(aCommand());

    expect(usedModel()).toBe(orgModel.model);
    expect(getDefaultModel.execute).not.toHaveBeenCalled();
  });

  it('falls back to the caller’s default when the organization has none', async () => {
    getOrgDefaultModel.execute.mockResolvedValue(null);

    await useCase.execute(aCommand());

    expect(usedModel()).toBe(fallbackModel.model);
    expect(getDefaultModel.execute).toHaveBeenCalledWith(
      expect.objectContaining({ orgId, userId }),
    );
  });

  it('skips the organization default when the caller may not use it', async () => {
    getEffectiveModels.execute.mockResolvedValue({ models: [] });

    await useCase.execute(aCommand());

    expect(usedModel()).toBe(fallbackModel.model);
  });

  it('drops quotes the model wrapped around a single sentence', async () => {
    getInference.execute.mockResolvedValue({
      content: [new TextMessageContent('"Wenn eine Frist genannt wird."')],
    });

    await expect(useCase.execute(aCommand())).resolves.toBe(
      'Wenn eine Frist genannt wird.',
    );
  });

  it('reports an empty answer instead of clearing the field', async () => {
    getInference.execute.mockResolvedValue({ content: [] });

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
