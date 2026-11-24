import { ApplicationError } from 'src/common/errors/base.error';
import { EmbeddingModel } from 'src/domain/models/domain/models/embedding.model';
import type { GetModelByIdUseCase } from 'src/domain/models/application/use-cases/get-model-by-id/get-model-by-id.use-case';
import { EmbeddingDimensions } from 'src/domain/models/domain/value-objects/embedding-dimensions.enum';
import { ModelProvider } from 'src/domain/models/domain/value-objects/model-provider.enum';
import type { EmbedTextCommand } from 'src/domain/rag/embeddings/application/use-cases/embed-text/embed-text.command';
import type { EmbedTextUseCase } from 'src/domain/rag/embeddings/application/use-cases/embed-text/embed-text.use-case';
import { Embedding } from 'src/domain/rag/embeddings/domain/embedding.entity';
import type { GetOparlEmbeddingModelIdUseCase } from 'src/iam/platform-config/application/use-cases/get-oparl-embedding-model-id/get-oparl-embedding-model-id.use-case';
import type { OparlDocumentsRepository } from 'src/domain/oparl/application/ports/oparl-documents.repository';
import { OparlChunkEmbedder } from './oparl-chunk-embedder.service';

const BODY_ID = '9c2f4e1a-3b5d-4f6e-8a7b-1c2d3e4f5a6b';
const CHUNK = {
  id: '3e4f5a6b-7c8d-4e9f-a0b1-c2d3e4f5a6b7',
  text: 'Ausbau der Kindertagesstätte Michelbach',
};

const model = (id: string, name: string) =>
  new EmbeddingModel({
    id: id as EmbeddingModel['id'],
    name,
    displayName: name,
    provider: ModelProvider.MISTRAL,
    isArchived: false,
    dimensions: EmbeddingDimensions.DIMENSION_1024,
  });

class ProviderDownError extends ApplicationError {
  constructor() {
    super('Provider mistral is unavailable', 'PROVIDER_DOWN', 502);
  }
}

describe('OparlChunkEmbedder', () => {
  it('embeds with the model a super admin switched to while the previous one failed', async () => {
    const failing = model(
      '0b1c2d3e-4f5a-4b6c-8d7e-9f0a1b2c3d4e',
      'failing-embed',
    );
    const working = model(
      '5a6b7c8d-9e0f-4a1b-8c2d-3e4f5a6b7c8d',
      'mistral-embed',
    );
    let current = failing;
    const saved: string[] = [];
    const documents = {
      findChunksToEmbed: jest.fn((_body: string, modelId: string) =>
        Promise.resolve(saved.includes(modelId) ? [] : [CHUNK]),
      ),
      saveEmbeddings: jest.fn((modelId: string) => {
        saved.push(modelId);
        return Promise.resolve();
      }),
    };
    const embedText = {
      execute: jest.fn((command: EmbedTextCommand) => {
        if (command.model.id === failing.id) {
          current = working;
          return Promise.reject(new ProviderDownError());
        }
        return Promise.resolve([
          new Embedding(new Array<number>(1024).fill(0.1), CHUNK.text, working),
        ]);
      }),
    };
    const embedder = new OparlChunkEmbedder(
      documents as unknown as OparlDocumentsRepository,
      {
        execute: () => Promise.resolve(current.id),
      } as unknown as GetOparlEmbeddingModelIdUseCase,
      {
        execute: () => Promise.resolve(current),
      } as unknown as GetModelByIdUseCase,
      embedText as unknown as EmbedTextUseCase,
    );

    await expect(
      embedder.embed(
        [BODY_ID],
        Date.now() + 60_000,
        new AbortController().signal,
      ),
    ).resolves.toBe(true);

    expect(saved).toEqual([working.id]);
  });

  it('stops embedding with the previous model as soon as a super admin switches, instead of finishing the pass with it', async () => {
    const previous = model(
      '0b1c2d3e-4f5a-4b6c-8d7e-9f0a1b2c3d4e',
      'previous-embed',
    );
    const next = model('5a6b7c8d-9e0f-4a1b-8c2d-3e4f5a6b7c8d', 'mistral-embed');
    let current = previous;
    const batches = new Map<string, number>();
    const documents = {
      // Two batches left for each model.
      findChunksToEmbed: jest.fn((_body: string, modelId: string) =>
        Promise.resolve((batches.get(modelId) ?? 0) < 2 ? [CHUNK] : []),
      ),
      saveEmbeddings: jest.fn((modelId: string) => {
        batches.set(modelId, (batches.get(modelId) ?? 0) + 1);
        current = next;
        return Promise.resolve();
      }),
    };
    const embedText = {
      execute: jest.fn((command: EmbedTextCommand) =>
        Promise.resolve([
          new Embedding(
            new Array<number>(1024).fill(0.1),
            CHUNK.text,
            command.model,
          ),
        ]),
      ),
    };
    const embedder = new OparlChunkEmbedder(
      documents as unknown as OparlDocumentsRepository,
      {
        execute: () => Promise.resolve(current.id),
      } as unknown as GetOparlEmbeddingModelIdUseCase,
      {
        execute: () => Promise.resolve(current),
      } as unknown as GetModelByIdUseCase,
      embedText as unknown as EmbedTextUseCase,
    );

    await embedder.embed(
      [BODY_ID],
      Date.now() + 60_000,
      new AbortController().signal,
    );

    expect(Object.fromEntries(batches)).toEqual({
      [previous.id]: 1,
      [next.id]: 2,
    });
  });
});
