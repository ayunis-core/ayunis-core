import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import { FindAllLetterheadsUseCase } from './find-all-letterheads.use-case';
import { LetterheadsRepository } from '../../ports/letterheads-repository.port';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { Letterhead } from '../../../domain/letterhead.entity';

describe('FindAllLetterheadsUseCase', () => {
  let useCase: FindAllLetterheadsUseCase;
  let letterheadsRepository: jest.Mocked<LetterheadsRepository>;

  const mockOrgId = '123e4567-e89b-12d3-a456-426614174000' as UUID;

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
        FindAllLetterheadsUseCase,
        { provide: LetterheadsRepository, useValue: mockRepository },
        { provide: ContextService, useValue: mockContextService },
      ],
    }).compile();

    useCase = module.get(FindAllLetterheadsUseCase);
    letterheadsRepository = module.get(LetterheadsRepository);

    jest.spyOn(Logger.prototype, 'log').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return all letterheads for the current organization', async () => {
    const letterheads = [
      new Letterhead({
        orgId: mockOrgId,
        name: 'Stadtverwaltung Briefpapier',
        firstPageStoragePath: 'letterheads/org/1/first-page.pdf',
        firstPageMargins: { top: 55, bottom: 20, left: 25, right: 15 },
        continuationPageMargins: { top: 20, bottom: 20, left: 25, right: 15 },
      }),
      new Letterhead({
        orgId: mockOrgId,
        name: 'Amt für Bildung',
        firstPageStoragePath: 'letterheads/org/2/first-page.pdf',
        firstPageMargins: { top: 40, bottom: 20, left: 20, right: 20 },
        continuationPageMargins: { top: 15, bottom: 20, left: 20, right: 20 },
      }),
    ];
    letterheadsRepository.findAllByOrgId.mockResolvedValue(letterheads);

    const result = await useCase.execute();

    expect(result).toHaveLength(2);
    expect(result[0].name).toBe('Stadtverwaltung Briefpapier');
    expect(result[1].name).toBe('Amt für Bildung');
    expect(letterheadsRepository.findAllByOrgId).toHaveBeenCalledWith(
      mockOrgId,
    );
  });

  it('should return empty array when no letterheads exist', async () => {
    letterheadsRepository.findAllByOrgId.mockResolvedValue([]);

    const result = await useCase.execute();

    expect(result).toHaveLength(0);
  });

  it('should throw UnauthorizedAccessError when orgId is missing', async () => {
    const mockContextService = {
      get: jest.fn(() => undefined),
    } as unknown as jest.Mocked<ContextService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FindAllLetterheadsUseCase,
        { provide: LetterheadsRepository, useValue: letterheadsRepository },
        { provide: ContextService, useValue: mockContextService },
      ],
    }).compile();

    const useCaseNoOrg = module.get(FindAllLetterheadsUseCase);

    await expect(useCaseNoOrg.execute()).rejects.toThrow(
      UnauthorizedAccessError,
    );
  });
});
