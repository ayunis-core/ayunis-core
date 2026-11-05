import { SweepSourceUploadSessionsUseCase } from './sweep-source-upload-sessions.use-case';
import {
  buildUploadSession,
  createMockSourceUploadSessionRepository,
} from 'src/domain/sources/application/testing/source-upload.fixtures';
import { SourceUploadSessionStatus } from 'src/domain/sources/domain/upload/source-upload-session-status.enum';

describe('SweepSourceUploadSessionsUseCase', () => {
  const sessions = createMockSourceUploadSessionRepository();
  const queueing = { tryQueue: jest.fn().mockResolvedValue(true) };
  const storageCleanup = {
    discard: jest.fn().mockResolvedValue(true),
    abort: jest.fn().mockResolvedValue(undefined),
  };
  const listIncompleteUploads = { execute: jest.fn().mockResolvedValue([]) };
  const useCase = new SweepSourceUploadSessionsUseCase(
    sessions,
    queueing as never,
    storageCleanup as never,
    listIncompleteUploads as never,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    sessions.transition.mockResolvedValue(true);
    storageCleanup.discard.mockResolvedValue(true);
    sessions.findExpiredPending.mockResolvedValue([]);
    sessions.findOwnedByStatus.mockResolvedValue([]);
    sessions.deleteFinishedBefore.mockResolvedValue(0);
    listIncompleteUploads.execute.mockResolvedValue([]);
  });

  it('expires abandoned sessions and discards their bytes', async () => {
    const abandoned = buildUploadSession({ multipartUploadId: 'mp-1' });
    sessions.findExpiredPending.mockResolvedValue([abandoned]);

    const result = await useCase.execute();

    expect(sessions.transition).toHaveBeenCalledWith(
      abandoned.id,
      SourceUploadSessionStatus.PENDING,
      SourceUploadSessionStatus.EXPIRED,
    );
    expect(storageCleanup.discard).toHaveBeenCalledWith(abandoned);
    expect(result.expired).toBe(1);
  });

  it('does not discard bytes of a session someone else just completed', async () => {
    sessions.findExpiredPending.mockResolvedValue([buildUploadSession()]);
    sessions.transition.mockResolvedValue(false);

    const result = await useCase.execute();

    expect(storageCleanup.discard).not.toHaveBeenCalled();
    expect(result.expired).toBe(0);
  });

  it('retries queueing for sessions whose sources were created but never queued', async () => {
    const stuck = buildUploadSession({
      status: SourceUploadSessionStatus.SOURCES_CREATED,
    });
    sessions.findOwnedByStatus.mockImplementation(async (status) =>
      status === SourceUploadSessionStatus.SOURCES_CREATED ? [stuck] : [],
    );

    const result = await useCase.execute();

    expect(queueing.tryQueue).toHaveBeenCalledWith(stuck);
    expect(result.requeued).toBe(1);
  });

  it('aborts multipart uploads no pending session claims and keeps every upload of a pending one', async () => {
    const claimed = buildUploadSession({ multipartUploadId: 'mp-live' });
    listIncompleteUploads.execute.mockResolvedValue([
      { objectName: claimed.storageKey, uploadId: 'mp-live' },
      { objectName: claimed.storageKey, uploadId: 'mp-stale' },
      { objectName: 'org/uploads/gone/file.pdf', uploadId: 'mp-orphan' },
      { objectName: 'org/processing/legacy/file.pdf', uploadId: 'mp-other' },
    ]);
    sessions.findByStorageKey.mockImplementation((key: string) =>
      Promise.resolve(key === claimed.storageKey ? claimed : null),
    );

    const result = await useCase.execute();

    expect(storageCleanup.abort).toHaveBeenCalledTimes(1);
    expect(storageCleanup.abort).toHaveBeenCalledWith(
      'org/uploads/gone/file.pdf',
      'mp-orphan',
    );
    expect(result.abortedUploads).toBe(1);
  });

  it('aborts every upload under a key once its session has left PENDING', async () => {
    const completed = buildUploadSession({
      status: SourceUploadSessionStatus.COMPLETED,
      multipartUploadId: 'mp-recorded',
    });
    listIncompleteUploads.execute.mockResolvedValue([
      { objectName: completed.storageKey, uploadId: 'mp-recorded' },
      { objectName: completed.storageKey, uploadId: 'mp-reinitiated' },
    ]);
    sessions.findByStorageKey.mockResolvedValue(completed);

    const result = await useCase.execute();

    expect(storageCleanup.abort).toHaveBeenCalledTimes(2);
    expect(result.abortedUploads).toBe(2);
  });

  it('leaves an upload alone while its pending session has not named one yet', async () => {
    const initiating = buildUploadSession({ multipartUploadId: null });
    listIncompleteUploads.execute.mockResolvedValue([
      { objectName: initiating.storageKey, uploadId: 'mp-just-created' },
    ]);
    sessions.findByStorageKey.mockResolvedValue(initiating);

    const result = await useCase.execute();

    expect(storageCleanup.abort).not.toHaveBeenCalled();
    expect(result.abortedUploads).toBe(0);
  });

  it('aborts an unnamed upload once its pending session has expired', async () => {
    const expired = buildUploadSession({
      multipartUploadId: null,
      expiresAt: new Date(Date.now() - 1000),
    });
    listIncompleteUploads.execute.mockResolvedValue([
      { objectName: expired.storageKey, uploadId: 'mp-abandoned' },
    ]);
    sessions.findByStorageKey.mockResolvedValue(expired);

    await useCase.execute();

    expect(storageCleanup.abort).toHaveBeenCalledWith(
      expired.storageKey,
      'mp-abandoned',
    );
  });

  it('rotates an abandoned session whose storage cleanup failed to the back of the batch', async () => {
    const stuck = buildUploadSession({
      status: SourceUploadSessionStatus.ABORTED,
      updatedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
    });
    sessions.findOwnedByStatus.mockImplementation(async (wanted) =>
      wanted === SourceUploadSessionStatus.ABORTED ? [stuck] : [],
    );
    storageCleanup.discard.mockResolvedValue(false);

    await useCase.execute();

    expect(sessions.deleteAbandonedBefore).toHaveBeenCalledWith(
      [],
      expect.any(Date),
    );
    expect(sessions.recordCleanupAttempts).toHaveBeenCalledWith(
      [stuck.id],
      expect.any(Date),
    );
  });

  it.each([
    SourceUploadSessionStatus.ABORTED,
    SourceUploadSessionStatus.EXPIRED,
  ])(
    'removes bytes that arrive after initial cleanup before purging a %s session',
    async (status) => {
      const abandoned = buildUploadSession({
        status,
        updatedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
      });
      const objects = new Set<string>();
      storageCleanup.discard.mockImplementation(async (session) => {
        objects.delete(session.storageKey);
        return true;
      });
      await storageCleanup.discard(abandoned);
      // A PUT already in flight finishes after the initial delete.
      objects.add(abandoned.storageKey);
      sessions.findOwnedByStatus.mockImplementation(async (wanted) =>
        wanted === status ? [abandoned] : [],
      );

      await useCase.execute();

      expect(objects.has(abandoned.storageKey)).toBe(false);
      expect(storageCleanup.discard).toHaveBeenCalledTimes(2);
    },
  );

  it('purges completed session records without deleting their original files', async () => {
    sessions.deleteFinishedBefore.mockResolvedValue(3);

    const result = await useCase.execute();

    expect(result.purgedSessions).toBe(3);
  });
});
