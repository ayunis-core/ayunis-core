import type { UUID } from 'crypto';
import type { OparlDocumentsRepository } from 'src/domain/oparl/application/ports/oparl-documents.repository';
import type { OparlSystemsRepository } from 'src/domain/oparl/application/ports/oparl-systems.repository';
import type { OparlChunkEmbedder } from 'src/domain/oparl/application/services/oparl-chunk-embedder.service';
import { SyncDueOparlSystemsUseCase } from './sync-due-oparl-systems.use-case';

const AARBERGEN = '4aa55908-4754-4d1f-87e6-051f4b2344cd' as UUID;
const KREFELD = 'd441befd-bb5c-4d8d-9363-09033489f35f' as UUID;
const MISTRAL_EMBED = '6e47e377-18d1-4db9-ae46-25c9b44a4fa1' as UUID;

function setup({
  due = [] as UUID[],
  withWork = [] as UUID[],
  runQueued = [] as UUID[],
} = {}) {
  const systems = { claimDue: jest.fn().mockResolvedValue(due) };
  const documents = {
    findSystemsWithDocumentWork: jest.fn().mockResolvedValue(withWork),
  };
  const embedder = {
    currentModel: jest.fn().mockResolvedValue({ id: MISTRAL_EMBED }),
  };
  const jobs = {
    enqueue: jest.fn().mockResolvedValue(undefined),
    enqueueDocuments: jest.fn().mockResolvedValue(undefined),
    withRunQueued: jest.fn((ids: UUID[]) =>
      Promise.resolve(
        ids.filter((id) => due.includes(id) || runQueued.includes(id)),
      ),
    ),
  };
  const useCase = new SyncDueOparlSystemsUseCase(
    systems as unknown as OparlSystemsRepository,
    documents as unknown as OparlDocumentsRepository,
    embedder as unknown as OparlChunkEmbedder,
    jobs,
  );
  return { useCase, documents, jobs };
}

describe('SyncDueOparlSystemsUseCase', () => {
  it('queues the document job again for a system left with document work, without a sync run', async () => {
    const { useCase, documents, jobs } = setup({ withWork: [KREFELD] });

    await useCase.execute();

    expect(documents.findSystemsWithDocumentWork).toHaveBeenCalledWith(
      MISTRAL_EMBED,
    );
    expect(jobs.enqueueDocuments).toHaveBeenCalledWith([KREFELD]);
    expect(jobs.enqueue).not.toHaveBeenCalled();
  });

  it('leaves the document job of a system with a run queued or running to the end of that run', async () => {
    const { useCase, jobs } = setup({
      due: [AARBERGEN],
      withWork: [AARBERGEN, KREFELD],
    });

    await useCase.execute();

    expect(jobs.enqueue).toHaveBeenCalledWith([AARBERGEN]);
    expect(jobs.enqueueDocuments).toHaveBeenCalledWith([KREFELD]);
  });
});
