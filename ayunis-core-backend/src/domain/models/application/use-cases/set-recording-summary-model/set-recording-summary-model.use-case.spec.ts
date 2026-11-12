import { randomUUID } from 'crypto';
import type { UUID } from 'crypto';
import type { ContextService } from 'src/common/context/services/context.service';
import { PermittedModelNotFoundError } from 'src/domain/models/application/models.errors';
import type { PermittedModelsRepository } from 'src/domain/models/application/ports/permitted-models.repository';
import { AnonymousOnlySummaryModelError } from 'src/domain/models/application/recording-summary-model.errors';
import { LanguageModel } from 'src/domain/models/domain/models/language.model';
import { PermittedLanguageModel } from 'src/domain/models/domain/permitted-model.entity';
import { ModelProvider } from 'src/domain/models/domain/value-objects/model-provider.enum';
import { PermittedModelScope } from 'src/domain/models/domain/value-objects/permitted-model-scope.enum';
import { SetRecordingSummaryModelCommand } from './set-recording-summary-model.command';
import { SetRecordingSummaryModelUseCase } from './set-recording-summary-model.use-case';

const orgId = randomUUID();

function permit(
  overrides: { anonymousOnly?: boolean; teamId?: UUID } = {},
): PermittedLanguageModel {
  return new PermittedLanguageModel({
    model: new LanguageModel({
      name: 'mistral-large',
      displayName: 'Mistral Large',
      provider: ModelProvider.MISTRAL,
      canStream: true,
      isReasoning: false,
      isArchived: false,
      canUseTools: true,
      canVision: false,
      contextWindowSize: 128_000,
    }),
    orgId,
    scope: overrides.teamId
      ? PermittedModelScope.TEAM
      : PermittedModelScope.ORG,
    scopeId: overrides.teamId ?? null,
    anonymousOnly: overrides.anonymousOnly ?? false,
  });
}

describe('SetRecordingSummaryModelUseCase', () => {
  const findOneLanguage = jest.fn();
  const summaryModels = {
    find: jest.fn(),
    set: jest.fn(),
    clear: jest.fn(),
  };
  const useCase = new SetRecordingSummaryModelUseCase(
    { findOneLanguage } as unknown as PermittedModelsRepository,
    summaryModels,
    {
      get: jest.fn((key: string) => (key === 'orgId' ? orgId : undefined)),
    } as unknown as ContextService,
  );

  beforeEach(() => jest.clearAllMocks());

  it('stores an org-wide permitted model for the caller’s org', async () => {
    const selected = permit();
    findOneLanguage.mockResolvedValue(selected);

    await expect(
      useCase.execute(new SetRecordingSummaryModelCommand(selected.id)),
    ).resolves.toBe(selected);
    expect(findOneLanguage).toHaveBeenCalledWith({ id: selected.id, orgId });
    expect(summaryModels.set).toHaveBeenCalledWith(orgId, selected.id);
  });

  it.each([
    ['is not permitted in the caller’s org', null],
    ['is only granted to a team', permit({ teamId: randomUUID() })],
  ])('rejects a model that %s', async (_, found) => {
    findOneLanguage.mockResolvedValue(found);

    await expect(
      useCase.execute(new SetRecordingSummaryModelCommand(randomUUID())),
    ).rejects.toThrow(PermittedModelNotFoundError);
    expect(summaryModels.set).not.toHaveBeenCalled();
  });

  it('rejects an anonymous-only model, because transcripts are not anonymized', async () => {
    const anonymousOnly = permit({ anonymousOnly: true });
    findOneLanguage.mockResolvedValue(anonymousOnly);

    await expect(
      useCase.execute(new SetRecordingSummaryModelCommand(anonymousOnly.id)),
    ).rejects.toThrow(AnonymousOnlySummaryModelError);
    expect(summaryModels.set).not.toHaveBeenCalled();
  });

  it('clears the selection with null so the org default applies', async () => {
    await expect(
      useCase.execute(new SetRecordingSummaryModelCommand(null)),
    ).resolves.toBeNull();
    expect(summaryModels.clear).toHaveBeenCalledWith(orgId);
  });
});
