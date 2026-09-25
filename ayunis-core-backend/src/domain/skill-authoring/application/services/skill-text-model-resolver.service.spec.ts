import { Test } from '@nestjs/testing';
import { randomUUID } from 'crypto';
import { GetDefaultModelUseCase } from 'src/domain/models/application/use-cases/get-default-model/get-default-model.use-case';
import { GetEffectiveLanguageModelsUseCase } from 'src/domain/models/application/use-cases/get-effective-language-models/get-effective-language-models.use-case';
import { GetOrgDefaultModelUseCase } from 'src/domain/models/application/use-cases/get-org-default-model/get-org-default-model.use-case';
import { SkillTextImprovementUnavailableError } from 'src/domain/skill-authoring/application/skill-authoring.errors';
import { SkillTextModelResolver } from './skill-text-model-resolver.service';

function aPermittedModel(id: string, anonymousOnly = false) {
  return { model: { id }, anonymousOnly };
}

describe('SkillTextModelResolver', () => {
  const userId = randomUUID();
  const orgId = randomUUID();
  let resolver: SkillTextModelResolver;
  let getDefaultModel: { execute: jest.Mock };
  let getOrgDefaultModel: { execute: jest.Mock };
  let getEffectiveModels: { execute: jest.Mock };
  const orgModel = aPermittedModel('org-model');
  const fallbackModel = aPermittedModel('fallback-model');

  beforeEach(async () => {
    getDefaultModel = { execute: jest.fn().mockResolvedValue(fallbackModel) };
    getOrgDefaultModel = { execute: jest.fn().mockResolvedValue(orgModel) };
    getEffectiveModels = {
      execute: jest
        .fn()
        .mockResolvedValue({ models: [orgModel, fallbackModel] }),
    };
    const module = await Test.createTestingModule({
      providers: [
        SkillTextModelResolver,
        { provide: GetDefaultModelUseCase, useValue: getDefaultModel },
        { provide: GetOrgDefaultModelUseCase, useValue: getOrgDefaultModel },
        {
          provide: GetEffectiveLanguageModelsUseCase,
          useValue: getEffectiveModels,
        },
      ],
    }).compile();
    resolver = module.get(SkillTextModelResolver);
  });

  it('uses the organization default model', async () => {
    await expect(resolver.resolve(orgId, userId)).resolves.toBe(orgModel);
  });

  it('falls back to the caller’s default when the organization has none', async () => {
    getOrgDefaultModel.execute.mockResolvedValue(null);

    await expect(resolver.resolve(orgId, userId)).resolves.toBe(fallbackModel);
    expect(getDefaultModel.execute).toHaveBeenCalledWith(
      expect.objectContaining({ orgId, userId }),
    );
  });

  it('skips the organization default when the caller may not use it', async () => {
    getEffectiveModels.execute.mockResolvedValue({ models: [fallbackModel] });

    await expect(resolver.resolve(orgId, userId)).resolves.toBe(fallbackModel);
  });

  it('never sends skill drafts to an anonymous-only model', async () => {
    const anonymousOrgModel = aPermittedModel('org-model', true);
    const anonymousFallback = aPermittedModel('fallback-model', true);
    const openModel = aPermittedModel('open-model');
    getOrgDefaultModel.execute.mockResolvedValue(anonymousOrgModel);
    getDefaultModel.execute.mockResolvedValue(anonymousFallback);
    getEffectiveModels.execute.mockResolvedValue({
      models: [anonymousOrgModel, anonymousFallback, openModel],
    });

    await expect(resolver.resolve(orgId, userId)).resolves.toBe(openModel);
  });

  it('refuses when every permitted model is anonymous-only', async () => {
    const anonymousOrgModel = aPermittedModel('org-model', true);
    getOrgDefaultModel.execute.mockResolvedValue(anonymousOrgModel);
    getDefaultModel.execute.mockResolvedValue(anonymousOrgModel);
    getEffectiveModels.execute.mockResolvedValue({
      models: [anonymousOrgModel],
    });

    await expect(resolver.resolve(orgId, userId)).rejects.toThrow(
      SkillTextImprovementUnavailableError,
    );
  });
});
