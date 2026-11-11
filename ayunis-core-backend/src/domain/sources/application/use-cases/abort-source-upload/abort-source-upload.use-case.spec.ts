import { Appsignal } from '@appsignal/nodejs';
import type { ContextService } from 'src/common/context/services/context.service';
import { SourceUploadSessionAccessService } from 'src/domain/sources/application/services/source-upload-session-access.service';
import {
  buildUploadSession,
  createMockSourceUploadSessionRepository,
  createOwnerContext,
  UPLOAD_SESSION_ID,
} from 'src/domain/sources/application/testing/source-upload.fixtures';
import { SourceUploadTargetType } from 'src/domain/sources/domain/upload/source-upload-target-type.enum';
import { AbortSourceUploadCommand } from './abort-source-upload.command';
import { AbortSourceUploadUseCase } from './abort-source-upload.use-case';

jest.mock('@appsignal/nodejs', () => ({
  Appsignal: { client: { isActive: true, metrics: jest.fn() } },
}));

describe('AbortSourceUploadUseCase', () => {
  const sessions = createMockSourceUploadSessionRepository();
  const storageCleanup = { discard: jest.fn().mockResolvedValue(true) };
  const metrics = { incrementCounter: jest.fn() };
  const useCase = new AbortSourceUploadUseCase(
    new SourceUploadSessionAccessService(
      sessions,
      createOwnerContext() as unknown as ContextService,
    ),
    sessions,
    storageCleanup as never,
  );
  const countedTags = () =>
    metrics.incrementCounter.mock.calls.map(([, , tags]) => tags as unknown);

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(Appsignal.client.metrics).mockReturnValue(metrics as never);
    sessions.transition.mockResolvedValue(true);
  });

  it('counts a pending session the owner cancels as aborted once', async () => {
    sessions.findById.mockResolvedValue(
      buildUploadSession({ targetType: SourceUploadTargetType.SKILL }),
    );

    await useCase.execute(new AbortSourceUploadCommand(UPLOAD_SESSION_ID));

    expect(countedTags()).toEqual([
      { outcome: 'aborted', target_type: 'skill', multipart: 'false' },
    ]);
  });

  it('does not count an abort for a session that already left pending', async () => {
    sessions.findById.mockResolvedValue(buildUploadSession());
    sessions.transition.mockResolvedValue(false);

    await useCase.execute(new AbortSourceUploadCommand(UPLOAD_SESSION_ID));

    expect(countedTags()).toEqual([]);
    expect(storageCleanup.discard).not.toHaveBeenCalled();
  });
});
