import type { UUID } from 'crypto';
import { DeleteUnreferencedSourcesUseCase } from './delete-unreferenced-sources.use-case';
import { DeleteUnreferencedSourcesCommand } from './delete-unreferenced-sources.command';
import type { FindUnreferencedSourceIdsUseCase } from 'src/domain/sources/application/use-cases/find-unreferenced-source-ids/find-unreferenced-source-ids.use-case';
import type { DeleteSourcesUseCase } from 'src/domain/sources/application/use-cases/delete-sources/delete-sources.use-case';

describe(DeleteUnreferencedSourcesUseCase.name, () => {
  const orgId = '123e4567-e89b-12d3-a456-426614174002' as UUID;
  const kept = '00000000-0000-0000-0000-00000000000a' as UUID;
  const orphaned = '00000000-0000-0000-0000-00000000000b' as UUID;

  let findUnreferenced: { execute: jest.Mock };
  let deleteSources: { execute: jest.Mock };
  let useCase: DeleteUnreferencedSourcesUseCase;

  beforeEach(() => {
    findUnreferenced = { execute: jest.fn().mockResolvedValue([orphaned]) };
    deleteSources = { execute: jest.fn().mockResolvedValue(undefined) };
    useCase = new DeleteUnreferencedSourcesUseCase(
      findUnreferenced as unknown as FindUnreferencedSourceIdsUseCase,
      deleteSources as unknown as DeleteSourcesUseCase,
    );
  });

  it('deletes only the candidates no skill or knowledge base still references', async () => {
    const deleted = await useCase.execute(
      new DeleteUnreferencedSourcesCommand([kept, orphaned], orgId),
    );

    expect(findUnreferenced.execute).toHaveBeenCalledWith(
      expect.objectContaining({ candidateIds: [kept, orphaned] }),
    );
    expect(deleteSources.execute).toHaveBeenCalledWith(
      expect.objectContaining({ sourceIds: [orphaned], orgId }),
    );
    expect(deleted).toEqual([orphaned]);
  });

  it('does not touch the index when every candidate is still referenced', async () => {
    findUnreferenced.execute.mockResolvedValue([]);

    await expect(
      useCase.execute(new DeleteUnreferencedSourcesCommand([kept], orgId)),
    ).resolves.toEqual([]);
    expect(deleteSources.execute).not.toHaveBeenCalled();
  });

  it('skips the lookup for an empty candidate list', async () => {
    await expect(
      useCase.execute(new DeleteUnreferencedSourcesCommand([], orgId)),
    ).resolves.toEqual([]);
    expect(findUnreferenced.execute).not.toHaveBeenCalled();
  });
});
