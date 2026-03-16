import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import { DeleteLetterheadUseCase } from './delete-letterhead.use-case';
import { DeleteLetterheadCommand } from './delete-letterhead.command';
import { LetterheadsRepository } from '../../ports/letterheads-repository.port';
import { ContextService } from 'src/common/context/services/context.service';
import { DeleteObjectUseCase } from 'src/domain/storage/application/use-cases/delete-object/delete-object.use-case';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { LetterheadNotFoundError } from '../../letterheads.errors';
import { Letterhead } from '../../../domain/letterhead.entity';

describe('DeleteLetterheadUseCase', () => {
  let useCase: DeleteLetterheadUseCase;
  let letterheadsRepository: jest.Mocked<LetterheadsRepository>;
  let deleteObjectUseCase: jest.Mocked<DeleteObjectUseCase>;

  const mockOrgId = '123e4567-e89b-12d3-a456-426614174000' as UUID;
  const mockLetterheadId = '223e4567-e89b-12d3-a456-426614174000' as UUID;

  beforeEach(async () => {
    const mockRepository = {
      findAllByOrgId: jest.fn(),
      findById: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
    };

    const mockContextService = {
      get: jest.fn((key: string) => {
        if (key === 'orgId') return mockOrgId;
        return undefined;
      }),
    } as unknown as jest.Mocked<ContextService>;

    const mockDeleteObjectUseCase = {
      execute: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeleteLetterheadUseCase,
        { provide: LetterheadsRepository, useValue: mockRepository },
        { provide: ContextService, useValue: mockContextService },
        { provide: DeleteObjectUseCase, useValue: mockDeleteObjectUseCase },
      ],
    }).compile();

    useCase = module.get(DeleteLetterheadUseCase);
    letterheadsRepository = module.get(LetterheadsRepository);
    deleteObjectUseCase = module.get(DeleteObjectUseCase);

    jest.spyOn(Logger.prototype, 'log').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should delete a letterhead and its first-page file from storage', async () => {
    const letterhead = new Letterhead({
      id: mockLetterheadId,
      orgId: mockOrgId,
      name: 'Stadtverwaltung Briefpapier',
      firstPageStoragePath: `letterheads/${mockOrgId}/${mockLetterheadId}/first-page.pdf`,
      continuationPageStoragePath: null,
      firstPageMargins: { top: 55, bottom: 20, left: 25, right: 15 },
      continuationPageMargins: { top: 20, bottom: 20, left: 25, right: 15 },
    });
    letterheadsRepository.findById.mockResolvedValue(letterhead);

    await useCase.execute(
      new DeleteLetterheadCommand({ letterheadId: mockLetterheadId }),
    );

    expect(deleteObjectUseCase.execute).toHaveBeenCalledTimes(1);
    expect(deleteObjectUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        objectName: `letterheads/${mockOrgId}/${mockLetterheadId}/first-page.pdf`,
      }),
    );
    expect(letterheadsRepository.delete).toHaveBeenCalledWith(
      mockOrgId,
      mockLetterheadId,
    );
  });

  it('should delete both files when continuation page exists', async () => {
    const letterhead = new Letterhead({
      id: mockLetterheadId,
      orgId: mockOrgId,
      name: 'With Continuation',
      firstPageStoragePath: `letterheads/${mockOrgId}/${mockLetterheadId}/first-page.pdf`,
      continuationPageStoragePath: `letterheads/${mockOrgId}/${mockLetterheadId}/continuation.pdf`,
      firstPageMargins: { top: 55, bottom: 20, left: 25, right: 15 },
      continuationPageMargins: { top: 20, bottom: 20, left: 25, right: 15 },
    });
    letterheadsRepository.findById.mockResolvedValue(letterhead);

    await useCase.execute(
      new DeleteLetterheadCommand({ letterheadId: mockLetterheadId }),
    );

    expect(deleteObjectUseCase.execute).toHaveBeenCalledTimes(2);
  });

  it('should throw LetterheadNotFoundError when letterhead does not exist', async () => {
    letterheadsRepository.findById.mockResolvedValue(null);

    await expect(
      useCase.execute(
        new DeleteLetterheadCommand({ letterheadId: mockLetterheadId }),
      ),
    ).rejects.toThrow(LetterheadNotFoundError);

    expect(deleteObjectUseCase.execute).not.toHaveBeenCalled();
    expect(letterheadsRepository.delete).not.toHaveBeenCalled();
  });

  it('should throw UnauthorizedAccessError when orgId is missing', async () => {
    const mockContextService = {
      get: jest.fn(() => undefined),
    } as unknown as jest.Mocked<ContextService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeleteLetterheadUseCase,
        { provide: LetterheadsRepository, useValue: letterheadsRepository },
        { provide: ContextService, useValue: mockContextService },
        { provide: DeleteObjectUseCase, useValue: deleteObjectUseCase },
      ],
    }).compile();

    const useCaseNoOrg = module.get(DeleteLetterheadUseCase);

    await expect(
      useCaseNoOrg.execute(
        new DeleteLetterheadCommand({ letterheadId: mockLetterheadId }),
      ),
    ).rejects.toThrow(UnauthorizedAccessError);
  });

  it('should delete storage files before removing the database record', async () => {
    const callOrder: string[] = [];

    const letterhead = new Letterhead({
      id: mockLetterheadId,
      orgId: mockOrgId,
      name: 'Order Test',
      firstPageStoragePath: `letterheads/${mockOrgId}/${mockLetterheadId}/first-page.pdf`,
      firstPageMargins: { top: 20, bottom: 20, left: 20, right: 20 },
      continuationPageMargins: { top: 20, bottom: 20, left: 20, right: 20 },
    });
    letterheadsRepository.findById.mockResolvedValue(letterhead);

    deleteObjectUseCase.execute.mockImplementation(async () => {
      callOrder.push('deleteObject');
    });
    letterheadsRepository.delete.mockImplementation(async () => {
      callOrder.push('deleteRecord');
    });

    await useCase.execute(
      new DeleteLetterheadCommand({ letterheadId: mockLetterheadId }),
    );

    expect(callOrder).toEqual(['deleteObject', 'deleteRecord']);
  });
});
