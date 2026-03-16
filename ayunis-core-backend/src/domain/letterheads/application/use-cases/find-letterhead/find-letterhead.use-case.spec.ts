import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import { FindLetterheadUseCase } from './find-letterhead.use-case';
import { FindLetterheadQuery } from './find-letterhead.query';
import { LetterheadsRepository } from '../../ports/letterheads-repository.port';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { LetterheadNotFoundError } from '../../letterheads.errors';
import { Letterhead } from '../../../domain/letterhead.entity';

describe('FindLetterheadUseCase', () => {
  let useCase: FindLetterheadUseCase;
  let letterheadsRepository: jest.Mocked<LetterheadsRepository>;

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

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FindLetterheadUseCase,
        { provide: LetterheadsRepository, useValue: mockRepository },
        { provide: ContextService, useValue: mockContextService },
      ],
    }).compile();

    useCase = module.get(FindLetterheadUseCase);
    letterheadsRepository = module.get(LetterheadsRepository);

    jest.spyOn(Logger.prototype, 'log').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return a letterhead when found by ID and org', async () => {
    const letterhead = new Letterhead({
      id: mockLetterheadId,
      orgId: mockOrgId,
      name: 'Stadtverwaltung Briefpapier',
      description: 'Offizielles Briefpapier',
      firstPageStoragePath: 'letterheads/org/id/first-page.pdf',
      firstPageMargins: { top: 55, bottom: 20, left: 25, right: 15 },
      continuationPageMargins: { top: 20, bottom: 20, left: 25, right: 15 },
    });
    letterheadsRepository.findById.mockResolvedValue(letterhead);

    const result = await useCase.execute(
      new FindLetterheadQuery({ letterheadId: mockLetterheadId }),
    );

    expect(result.id).toBe(mockLetterheadId);
    expect(result.name).toBe('Stadtverwaltung Briefpapier');
    expect(letterheadsRepository.findById).toHaveBeenCalledWith(
      mockOrgId,
      mockLetterheadId,
    );
  });

  it('should throw LetterheadNotFoundError when letterhead does not exist', async () => {
    letterheadsRepository.findById.mockResolvedValue(null);

    await expect(
      useCase.execute(
        new FindLetterheadQuery({ letterheadId: mockLetterheadId }),
      ),
    ).rejects.toThrow(LetterheadNotFoundError);
  });

  it('should throw UnauthorizedAccessError when orgId is missing', async () => {
    const mockContextService = {
      get: jest.fn(() => undefined),
    } as unknown as jest.Mocked<ContextService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FindLetterheadUseCase,
        { provide: LetterheadsRepository, useValue: letterheadsRepository },
        { provide: ContextService, useValue: mockContextService },
      ],
    }).compile();

    const useCaseNoOrg = module.get(FindLetterheadUseCase);

    await expect(
      useCaseNoOrg.execute(
        new FindLetterheadQuery({ letterheadId: mockLetterheadId }),
      ),
    ).rejects.toThrow(UnauthorizedAccessError);
  });
});
