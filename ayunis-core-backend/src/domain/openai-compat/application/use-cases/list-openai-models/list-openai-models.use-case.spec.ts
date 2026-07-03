import { randomUUID } from 'crypto';
import { ListOpenAIModelsUseCase } from './list-openai-models.use-case';
import { ListOpenAIModelsQuery } from './list-openai-models.query';
import type { GetPermittedLanguageModelsUseCase } from 'src/domain/models/application/use-cases/get-permitted-language-models/get-permitted-language-models.use-case';
import { LanguageModel } from 'src/domain/models/domain/models/language.model';
import { PermittedLanguageModel } from 'src/domain/models/domain/permitted-model.entity';
import { ModelProvider } from 'src/domain/models/domain/value-objects/model-provider.enum';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { OpenAIUnexpectedError } from '../../openai-compat.errors';
import { OpenAIModelMapper } from '../../mappers/openai-model.mapper';

describe('ListOpenAIModelsUseCase', () => {
  let useCase: ListOpenAIModelsUseCase;
  let getPermittedLanguageModelsUseCase: jest.Mocked<GetPermittedLanguageModelsUseCase>;

  const orgId = randomUUID();

  const buildModel = (
    overrides?: Partial<ConstructorParameters<typeof LanguageModel>[0]>,
  ): LanguageModel =>
    new LanguageModel({
      name: 'gpt-4o',
      provider: ModelProvider.OPENAI,
      displayName: 'GPT-4o',
      canStream: true,
      canUseTools: true,
      isReasoning: false,
      canVision: false,
      isArchived: false,
      ...overrides,
    });

  const permit = (model: LanguageModel): PermittedLanguageModel =>
    new PermittedLanguageModel({ model, orgId });

  beforeEach(() => {
    getPermittedLanguageModelsUseCase = {
      execute: jest.fn().mockResolvedValue([]),
    } as unknown as jest.Mocked<GetPermittedLanguageModelsUseCase>;

    useCase = new ListOpenAIModelsUseCase(
      getPermittedLanguageModelsUseCase,
      new OpenAIModelMapper(),
    );
  });

  it('returns permitted models mapped to the OpenAI list shape', async () => {
    const createdAt = new Date('2025-06-01T00:00:00Z');
    getPermittedLanguageModelsUseCase.execute.mockResolvedValue([
      permit(buildModel({ createdAt })),
      permit(
        buildModel({
          name: 'claude-sonnet',
          provider: ModelProvider.ANTHROPIC,
        }),
      ),
    ]);

    const result = await useCase.execute(new ListOpenAIModelsQuery(orgId));

    expect(result.object).toBe('list');
    expect(result.data).toHaveLength(2);
    expect(result.data[0]).toEqual({
      id: 'gpt-4o',
      object: 'model',
      created: Math.floor(createdAt.getTime() / 1000),
      owned_by: ModelProvider.OPENAI,
    });
    expect(result.data[1].id).toBe('claude-sonnet');
    expect(result.data[1].owned_by).toBe(ModelProvider.ANTHROPIC);
  });

  it('returns an empty list when no models are permitted', async () => {
    const result = await useCase.execute(new ListOpenAIModelsQuery(orgId));

    expect(result).toEqual({ object: 'list', data: [] });
  });

  it('dedupes models sharing a name, keeping the first occurrence', async () => {
    getPermittedLanguageModelsUseCase.execute.mockResolvedValue([
      permit(buildModel({ name: 'shared', provider: ModelProvider.OPENAI })),
      permit(buildModel({ name: 'shared', provider: ModelProvider.AZURE })),
    ]);

    const result = await useCase.execute(new ListOpenAIModelsQuery(orgId));

    expect(result.data).toHaveLength(1);
    expect(result.data[0].owned_by).toBe(ModelProvider.OPENAI);
  });

  it('rethrows ApplicationError subclasses unchanged', async () => {
    getPermittedLanguageModelsUseCase.execute.mockRejectedValue(
      new UnauthorizedAccessError(),
    );

    await expect(
      useCase.execute(new ListOpenAIModelsQuery(orgId)),
    ).rejects.toThrow(UnauthorizedAccessError);
  });

  it('wraps unexpected errors in OpenAIUnexpectedError', async () => {
    getPermittedLanguageModelsUseCase.execute.mockRejectedValue(
      new Error('db down'),
    );

    await expect(
      useCase.execute(new ListOpenAIModelsQuery(orgId)),
    ).rejects.toThrow(OpenAIUnexpectedError);
  });
});
