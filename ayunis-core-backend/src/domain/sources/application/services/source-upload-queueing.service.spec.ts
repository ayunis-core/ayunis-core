import type { UUID } from 'crypto';
import { SourceUploadQueueingService } from './source-upload-queueing.service';
import {
  buildUploadSession,
  createMockSourceUploadSessionRepository,
  UPLOAD_SESSION_ID,
} from 'src/domain/sources/application/testing/source-upload.fixtures';
import { SourceUploadSessionStatus } from 'src/domain/sources/domain/upload/source-upload-session-status.enum';
import { SourceUploadTargetType } from 'src/domain/sources/domain/upload/source-upload-target-type.enum';

describe('SourceUploadQueueingService', () => {
  const sessions = createMockSourceUploadSessionRepository();
  const enqueueDocument = { execute: jest.fn().mockResolvedValue(undefined) };
  const enqueueDataSource = { execute: jest.fn().mockResolvedValue(undefined) };
  const service = new SourceUploadQueueingService(
    sessions,
    enqueueDocument as never,
    enqueueDataSource as never,
  );
  const sourceId = '55555555-5555-5555-5555-555555555555' as UUID;

  beforeEach(() => jest.clearAllMocks());

  it('queues a document job that retains the original and completes the session', async () => {
    const session = buildUploadSession({
      status: SourceUploadSessionStatus.SOURCES_CREATED,
      sources: [{ sourceId, sheetName: null, expectedETag: 'verified' }],
    });

    await expect(service.tryQueue(session)).resolves.toBe(true);

    expect(enqueueDocument.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceId,
        minioPath: session.storageKey,
        retainFile: true,
        expectedSize: session.fileSize,
        expectedETag: 'verified',
      }),
    );
    expect(sessions.transition).toHaveBeenCalledWith(
      UPLOAD_SESSION_ID,
      SourceUploadSessionStatus.SOURCES_CREATED,
      SourceUploadSessionStatus.COMPLETED,
    );
  });

  it('queues one data-source batch for a thread workbook', async () => {
    const session = buildUploadSession({
      fileName: 'Haushalt.xlsx',
      fileType:
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      status: SourceUploadSessionStatus.SOURCES_CREATED,
      sources: [{ sourceId, sheetName: 'Sheet 1', expectedETag: 'verified' }],
    });

    await service.tryQueue(session);

    expect(enqueueDataSource.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        uploadId: UPLOAD_SESSION_ID,
        kind: 'spreadsheet',
        expectedETag: 'verified',
        targets: session.sources,
        retainFile: true,
      }),
    );
    expect(enqueueDocument.execute).not.toHaveBeenCalled();
  });

  it('routes a knowledge-base table through the document pipeline', async () => {
    const session = buildUploadSession({
      targetType: SourceUploadTargetType.KNOWLEDGE_BASE,
      fileName: 'data.csv',
      fileType: 'text/csv',
      status: SourceUploadSessionStatus.SOURCES_CREATED,
      sources: [{ sourceId, sheetName: null }],
    });

    await service.tryQueue(session);

    expect(enqueueDocument.execute).toHaveBeenCalled();
    expect(enqueueDataSource.execute).not.toHaveBeenCalled();
  });

  it('leaves the session for a retry when the queue rejects the job', async () => {
    enqueueDocument.execute.mockRejectedValueOnce(new Error('redis down'));
    const session = buildUploadSession({
      status: SourceUploadSessionStatus.SOURCES_CREATED,
      sources: [{ sourceId, sheetName: null }],
    });

    await expect(service.tryQueue(session)).resolves.toBe(false);
    expect(sessions.transition).not.toHaveBeenCalled();
  });
});
