import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { Mistral } from '@mistralai/mistralai';
import { RequestTimeoutError } from '@mistralai/mistralai/models/errors';
import { MistralEmbeddingsHandler } from './mistral-embeddings.handler';
import { EmbeddingModel } from '../../domain/embedding-model.entity';
import { ModelProvider } from 'src/domain/models/domain/value-objects/model-provider.enum';
import { EmbeddingDimensions } from 'src/domain/models/domain/value-objects/embedding-dimensions.enum';

jest.mock('@mistralai/mistralai', () => ({
  Mistral: jest.fn().mockImplementation(() => ({
    embeddings: { create: jest.fn() },
  })),
}));

const retryCalls: Array<{
  fn: () => Promise<unknown>;
  retryIfError?: (error: Error) => boolean;
}> = [];
jest.mock('src/common/util/retryWithBackoff', () => ({
  __esModule: true,
  default: (options: {
    fn: () => Promise<unknown>;
    retryIfError?: (error: Error) => boolean;
  }) => {
    retryCalls.push(options);
    return options.fn();
  },
}));

describe('MistralEmbeddingsHandler', () => {
  let handler: MistralEmbeddingsHandler;

  const model = new EmbeddingModel({
    name: 'mistral-embed',
    provider: ModelProvider.MISTRAL,
    displayName: 'Mistral Embed',
    dimensions: EmbeddingDimensions.DIMENSION_1024,
    isArchived: false,
  });

  beforeEach(async () => {
    retryCalls.length = 0;
    (Mistral as unknown as jest.Mock).mockClear();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MistralEmbeddingsHandler,
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue('mistral-api-key') },
        },
      ],
    }).compile();

    handler = module.get(MistralEmbeddingsHandler);
  });

  it('bounds each embeddings attempt with a 30s timeout', () => {
    expect(Mistral).toHaveBeenCalledWith(
      expect.objectContaining({ timeoutMs: 30_000 }),
    );
  });

  it('retries client-side timeouts instead of failing the run', async () => {
    const client = (Mistral as unknown as jest.Mock).mock.results[0].value as {
      embeddings: { create: jest.Mock };
    };
    client.embeddings.create.mockResolvedValue({
      data: [{ embedding: [0.1, 0.2], index: 0 }],
    });

    await handler.embed(
      ['Wie beantrage ich einen Anwohnerparkausweis?'],
      model,
    );

    expect(retryCalls).toHaveLength(1);
    const { retryIfError } = retryCalls[0];
    expect(retryIfError?.(new RequestTimeoutError('request timed out'))).toBe(
      true,
    );
    expect(retryIfError?.(new Error('schema validation failed'))).toBe(false);
  });
});
