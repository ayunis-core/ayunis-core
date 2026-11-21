import type { ConfigService } from '@nestjs/config';
import {
  createMockContextService,
  TEST_ORG_ID,
  TEST_USER_ID,
} from 'src/common/context/testing/context.fixtures';
import type { FindUserMemoryUseCase } from 'src/domain/memory/application/use-cases/find-user-memory/find-user-memory.use-case';
import { MemoryEntry } from 'src/domain/memory/domain/memory-entry.entity';
import type { GetDefaultModelUseCase } from 'src/domain/models/application/use-cases/get-default-model/get-default-model.use-case';
import type { GetEffectiveLanguageModelsUseCase } from 'src/domain/models/application/use-cases/get-effective-language-models/get-effective-language-models.use-case';
import { LanguageModel } from 'src/domain/models/domain/models/language.model';
import { PermittedLanguageModel } from 'src/domain/models/domain/permitted-model.entity';
import { ModelProvider } from 'src/domain/models/domain/value-objects/model-provider.enum';
import type { HasPersonalSkillUseCase } from 'src/domain/skills/application/use-cases/has-personal-skill/has-personal-skill.use-case';
import type { HasPermissionUseCase } from 'src/iam/permissions/application/use-cases/has-permission/has-permission.use-case';
import { GetOnboardingStageUseCase } from './get-onboarding-stage.use-case';

function permit(
  name: string,
  {
    canUseTools = true,
    ...policy
  }: {
    memoryAccess?: boolean;
    anonymousOnly?: boolean;
    canUseTools?: boolean;
  } = {},
): PermittedLanguageModel {
  return new PermittedLanguageModel({
    model: new LanguageModel({
      name,
      displayName: name,
      provider: ModelProvider.MISTRAL,
      canStream: true,
      canUseTools,
      isReasoning: false,
      isArchived: false,
      canVision: false,
      contextWindowSize: 128_000,
    }),
    orgId: TEST_ORG_ID,
    ...policy,
  });
}

function memory(key: string, content: string): MemoryEntry {
  return new MemoryEntry({ userId: TEST_USER_ID, key, content });
}

const PERSONAL = memory(
  'personal',
  'Sachbearbeiterin im Bauamt der Stadt Musterstadt',
);

function setup(
  options: {
    memoryEnabled?: boolean;
    entries?: MemoryEntry[];
    models?: PermittedLanguageModel[];
    defaultModel?: PermittedLanguageModel;
    ownsPersonalSkill?: boolean;
    mayManageSkills?: boolean;
  } = {},
) {
  const models = options.models ?? [];
  const useCase = new GetOnboardingStageUseCase(
    { get: () => options.memoryEnabled ?? true } as unknown as ConfigService,
    createMockContextService(),
    {
      execute: jest.fn().mockResolvedValue(options.entries ?? []),
    } as unknown as FindUserMemoryUseCase,
    {
      execute: jest.fn().mockResolvedValue({ models, overrideTeamIds: [] }),
    } as unknown as GetEffectiveLanguageModelsUseCase,
    {
      execute: jest.fn().mockResolvedValue(options.defaultModel ?? models[0]),
    } as unknown as GetDefaultModelUseCase,
    {
      execute: jest.fn().mockResolvedValue(options.ownsPersonalSkill ?? false),
    } as unknown as HasPersonalSkillUseCase,
    {
      execute: jest.fn().mockResolvedValue(options.mayManageSkills ?? true),
    } as unknown as HasPermissionUseCase,
  );
  return useCase.execute();
}

describe('GetOnboardingStageUseCase', () => {
  describe('without personal memory', () => {
    it('offers the profile chat on the default model when it has memory', async () => {
      const defaultModel = permit('mistral-large', { memoryAccess: true });
      const other = permit('gpt-4o', { memoryAccess: true });

      await expect(
        setup({
          entries: [memory('preferences', 'Bitte duzen')],
          models: [other, defaultModel],
          defaultModel,
        }),
      ).resolves.toEqual({ stage: 'profile', modelId: defaultModel.id });
    });

    it('offers the profile chat on a model with memory when the default has none', async () => {
      const defaultModel = permit('mistral-large');
      const withMemory = permit('gpt-4o', { memoryAccess: true });

      await expect(
        setup({ models: [defaultModel, withMemory], defaultModel }),
      ).resolves.toEqual({ stage: 'profile', modelId: withMemory.id });
    });

    it('offers the profile chat on a model with tools when the default has memory but no tools', async () => {
      const defaultModel = permit('mistral-large', {
        memoryAccess: true,
        canUseTools: false,
      });
      const withTools = permit('gpt-4o', { memoryAccess: true });

      await expect(
        setup({ models: [defaultModel, withTools], defaultModel }),
      ).resolves.toEqual({ stage: 'profile', modelId: withTools.id });
    });

    it('offers no hint when the only models with memory cannot use tools', async () => {
      await expect(
        setup({
          models: [
            permit('mistral-large', { memoryAccess: true, canUseTools: false }),
            permit('gpt-4o'),
          ],
        }),
      ).resolves.toEqual({ stage: null, modelId: null });
    });

    it('offers no hint when no model has memory', async () => {
      await expect(
        setup({ models: [permit('mistral-large')] }),
      ).resolves.toEqual({ stage: null, modelId: null });
    });

    it('offers no hint when the only model with memory access is forced into anonymous mode', async () => {
      await expect(
        setup({
          models: [
            permit('mistral-large', {
              memoryAccess: true,
              anonymousOnly: true,
            }),
          ],
        }),
      ).resolves.toEqual({ stage: null, modelId: null });
    });
  });

  describe('with personal memory', () => {
    it('offers the first-skill chat to a user without a personal skill who may create one', async () => {
      await expect(
        setup({
          entries: [PERSONAL],
          ownsPersonalSkill: false,
          mayManageSkills: true,
        }),
      ).resolves.toEqual({ stage: 'first_skill', modelId: null });
    });

    it('offers no hint once the user owns a personal skill', async () => {
      await expect(
        setup({ entries: [PERSONAL], ownsPersonalSkill: true }),
      ).resolves.toEqual({ stage: null, modelId: null });
    });

    it('offers no hint to a user without manage_skills', async () => {
      await expect(
        setup({ entries: [PERSONAL], mayManageSkills: false }),
      ).resolves.toEqual({ stage: null, modelId: null });
    });
  });

  it('offers no hint while memory is disabled', async () => {
    await expect(
      setup({
        memoryEnabled: false,
        models: [permit('mistral-large', { memoryAccess: true })],
      }),
    ).resolves.toEqual({ stage: null, modelId: null });
  });
});
