import type { Job } from 'bullmq';
import { ProcessingCheckpointService } from 'src/domain/sources/application/services/processing-checkpoint.service';
import { SourceProcessingHelper } from 'src/domain/sources/application/services/source-processing-helper.service';
import { SourceProcessingHeartbeatService } from 'src/domain/sources/application/services/source-processing-heartbeat.service';
import { createMockSourceRepository } from 'src/domain/sources/application/testing/source.fixtures';
import { MarkSourceFailedUseCase } from 'src/domain/sources/application/use-cases/mark-source-failed/mark-source-failed.use-case';
import type { DocumentProcessingJobData } from 'src/domain/sources/application/ports/document-processing.port';
import type { RetrieveFileContentCommand } from 'src/domain/retrievers/file-retrievers/application/use-cases/retrieve-file-content/retrieve-file-content.command';
import { FileSource } from 'src/domain/sources/domain/sources/text-source.entity';
import { SourceStatus } from 'src/domain/sources/domain/source-status.enum';
import { TextType, FileType } from 'src/domain/sources/domain/source-type.enum';
import { DocumentProcessingConsumer } from './document-processing.consumer';

const sourceId = '00000000-0000-0000-0000-000000000001';
const orgId = '00000000-0000-0000-0000-000000000010';
const userId = '00000000-0000-0000-0000-000000000020';

function source(status: SourceStatus): FileSource {
  return new FileSource({
    id: sourceId,
    name: 'council.pdf',
    type: TextType.FILE,
    fileType: FileType.PDF,
    knowledgeBaseId: null,
    status,
  });
}

async function interruptedDelivery(
  status: SourceStatus | null,
  retainFile: boolean,
) {
  let current: FileSource | null = source(SourceStatus.PROCESSING);
  let vectorPresent = true;
  let filePresent = true;
  const results = new Set(['saved OCR batch']);
  const repository = createMockSourceRepository();
  repository.findById.mockImplementation(async () => current);
  const checkpoints = new ProcessingCheckpointService(
    repository,
    {} as never,
    {} as never,
    {
      execute: async () => {
        results.clear();
        return { deletedCount: 1, failedCount: 0 };
      },
    } as never,
  );
  const helper = new SourceProcessingHelper(
    {} as never,
    {
      execute: async () => {
        vectorPresent = false;
      },
    } as never,
    new MarkSourceFailedUseCase(repository),
  );
  const consumer = new DocumentProcessingConsumer(
    {
      run: async (fn: () => Promise<void>) => fn(),
      set: () => undefined,
    } as never,
    {
      execute: async (command: RetrieveFileContentCommand) => {
        current = status === null ? null : source(status);
        await command.processingContext!.read('a'.repeat(64));
        return { pages: [] };
      },
    } as never,
    { execute: async () => undefined } as never,
    {} as never,
    { read: async () => Buffer.from('PDF fixture') } as never,
    {
      execute: async () => {
        filePresent = false;
      },
    } as never,
    repository,
    helper,
    {} as never,
    { execute: async () => true } as never,
    new SourceProcessingHeartbeatService(repository),
    checkpoints,
  );
  await consumer.process({
    id: 'overlapping-delivery',
    attemptsMade: 0,
    opts: { attempts: 3 },
    updateProgress: async () => undefined,
    data: {
      sourceId,
      orgId,
      userId,
      minioPath: `${orgId}/processing/${sourceId}/input.pdf`,
      fileName: 'council.pdf',
      fileType: 'application/pdf',
      retainFile,
    },
  } as unknown as Job<DocumentProcessingJobData>);
  return {
    status: current?.status ?? null,
    vectorPresent,
    filePresent,
    checkpointCount: results.size,
  };
}

it.each([SourceStatus.READY, SourceStatus.FAILED, null])(
  'preserves settled source %s when an overlapping delivery stops at a checkpoint',
  async (status) => {
    expect(await interruptedDelivery(status, true)).toEqual({
      status,
      vectorPresent: true,
      filePresent: true,
      checkpointCount: 0,
    });
  },
);

it('removes only the staged input when an overlapping legacy delivery stops', async () => {
  expect(await interruptedDelivery(SourceStatus.READY, false)).toEqual({
    status: SourceStatus.READY,
    vectorPresent: true,
    filePresent: false,
    checkpointCount: 0,
  });
});
