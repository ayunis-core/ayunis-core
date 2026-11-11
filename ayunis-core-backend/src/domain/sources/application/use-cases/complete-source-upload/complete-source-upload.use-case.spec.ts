jest.mock('@nestjs-cls/transactional', () => ({
  Transactional:
    () => (_target: unknown, _prop: string, descriptor: PropertyDescriptor) =>
      descriptor,
}));

jest.mock('@appsignal/nodejs', () => ({
  Appsignal: { client: { isActive: true, metrics: jest.fn() } },
}));

import { Appsignal } from '@appsignal/nodejs';
import type { UUID } from 'crypto';
import type { ContextService } from 'src/common/context/services/context.service';
import { CompleteSourceUploadUseCase } from './complete-source-upload.use-case';
import { CompleteSourceUploadCommand } from './complete-source-upload.command';
import { SourceUploadSessionAccessService } from 'src/domain/sources/application/services/source-upload-session-access.service';
import type { SourceUploadQueueingService } from 'src/domain/sources/application/services/source-upload-queueing.service';
import {
  SourceUploadExpiredError,
  SourceUploadIncompleteError,
  SourceUploadTargetMismatchError,
} from 'src/domain/sources/application/sources.errors';
import type { CreateProcessingSourceUseCase } from 'src/domain/sources/application/use-cases/create-processing-source/create-processing-source.use-case';
import { createMockSourceRepository } from 'src/domain/sources/application/testing/source.fixtures';
import {
  buildUploadSession,
  createMockSourceUploadSessionRepository,
  createOwnerContext,
  UPLOAD_SESSION_ID,
  UPLOAD_TARGET_ID,
} from 'src/domain/sources/application/testing/source-upload.fixtures';
import { SourceUploadSessionStatus } from 'src/domain/sources/domain/upload/source-upload-session-status.enum';
import { SourceUploadTargetType } from 'src/domain/sources/domain/upload/source-upload-target-type.enum';
import type { CSVDataSource } from 'src/domain/sources/domain/sources/data-source.entity';
import { FileSource } from 'src/domain/sources/domain/sources/text-source.entity';
import { FileType, TextType } from 'src/domain/sources/domain/source-type.enum';
import { SourceStatus } from 'src/domain/sources/domain/source-status.enum';
import { ObjectNotFoundError } from 'src/domain/storage/application/storage.errors';

