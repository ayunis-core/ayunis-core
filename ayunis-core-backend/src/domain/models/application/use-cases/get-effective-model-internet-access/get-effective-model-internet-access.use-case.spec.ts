import { LanguageModel } from 'src/domain/models/domain/models/language.model';
import { PermittedLanguageModel } from 'src/domain/models/domain/permitted-model.entity';
import { ModelProvider } from 'src/domain/models/domain/value-objects/model-provider.enum';
import { PermittedModelScope } from 'src/domain/models/domain/value-objects/permitted-model-scope.enum';
import type { PermittedModelsRepository } from '../../ports/permitted-models.repository';
import { GetEffectiveModelInternetAccessQuery } from './get-effective-model-internet-access.query';
import { GetEffectiveModelInternetAccessUseCase } from './get-effective-model-internet-access.use-case';

const orgId = '123e4567-e89b-12d3-a456-426614174000';
const model = new LanguageModel({
  id: '123e4567-e89b-12d3-a456-426614174001',
  name: 'gpt-5.4',
  provider: ModelProvider.AZURE,
  displayName: 'GPT 5.4',
  canStream: true,
  canUseTools: true,
  isReasoning: false,
  canVision: true,
  isArchived: false,
});

function orgPermit(enabled: boolean): PermittedLanguageModel {
  return new PermittedLanguageModel({
    model,
    orgId,
    internetAccessEnabled: enabled,
  });
}

function teamPermit(enabled: boolean): PermittedLanguageModel {
  return new PermittedLanguageModel({
    model,
    orgId,
    scope: PermittedModelScope.TEAM,
    scopeId: '123e4567-e89b-12d3-a456-426614174002',
    internetAccessEnabled: enabled,
  });
}

describe('GetEffectiveModelInternetAccessUseCase', () => {
  let repository: jest.Mocked<PermittedModelsRepository>;
  let useCase: GetEffectiveModelInternetAccessUseCase;

  beforeEach(() => {
    repository = {
      findAll: jest.fn(),
    } as unknown as jest.Mocked<PermittedModelsRepository>;
    useCase = new GetEffectiveModelInternetAccessUseCase(repository);
  });

  it.each([
    [true, true],
    [false, false],
  ])('returns %s for an organization permit set to %s', async (enabled) => {
    await expect(
      useCase.execute(
        new GetEffectiveModelInternetAccessQuery(orgPermit(enabled)),
      ),
    ).resolves.toBe(enabled);
    expect(repository.findAll).not.toHaveBeenCalled();
  });

  it.each([
    [true, true, true],
    [false, true, false],
    [true, false, false],
    [false, false, false],
  ])(
    'combines team policy %s with organization model policy %s as %s',
    async (teamEnabled, orgEnabled, expected) => {
      repository.findAll.mockResolvedValue([orgPermit(orgEnabled)]);

      await expect(
        useCase.execute(
          new GetEffectiveModelInternetAccessQuery(teamPermit(teamEnabled)),
        ),
      ).resolves.toBe(expected);
    },
  );

  it('fails closed when a team permit has no organization counterpart', async () => {
    repository.findAll.mockResolvedValue([]);

    await expect(
      useCase.execute(
        new GetEffectiveModelInternetAccessQuery(teamPermit(true)),
      ),
    ).resolves.toBe(false);
  });
});
