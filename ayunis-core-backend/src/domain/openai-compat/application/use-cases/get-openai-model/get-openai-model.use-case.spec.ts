import { randomUUID } from 'crypto';
import { GetOpenAIModelUseCase } from './get-openai-model.use-case';
import { GetOpenAIModelQuery } from './get-openai-model.query';
import type { ListOpenAIModelsUseCase } from '../list-openai-models/list-openai-models.use-case';
import { OpenAIModelNotFoundError } from '../../openai-compat.errors';
import type { OpenAIModelObject } from '../../types/openai-model.types';

describe('GetOpenAIModelUseCase', () => {
  let useCase: GetOpenAIModelUseCase;
  let listOpenAIModelsUseCase: jest.Mocked<ListOpenAIModelsUseCase>;

  const orgId = randomUUID();

  const modelObject: OpenAIModelObject = {
    id: 'gpt-4o',
    object: 'model',
    created: 1_748_736_000,
    owned_by: 'openai',
  };

  beforeEach(() => {
    listOpenAIModelsUseCase = {
      execute: jest
        .fn()
        .mockResolvedValue({ object: 'list', data: [modelObject] }),
    } as unknown as jest.Mocked<ListOpenAIModelsUseCase>;

    useCase = new GetOpenAIModelUseCase(listOpenAIModelsUseCase);
  });

  it('returns the model object matching the requested name', async () => {
    const result = await useCase.execute(
      new GetOpenAIModelQuery(orgId, 'gpt-4o'),
    );

    expect(result).toEqual(modelObject);
  });

  it('throws OpenAIModelNotFoundError for an unknown model name', async () => {
    await expect(
      useCase.execute(new GetOpenAIModelQuery(orgId, 'does-not-exist')),
    ).rejects.toThrow(OpenAIModelNotFoundError);
  });
});