describe('CompleteSourceUploadUseCase', () => {
  const sessions = createMockSourceUploadSessionRepository();
  const sourceRepository = createMockSourceRepository();
  const spreadsheetParser = {
    listDataSheets: jest.fn().mockResolvedValue(['Sheet 1', 'Sheet 2']),
  };
  const createProcessingSource = {
    execute: jest
      .fn()
      .mockImplementation((cmd: { id: UUID; fileName: string }) =>
        Promise.resolve(
          new FileSource({
            id: cmd.id,
            name: cmd.fileName,
            type: TextType.FILE,
            fileType: FileType.PDF,
            status: SourceStatus.PROCESSING,
          }),
        ),
      ),
  };
  const getObjectInfo = {
    execute: jest.fn().mockResolvedValue({ size: 1024, etag: 'verified' }),
  };
  // A fresh stream per call: a generator can only be consumed once.
  const downloadObject = {
    execute: jest.fn().mockImplementation(() =>
      Promise.resolve(
        (async function* () {
          yield Buffer.from('xlsx');
        })(),
      ),
    ),
  };
  const queueing = { tryQueue: jest.fn().mockResolvedValue(true) };
  const metrics = { incrementCounter: jest.fn() };
  const countedTags = () =>
    metrics.incrementCounter.mock.calls.map(([, , tags]) => tags as unknown);
  const storageCleanup = {
    discard: jest.fn().mockResolvedValue(undefined),
    remove: jest.fn().mockResolvedValue(undefined),
  };
  const access = new SourceUploadSessionAccessService(
    sessions,
    createOwnerContext() as unknown as ContextService,
  );
  const useCase = new CompleteSourceUploadUseCase(
    access,
    sessions,
    sourceRepository,
    spreadsheetParser as never,
    createProcessingSource as unknown as CreateProcessingSourceUseCase,
    getObjectInfo as never,
    downloadObject as never,
    queueing as unknown as SourceUploadQueueingService,
    storageCleanup as never,
  );

  function command(
    overrides: Partial<
      ConstructorParameters<typeof CompleteSourceUploadCommand>[0]
    > = {},
  ) {
    return new CompleteSourceUploadCommand({
      uploadId: UPLOAD_SESSION_ID,
      targetType: SourceUploadTargetType.THREAD,
      targetId: UPLOAD_TARGET_ID,
      ...overrides,
    });
  }

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(Appsignal.client.metrics).mockReturnValue(metrics as never);
    getObjectInfo.execute.mockResolvedValue({ size: 1024, etag: 'verified' });
    queueing.tryQueue.mockResolvedValue(true);
    sessions.transition.mockResolvedValue(true);
    sourceRepository.findByIds.mockImplementation((ids: UUID[]) =>
      Promise.resolve(
        ids.map(
          (id) =>
            new FileSource({
              id,
              name: 'Protokoll.pdf',
              type: TextType.FILE,
              fileType: FileType.PDF,
              status: SourceStatus.PROCESSING,
            }),
        ),
      ),
    );
  });

  function pendingThenCreated() {
    const pending = buildUploadSession();
    sessions.findById.mockResolvedValueOnce(pending);
    sessions.recordVerifiedSources.mockImplementation(
      (_id, sources, expectedETag) => {
        sessions.findById.mockResolvedValueOnce(
          buildUploadSession({
            status: SourceUploadSessionStatus.SOURCES_CREATED,
            sources,
            expectedETag,
          }),
        );
        return Promise.resolve();
      },
    );
    return pending;
  }

  it('creates one processing document with the stored key and queues it', async () => {
    const pending = pendingThenCreated();

    const result = await useCase.execute(command());

    expect(createProcessingSource.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        fileType: 'application/pdf',
        fileName: 'Protokoll.pdf',
        storageKey: pending.storageKey,
      }),
    );
    expect(sessions.transition).toHaveBeenCalledWith(
      UPLOAD_SESSION_ID,
      SourceUploadSessionStatus.PENDING,
      SourceUploadSessionStatus.SOURCES_CREATED,
    );
    expect(sessions.recordVerifiedSources).toHaveBeenCalledWith(
      UPLOAD_SESSION_ID,
      [expect.objectContaining({ sheetName: null })],
      'verified',
    );
    expect(queueing.tryQueue).toHaveBeenCalledTimes(1);
    expect(result.alreadyCompleted).toBe(false);
    expect(result.sources).toHaveLength(1);
  });

  it('attaches the created sources before queueing processing', async () => {
    pendingThenCreated();
    const stages: string[] = [];
    const attach = jest.fn(async () => {
      stages.push('attached');
    });
    queueing.tryQueue.mockImplementationOnce(async () => {
      stages.push('queued');
      return true;
    });

    const result = await useCase.execute(command({ attach }));

    expect(stages).toEqual(['attached', 'queued']);
    expect(attach).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ id: result.sources[0].id }),
      ]),
    );
  });

  it('does not queue processing when target attachment fails', async () => {
    pendingThenCreated();
    const attach = jest
      .fn()
      .mockRejectedValue(new Error('target attachment failed'));

    await expect(useCase.execute(command({ attach }))).rejects.toThrow();
    expect(queueing.tryQueue).not.toHaveBeenCalled();
  });

  it('rejects a session created for a different target', async () => {
    sessions.findById.mockResolvedValue(buildUploadSession());

    await expect(
      useCase.execute(command({ targetType: SourceUploadTargetType.SKILL })),
    ).rejects.toBeInstanceOf(SourceUploadTargetMismatchError);
    expect(createProcessingSource.execute).not.toHaveBeenCalled();
  });

  it('refuses to complete when the object was never stored', async () => {
    sessions.findById.mockResolvedValue(buildUploadSession());
    getObjectInfo.execute.mockRejectedValue(
      new ObjectNotFoundError({ objectName: 'missing' }),
    );

    await expect(useCase.execute(command())).rejects.toBeInstanceOf(
      SourceUploadIncompleteError,
    );
    expect(sessions.transition).not.toHaveBeenCalled();
  });

  it('refuses to complete and discards the bytes when the stored size differs from the announced one', async () => {
    const session = buildUploadSession({ fileSize: 2048 });
    sessions.findById.mockResolvedValue(session);

    await expect(useCase.execute(command())).rejects.toMatchObject({
      code: 'SOURCE_UPLOAD_INCOMPLETE',
      statusCode: 409,
    });
    expect(sessions.transition).toHaveBeenCalledTimes(1);
    expect(sessions.transition).toHaveBeenCalledWith(
      session.id,
      SourceUploadSessionStatus.PENDING,
      SourceUploadSessionStatus.ABORTED,
    );
    expect(storageCleanup.discard).toHaveBeenCalledWith(session);
  });

  it('leaves mismatched bytes in place when a concurrent completion claimed the session first', async () => {
    const session = buildUploadSession({ fileSize: 2048 });
    sessions.findById.mockResolvedValue(session);
    sessions.transition.mockResolvedValueOnce(false);

    await expect(useCase.execute(command())).rejects.toMatchObject({
      code: 'SOURCE_UPLOAD_INCOMPLETE',
      statusCode: 409,
    });
    expect(sessions.transition).toHaveBeenCalledWith(
      session.id,
      SourceUploadSessionStatus.PENDING,
      SourceUploadSessionStatus.ABORTED,
    );
    expect(storageCleanup.discard).not.toHaveBeenCalled();
    expect(storageCleanup.remove).not.toHaveBeenCalled();
  });

  it('expires a session completed after its deadline and discards the bytes', async () => {
    const stale = buildUploadSession({ expiresAt: new Date(Date.now() - 1) });
    sessions.findById.mockResolvedValue(stale);

    await expect(useCase.execute(command())).rejects.toBeInstanceOf(
      SourceUploadExpiredError,
    );
    expect(sessions.transition).toHaveBeenCalledWith(
      UPLOAD_SESSION_ID,
      SourceUploadSessionStatus.PENDING,
      SourceUploadSessionStatus.EXPIRED,
    );
    expect(storageCleanup.discard).toHaveBeenCalledWith(stale);
  });

  it("returns the winner's sources when a retry past the deadline finds the session already claimed", async () => {
    const sourceId = '66666666-6666-6666-6666-666666666666' as UUID;
    const stale = buildUploadSession({ expiresAt: new Date(Date.now() - 1) });
    sessions.findById.mockResolvedValueOnce(stale).mockResolvedValueOnce(
      buildUploadSession({
        status: SourceUploadSessionStatus.COMPLETED,
        sources: [{ sourceId, sheetName: null }],
      }),
    );
    sessions.transition.mockResolvedValue(false);

    const result = await useCase.execute(command());

    expect(result.alreadyCompleted).toBe(true);
    expect(sourceRepository.findByIds).toHaveBeenCalledWith([sourceId]);
    expect(storageCleanup.discard).not.toHaveBeenCalled();
    expect(sourceRepository.save).not.toHaveBeenCalled();
  });

  it('returns the existing sources on a repeated call without creating more', async () => {
    const sourceId = '55555555-5555-5555-5555-555555555555' as UUID;
    sessions.findById.mockResolvedValue(
      buildUploadSession({
        status: SourceUploadSessionStatus.COMPLETED,
        sources: [{ sourceId, sheetName: null }],
      }),
    );

    const result = await useCase.execute(command());

    expect(result.alreadyCompleted).toBe(true);
    expect(result.sources.map((s) => s.id)).toEqual([sourceId]);
    expect(createProcessingSource.execute).not.toHaveBeenCalled();
    expect(queueing.tryQueue).not.toHaveBeenCalled();
  });

  it('retries only the queueing step when sources exist but were never queued', async () => {
    const sourceId = '55555555-5555-5555-5555-555555555555' as UUID;
    const created = buildUploadSession({
      status: SourceUploadSessionStatus.SOURCES_CREATED,
      sources: [{ sourceId, sheetName: null }],
    });
    sessions.findById.mockResolvedValue(created);

    const result = await useCase.execute(command());

    expect(createProcessingSource.execute).not.toHaveBeenCalled();
    expect(queueing.tryQueue).toHaveBeenCalledWith(created);
    expect(result.alreadyCompleted).toBe(true);
    expect(result.sources.map((s) => s.id)).toEqual([sourceId]);
  });

  it('yields to a concurrent completion that claimed the session first', async () => {
    const sourceId = '55555555-5555-5555-5555-555555555555' as UUID;
    sessions.findById
      .mockResolvedValueOnce(buildUploadSession())
      .mockResolvedValueOnce(
        buildUploadSession({
          status: SourceUploadSessionStatus.COMPLETED,
          sources: [{ sourceId, sheetName: null }],
        }),
      );
    sessions.transition.mockResolvedValue(false);

    const result = await useCase.execute(command());

    expect(createProcessingSource.execute).not.toHaveBeenCalled();
    expect(sessions.recordVerifiedSources).not.toHaveBeenCalled();
    expect(result.sources.map((s) => s.id)).toEqual([sourceId]);
  });

  it('creates one CSV source per data sheet of a thread workbook and checks capacity first', async () => {
    sessions.findById.mockResolvedValueOnce(
      buildUploadSession({
        fileName: 'Haushalt.xlsx',
        fileType:
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      }),
    );
    sessions.recordVerifiedSources.mockImplementation(
      (_id, sources, expectedETag) => {
        sessions.findById.mockResolvedValueOnce(
          buildUploadSession({
            status: SourceUploadSessionStatus.SOURCES_CREATED,
            sources,
            expectedETag,
          }),
        );
        return Promise.resolve();
      },
    );
    const ensureCapacityFor = jest.fn();

    await useCase.execute(command({ ensureCapacityFor }));

    expect(ensureCapacityFor).toHaveBeenCalledWith(2);
    expect(createProcessingSource.execute).not.toHaveBeenCalled();
    expect(spreadsheetParser.listDataSheets).toHaveBeenCalledWith(
      Buffer.from('xlsx'),
    );
    expect(sourceRepository.save).toHaveBeenCalledTimes(2);
    const saved = sourceRepository.save.mock.calls.map(
      ([source]) => source as CSVDataSource,
    );
    expect(saved.map((s) => s.name)).toEqual([
      'Haushalt_Sheet_1.csv',
      'Haushalt_Sheet_2.csv',
    ]);
    expect(saved.every((s) => s.storageKey !== null)).toBe(true);
    // The stale-processing sweep must not start before a worker claims the job.
    expect(saved.every((s) => s.processingStartedAt === null)).toBe(true);
    expect(sessions.recordVerifiedSources).toHaveBeenCalledWith(
      UPLOAD_SESSION_ID,
      [
        expect.objectContaining({ sheetName: 'Sheet 1' }),
        expect.objectContaining({ sheetName: 'Sheet 2' }),
      ],
      'verified',
    );
  });

  it('rejects a workbook that grew past the verified size before any source exists', async () => {
    sessions.findById.mockResolvedValue(
      buildUploadSession({
        fileName: 'Haushalt.xlsx',
        fileType:
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        fileSize: 2,
      }),
    );
    getObjectInfo.execute.mockResolvedValue({ size: 2 });

    const result = useCase.execute(command());
    await expect(result).rejects.toMatchObject({
      code: 'SOURCE_UPLOAD_INCOMPLETE',
      statusCode: 409,
      metadata: { reason: 'changed' },
    });
    await expect(result).rejects.not.toMatchObject({
      metadata: expect.objectContaining({ storageKey: expect.anything() }),
    });
    expect(sessions.transition).toHaveBeenCalledWith(
      UPLOAD_SESSION_ID,
      SourceUploadSessionStatus.PENDING,
      SourceUploadSessionStatus.ABORTED,
    );
    expect(storageCleanup.discard).toHaveBeenCalledWith(
      expect.objectContaining({
        storageKey: expect.stringContaining('/uploads/'),
      }),
    );
    expect(sourceRepository.save).not.toHaveBeenCalled();
  });

  it('reports a workbook removed between verification and the read as missing without naming the key', async () => {
    sessions.findById.mockResolvedValue(
      buildUploadSession({
        fileName: 'Haushalt.xlsx',
        fileType:
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      }),
    );
    downloadObject.execute.mockRejectedValueOnce(
      new ObjectNotFoundError({ objectName: 'org/uploads/gone.xlsx' }),
    );

    const result = useCase.execute(command());
    await expect(result).rejects.toMatchObject({
      code: 'SOURCE_UPLOAD_INCOMPLETE',
      statusCode: 409,
      metadata: { reason: 'missing' },
    });
    await expect(result).rejects.not.toMatchObject({
      message: expect.stringContaining('gone.xlsx'),
    });
    expect(storageCleanup.remove).not.toHaveBeenCalled();
    expect(sessions.transition).not.toHaveBeenCalled();
    expect(sourceRepository.save).not.toHaveBeenCalled();
  });

  it('does not create sources when the target has no capacity left', async () => {
    sessions.findById.mockResolvedValue(buildUploadSession());
    const limit = new Error('limit');

    await expect(
      useCase.execute(
        command({
          ensureCapacityFor: () => {
            throw limit;
          },
        }),
      ),
    ).rejects.toMatchObject({ code: 'UNEXPECTED_SOURCE_ERROR' });
    expect(sessions.transition).not.toHaveBeenCalled();
  });

  describe('outcome metric', () => {
    const sourceId = '55555555-5555-5555-5555-555555555555' as UUID;
    const completed = { outcome: 'completed', target_type: 'thread' };

    it('counts the completion that claims the session as completed once', async () => {
      pendingThenCreated();

      await useCase.execute(command());

      expect(countedTags()).toEqual([{ ...completed, multipart: 'false' }]);
    });

    it.each([
      SourceUploadSessionStatus.COMPLETED,
      SourceUploadSessionStatus.SOURCES_CREATED,
    ])('does not count a replay of a %s session again', async (status) => {
      sessions.findById.mockResolvedValue(
        buildUploadSession({
          status,
          sources: [{ sourceId, sheetName: null }],
        }),
      );

      await useCase.execute(command());

      expect(countedTags()).toEqual([]);
    });

    it('does not count the loser of a concurrent completion', async () => {
      sessions.findById
        .mockResolvedValueOnce(buildUploadSession())
        .mockResolvedValueOnce(
          buildUploadSession({
            status: SourceUploadSessionStatus.COMPLETED,
            sources: [{ sourceId, sheetName: null }],
          }),
        );
      sessions.transition.mockResolvedValue(false);

      await useCase.execute(command());

      expect(countedTags()).toEqual([]);
    });

    it('does not count a completion whose target attachment failed', async () => {
      pendingThenCreated();
      const attach = jest.fn().mockRejectedValue(new Error('attach failed'));

      await expect(useCase.execute(command({ attach }))).rejects.toThrow();

      expect(countedTags()).toEqual([]);
    });

    it('counts a session ended for mismatched bytes as aborted once', async () => {
      sessions.findById.mockResolvedValue(
        buildUploadSession({ fileSize: 2048, multipart: true }),
      );

      await expect(useCase.execute(command())).rejects.toBeInstanceOf(
        SourceUploadIncompleteError,
      );

      expect(countedTags()).toEqual([
        { outcome: 'aborted', target_type: 'thread', multipart: 'true' },
      ]);
    });

    it('does not count mismatched bytes when another call already ended the session', async () => {
      sessions.findById.mockResolvedValue(
        buildUploadSession({ fileSize: 2048 }),
      );
      sessions.transition.mockResolvedValue(false);

      await expect(useCase.execute(command())).rejects.toBeInstanceOf(
        SourceUploadIncompleteError,
      );

      expect(countedTags()).toEqual([]);
    });

    it('counts a completion past the deadline as expired once', async () => {
      sessions.findById.mockResolvedValue(
        buildUploadSession({ expiresAt: new Date(Date.now() - 1) }),
      );

      await expect(useCase.execute(command())).rejects.toBeInstanceOf(
        SourceUploadExpiredError,
      );

      expect(countedTags()).toEqual([
        { outcome: 'expired', target_type: 'thread', multipart: 'false' },
      ]);
    });

    it('completes the upload when the metrics client throws', async () => {
      pendingThenCreated();
      metrics.incrementCounter.mockImplementation(() => {
        throw new Error('appsignal extension unavailable');
      });

      const result = await useCase.execute(command());

      expect(result.sources).toHaveLength(1);
      expect(result.alreadyCompleted).toBe(false);
    });
  });
});
