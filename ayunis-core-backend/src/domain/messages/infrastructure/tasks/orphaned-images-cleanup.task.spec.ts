import { createPinoLoggerMock } from 'src/common/testing/pino-logger.mock';
import type { CleanupOrphanedImagesUseCase } from '../../application/use-cases/cleanup-orphaned-images/cleanup-orphaned-images.use-case';
import { OrphanedImagesCleanupTask } from './orphaned-images-cleanup.task';

describe('OrphanedImagesCleanupTask', () => {
  it('logs the paths and redacted reasons for deletion failures', async () => {
    const errors = [
      {
        path: 'org-id/thread-id/message-id/0.png',
        error: 'storage unavailable',
      },
    ];
    const cleanupOrphanedImagesUseCase = {
      execute: jest.fn().mockResolvedValue({
        scannedCount: 2,
        deletedCount: 1,
        failedCount: 1,
        deletedPaths: ['org-id/thread-id/message-id/1.png'],
        errors,
      }),
    } as unknown as CleanupOrphanedImagesUseCase;
    const logger = createPinoLoggerMock();
    const task = new OrphanedImagesCleanupTask(
      cleanupOrphanedImagesUseCase,
      logger,
    );

    await task.handleCleanup();

    expect(logger.warn).toHaveBeenCalledWith(
      { errors },
      'Some images failed to delete',
    );
  });
});
