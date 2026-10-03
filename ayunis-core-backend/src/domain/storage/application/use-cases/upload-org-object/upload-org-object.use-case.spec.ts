import type { UUID } from 'crypto';
import { OrgAccessError } from 'src/iam/orgs/application/orgs.errors';
import { Org } from 'src/iam/orgs/domain/org.entity';
import type { AssertOrgActiveUseCase } from 'src/iam/orgs/application/use-cases/assert-org-active/assert-org-active.use-case';
import type { DeleteObjectUseCase } from 'src/domain/storage/application/use-cases/delete-object/delete-object.use-case';
import type { UploadObjectUseCase } from 'src/domain/storage/application/use-cases/upload-object/upload-object.use-case';
import { StorageObject } from 'src/domain/storage/domain/storage-object.entity';
import { DeleteFailedError } from 'src/domain/storage/application/storage.errors';
import { UploadOrgObjectCommand } from './upload-org-object.command';
import { UploadOrgObjectUseCase } from './upload-org-object.use-case';

const ORG_ID = '11111111-1111-1111-1111-111111111111' as UUID;

describe(UploadOrgObjectUseCase.name, () => {
  const assertOrgActive = {
    execute: jest.fn(),
  } as unknown as jest.Mocked<AssertOrgActiveUseCase>;
  const uploadObject = {
    execute: jest.fn(),
  } as unknown as jest.Mocked<UploadObjectUseCase>;
  const deleteObject = {
    execute: jest.fn(),
  } as unknown as jest.Mocked<DeleteObjectUseCase>;
  const useCase = new UploadOrgObjectUseCase(
    assertOrgActive,
    uploadObject,
    deleteObject,
  );
  const command = new UploadOrgObjectCommand(
    ORG_ID,
    `${ORG_ID}/processing/report.pdf`,
    Buffer.from('report'),
  );
  const stored = new StorageObject(
    command.objectName,
    'documents',
    6,
    'etag',
    {},
    new Date('2026-10-02T12:00:00Z'),
  );

  beforeEach(() => {
    jest.clearAllMocks();
    assertOrgActive.execute.mockResolvedValue(
      new Org({
        id: ORG_ID,
        name: 'Stadt Musterhausen',
        sessionVersion: 4,
      }),
    );
    uploadObject.execute.mockResolvedValue(stored);
    deleteObject.execute.mockResolvedValue(undefined);
  });

  it('returns the object when the organisation remains on the same lifecycle generation', async () => {
    await expect(useCase.execute(command)).resolves.toBe(stored);

    expect(assertOrgActive.execute).toHaveBeenNthCalledWith(1, {
      orgId: ORG_ID,
    });
    expect(assertOrgActive.execute).toHaveBeenNthCalledWith(2, {
      orgId: ORG_ID,
      sessionVersion: 4,
    });
    expect(deleteObject.execute).not.toHaveBeenCalled();
  });

  it('removes a late object when the organisation becomes inactive during upload', async () => {
    const inactive = new OrgAccessError();
    assertOrgActive.execute
      .mockResolvedValueOnce(
        new Org({ id: ORG_ID, name: 'Stadt Musterhausen', sessionVersion: 4 }),
      )
      .mockRejectedValueOnce(inactive);

    await expect(useCase.execute(command)).rejects.toBe(inactive);
    expect(deleteObject.execute).toHaveBeenCalledWith(
      expect.objectContaining({ objectName: command.objectName }),
    );
  });

  it('preserves the lifecycle failure when compensating deletion also fails', async () => {
    const inactive = new OrgAccessError();
    assertOrgActive.execute
      .mockResolvedValueOnce(
        new Org({ id: ORG_ID, name: 'Stadt Musterhausen', sessionVersion: 4 }),
      )
      .mockRejectedValueOnce(inactive);
    deleteObject.execute.mockRejectedValueOnce(new DeleteFailedError());

    await expect(useCase.execute(command)).rejects.toBe(inactive);
  });

  it('does not write when the initial organisation check fails', async () => {
    const inactive = new OrgAccessError();
    assertOrgActive.execute.mockRejectedValueOnce(inactive);

    await expect(useCase.execute(command)).rejects.toBe(inactive);
    expect(uploadObject.execute).not.toHaveBeenCalled();
    expect(deleteObject.execute).not.toHaveBeenCalled();
  });
});
