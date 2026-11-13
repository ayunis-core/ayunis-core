import type { UUID } from 'crypto';
import { PrepareContentEmbeddingsUseCase } from './prepare-content-embeddings.use-case';
import { PrepareContentEmbeddingsCommand } from './prepare-content-embeddings.command';
import type { IndexRegistry } from 'src/domain/rag/indexers/application/indexer.registry';
import { UnexpectedIndexError } from 'src/domain/rag/indexers/application/indexer.errors';
import { IndexType } from 'src/domain/rag/indexers/domain/value-objects/index-type.enum';
import { ProviderTimeoutError } from 'src/common/errors/provider.errors';

const ORG_ID = '11111111-1111-1111-1111-111111111111' as UUID;

describe('PrepareContentEmbeddingsUseCase', () => {
  const indexer = { prepareEmbeddings: jest.fn() };
  const registry = { get: jest.fn().mockReturnValue(indexer) };
  const useCase = new PrepareContentEmbeddingsUseCase(
    registry as unknown as IndexRegistry,
  );
  const command = new PrepareContentEmbeddingsCommand({
    orgId: ORG_ID,
    contents: ['Haushalt', 'Satzung'],
    type: IndexType.PARENT_CHILD,
  });

  beforeEach(() => jest.clearAllMocks());

  it('passes a provider failure through and wraps anything unexpected', async () => {
    const timeout = new ProviderTimeoutError({ provider: 'mistral' });
    indexer.prepareEmbeddings.mockRejectedValueOnce(timeout);
    await expect(useCase.execute(command)).rejects.toBe(timeout);

    indexer.prepareEmbeddings.mockRejectedValueOnce(new Error('boom'));
    await expect(useCase.execute(command)).rejects.toBeInstanceOf(
      UnexpectedIndexError,
    );
  });
});
