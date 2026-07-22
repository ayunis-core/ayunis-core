import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { Readable } from 'stream';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { StorageObject } from 'src/domain/storage/domain/storage-object.entity';
import { DownloadOrgObjectUseCase } from './download-org-object.use-case';
import { DownloadOrgObjectQuery } from './download-org-object.query';
import { DownloadObjectUseCase } from '../download-object/download-object.use-case';
import { GetObjectInfoUseCase } from '../get-object-info/get-object-info.use-case';
import {
  InvalidObjectNameError,
  ObjectNotFoundError,
  StoragePermissionDeniedError,
  UnexpectedStorageError,
} from '../../storage.errors';

describe('DownloadOrgObjectUseCase', () => {
  let useCase: DownloadOrgObjectUseCase;

  const orgId = '11111111-1111-1111-1111-111111111111';
  const otherOrgId = '22222222-2222-2222-2222-222222222222';

  const mockContextService = { get: jest.fn() };
  const mockGetObjectInfoUseCase = { execute: jest.fn() };
  const mockDownloadObjectUseCase = { execute: jest.fn() };

  function storageObject(contentType?: string): StorageObject {
    return new StorageObject(
      `${orgId}/thread/message/0.png`,
      'test-bucket',
      1234,
      'etag',
      contentType ? { contentType } : undefined,
    );
  }

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DownloadOrgObjectUseCase,
        { provide: ContextService, useValue: mockContextService },
        { provide: GetObjectInfoUseCase, useValue: mockGetObjectInfoUseCase },
        { provide: DownloadObjectUseCase, useValue: mockDownloadObjectUseCase },
      ],
    }).compile();

    useCase = module.get<DownloadOrgObjectUseCase>(DownloadOrgObjectUseCase);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockContextService.get.mockReturnValue(orgId);
  });

  it('serves an object under the own org prefix', async () => {
    const objectName = `${orgId}/thread/message/0.png`;
    const mockStream = new Readable();
    mockGetObjectInfoUseCase.execute.mockResolvedValue(
      storageObject('image/png'),
    );
    mockDownloadObjectUseCase.execute.mockResolvedValue(mockStream);

    const result = await useCase.execute(
      new DownloadOrgObjectQuery(objectName),
    );

    expect(result.stream).toBe(mockStream);
    expect(result.contentType).toBe('image/png');
    expect(result.size).toBe(1234);
    expect(result.filename).toBe('0.png');
    expect(mockDownloadObjectUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({ objectName }),
    );
  });

  it('rejects an object under a foreign org prefix', async () => {
    const objectName = `${otherOrgId}/thread/message/0.png`;

    await expect(
      useCase.execute(new DownloadOrgObjectQuery(objectName)),
    ).rejects.toThrow(StoragePermissionDeniedError);
    expect(mockGetObjectInfoUseCase.execute).not.toHaveBeenCalled();
    expect(mockDownloadObjectUseCase.execute).not.toHaveBeenCalled();
  });

  it.each([
    [`generated-images/${orgId}/thread/image.png`],
    [`letterheads/${orgId}/letterhead/first-page.pdf`],
    ['1699999999999-file.pdf'],
  ])('rejects the non-org-prefixed name %s', async (objectName) => {
    await expect(
      useCase.execute(new DownloadOrgObjectQuery(objectName)),
    ).rejects.toThrow(StoragePermissionDeniedError);
    expect(mockDownloadObjectUseCase.execute).not.toHaveBeenCalled();
  });

  it.each([
    [`${orgId}/../${otherOrgId}/0.png`],
    [`${orgId}/./0.png`],
    [`/${orgId}/thread/message/0.png`],
    [`${orgId}//0.png`],
  ])('rejects the malformed name %s', async (objectName) => {
    await expect(
      useCase.execute(new DownloadOrgObjectQuery(objectName)),
    ).rejects.toThrow(InvalidObjectNameError);
    expect(mockGetObjectInfoUseCase.execute).not.toHaveBeenCalled();
    expect(mockDownloadObjectUseCase.execute).not.toHaveBeenCalled();
  });

  it('rejects when no orgId is in the context', async () => {
    mockContextService.get.mockReturnValue(undefined);

    await expect(
      useCase.execute(new DownloadOrgObjectQuery(`${orgId}/thread/msg/0.png`)),
    ).rejects.toThrow(UnauthorizedAccessError);
    expect(mockGetObjectInfoUseCase.execute).not.toHaveBeenCalled();
  });

  it.each([['image/svg+xml'], ['text/html'], [undefined]])(
    'rejects the disallowed content type %s',
    async (contentType) => {
      mockGetObjectInfoUseCase.execute.mockResolvedValue(
        storageObject(contentType),
      );

      await expect(
        useCase.execute(
          new DownloadOrgObjectQuery(`${orgId}/thread/message/0.png`),
        ),
      ).rejects.toThrow(StoragePermissionDeniedError);
      expect(mockDownloadObjectUseCase.execute).not.toHaveBeenCalled();
    },
  );

  it('propagates ObjectNotFoundError from the info lookup', async () => {
    const objectName = `${orgId}/thread/message/0.png`;
    mockGetObjectInfoUseCase.execute.mockRejectedValue(
      new ObjectNotFoundError({ objectName }),
    );

    await expect(
      useCase.execute(new DownloadOrgObjectQuery(objectName)),
    ).rejects.toThrow(ObjectNotFoundError);
  });

  it('wraps unexpected errors in UnexpectedStorageError', async () => {
    mockGetObjectInfoUseCase.execute.mockRejectedValue(new TypeError('boom'));

    await expect(
      useCase.execute(
        new DownloadOrgObjectQuery(`${orgId}/thread/message/0.png`),
      ),
    ).rejects.toThrow(UnexpectedStorageError);
  });
});
