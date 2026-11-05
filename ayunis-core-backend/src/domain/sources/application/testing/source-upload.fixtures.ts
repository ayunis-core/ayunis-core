import type { UUID } from 'crypto';
import type { SourceUploadSessionRepository } from 'src/domain/sources/application/ports/source-upload-session.repository';
import { SourceUploadSession } from 'src/domain/sources/domain/upload/source-upload-session.entity';
import { SourceUploadSessionStatus } from 'src/domain/sources/domain/upload/source-upload-session-status.enum';
import { SourceUploadTargetType } from 'src/domain/sources/domain/upload/source-upload-target-type.enum';

export const UPLOAD_ORG_ID = '22222222-2222-2222-2222-222222222222' as UUID;
export const UPLOAD_USER_ID = '11111111-1111-1111-1111-111111111111' as UUID;
export const UPLOAD_TARGET_ID = '33333333-3333-3333-3333-333333333333' as UUID;
export const UPLOAD_SESSION_ID = '44444444-4444-4444-4444-444444444444' as UUID;

export function buildUploadSession(
  overrides: Partial<ConstructorParameters<typeof SourceUploadSession>[0]> = {},
): SourceUploadSession {
  return new SourceUploadSession({
    id: UPLOAD_SESSION_ID,
    orgId: UPLOAD_ORG_ID,
    userId: UPLOAD_USER_ID,
    targetType: SourceUploadTargetType.THREAD,
    targetId: UPLOAD_TARGET_ID,
    fileName: 'Protokoll.pdf',
    fileType: 'application/pdf',
    fileSize: 1024,
    storageKey: `${UPLOAD_ORG_ID}/uploads/${UPLOAD_SESSION_ID}/Protokoll.pdf`,
    status: SourceUploadSessionStatus.PENDING,
    expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    ...overrides,
  });
}

// Port mock factory: finders resolve to null/[], save echoes its argument and
// guarded transitions report success. Tests override per case.
export function createMockSourceUploadSessionRepository(): jest.Mocked<SourceUploadSessionRepository> {
  return {
    save: jest
      .fn()
      .mockImplementation((session: SourceUploadSession) =>
        Promise.resolve(session),
      ),
    findById: jest.fn().mockResolvedValue(null),
    transition: jest.fn().mockResolvedValue(true),
    recordVerifiedSources: jest.fn().mockResolvedValue(undefined),
    recordMultipartUploadId: jest.fn().mockResolvedValue(undefined),
    findByStorageKey: jest.fn().mockResolvedValue(null),
    findExpiredPending: jest.fn().mockResolvedValue([]),
    findByStatus: jest.fn().mockResolvedValue([]),
    deleteCompletedBefore: jest.fn().mockResolvedValue(0),
    deleteAbandonedBefore: jest.fn().mockResolvedValue(0),
  };
}

/** A context double for the owning user; `getRequiredUserContext` reads all four keys. */
export function createOwnerContext(
  overrides: Partial<{ userId: UUID; orgId: UUID }> = {},
): { get: jest.Mock } {
  const values: Record<string, unknown> = {
    userId: overrides.userId ?? UPLOAD_USER_ID,
    orgId: overrides.orgId ?? UPLOAD_ORG_ID,
    role: 'user',
    systemRole: 'user',
  };
  return { get: jest.fn((key: string) => values[key]) };
}
