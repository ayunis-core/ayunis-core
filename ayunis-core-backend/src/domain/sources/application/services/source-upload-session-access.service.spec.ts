import type { UUID } from 'crypto';
import type { ContextService } from 'src/common/context/services/context.service';
import { SourceUploadSessionAccessService } from './source-upload-session-access.service';
import {
  SourceUploadExpiredError,
  SourceUploadNotFoundError,
} from 'src/domain/sources/application/sources.errors';
import { SourceUploadSessionStatus } from 'src/domain/sources/domain/upload/source-upload-session-status.enum';
import {
  buildUploadSession,
  createMockSourceUploadSessionRepository,
  createOwnerContext,
  UPLOAD_SESSION_ID,
} from 'src/domain/sources/application/testing/source-upload.fixtures';

describe('SourceUploadSessionAccessService', () => {
  const sessions = createMockSourceUploadSessionRepository();

  function build(context = createOwnerContext()) {
    return new SourceUploadSessionAccessService(
      sessions,
      context as unknown as ContextService,
    );
  }

  beforeEach(() => {
    jest.clearAllMocks();
    sessions.findById.mockResolvedValue(buildUploadSession());
  });

  it('returns the session to its owner', async () => {
    await expect(
      build().requireOwned(UPLOAD_SESSION_ID),
    ).resolves.toMatchObject({ id: UPLOAD_SESSION_ID });
  });

  const STRANGER = '99999999-9999-9999-9999-999999999999' as UUID;

  it.each<[string, { userId?: UUID; orgId?: UUID }]>([
    ['another user', { userId: STRANGER }],
    ['another org', { orgId: STRANGER }],
  ])('reads as not found for %s', async (_label, overrides) => {
    await expect(
      build(createOwnerContext(overrides)).requireOwned(UPLOAD_SESSION_ID),
    ).rejects.toBeInstanceOf(SourceUploadNotFoundError);
  });

  it('reads as not found when the session does not exist', async () => {
    sessions.findById.mockResolvedValue(null);

    await expect(
      build().requireOwned(UPLOAD_SESSION_ID),
    ).rejects.toBeInstanceOf(SourceUploadNotFoundError);
  });

  it.each([
    SourceUploadSessionStatus.COMPLETED,
    SourceUploadSessionStatus.ABORTED,
    SourceUploadSessionStatus.EXPIRED,
  ])('refuses transfers for a %s session', async (status) => {
    sessions.findById.mockResolvedValue(buildUploadSession({ status }));

    await expect(
      build().requireTransferable(UPLOAD_SESSION_ID),
    ).rejects.toBeInstanceOf(SourceUploadExpiredError);
  });

  it('refuses transfers past the session deadline', async () => {
    sessions.findById.mockResolvedValue(
      buildUploadSession({ expiresAt: new Date(Date.now() - 1000) }),
    );

    await expect(
      build().requireTransferable(UPLOAD_SESSION_ID),
    ).rejects.toBeInstanceOf(SourceUploadExpiredError);
  });
});
