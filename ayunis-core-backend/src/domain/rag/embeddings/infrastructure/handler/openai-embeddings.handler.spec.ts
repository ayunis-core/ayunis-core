import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { OpenAI } from 'openai';
import { OpenAIEmbeddingsHandler } from './openai-embeddings.handler';
import { EmbeddingModel } from '../../domain/embedding-model.entity';
import { ModelProvider } from 'src/domain/models/domain/value-objects/model-provider.enum';
import { EmbeddingDimensions } from 'src/domain/models/domain/value-objects/embedding-dimensions.enum';

jest.mock('openai', () => ({
  OpenAI: jest.fn().mockImplementation(() => ({
    embeddings: {
      create: jest
        .fn()
        .mockResolvedValue({ data: [{ embedding: [0.1], index: 0 }] }),
    },
  })),
}));

describe('OpenAIEmbeddingsHandler', () => {
  let handler: OpenAIEmbeddingsHandler;

  beforeEach(async () => {
    (OpenAI as unknown as jest.Mock).mockClear();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OpenAIEmbeddingsHandler,
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue('openai-api-key') },
        },
      ],
    }).compile();

    handler = module.get(OpenAIEmbeddingsHandler);
  });

  it('bounds each embeddings attempt with a 30s timeout', async () => {
    const model = new EmbeddingModel({
      name: 'text-embedding-3-small',
      provider: ModelProvider.OPENAI,
      displayName: 'Text Embedding 3 Small',
      dimensions: EmbeddingDimensions.DIMENSION_1536,
      isArchived: false,
    });

    await handler.embed(['Öffnungszeiten des Bürgeramts'], model);

    expect(OpenAI).toHaveBeenCalledWith(
      expect.objectContaining({ timeout: 30_000 }),
    );
  });
});
