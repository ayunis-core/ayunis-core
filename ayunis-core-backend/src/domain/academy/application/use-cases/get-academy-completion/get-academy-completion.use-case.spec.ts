import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { GetAcademyCompletionUseCase } from './get-academy-completion.use-case';
import { GetAcademyCompletionQuery } from './get-academy-completion.query';
import { AcademyCompletionRepository } from '../../ports/academy-completion.repository';
import { AcademyCompletion } from 'src/domain/academy/domain/academy-completion.entity';
import { UnexpectedAcademyError } from '../../academy.errors';

describe('GetAcademyCompletionUseCase', () => {
  let useCase: GetAcademyCompletionUseCase;
  let completionRepository: jest.Mocked<AcademyCompletionRepository>;

  const userId = randomUUID();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetAcademyCompletionUseCase,
        {
          provide: AcademyCompletionRepository,
          useValue: { findByUser: jest.fn(), upsert: jest.fn() },
        },
      ],
    }).compile();

    useCase = module.get(GetAcademyCompletionUseCase);
    completionRepository = module.get(AcademyCompletionRepository);
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => jest.clearAllMocks());

  function execute() {
    return useCase.execute(new GetAcademyCompletionQuery({ userId }));
  }

  it('returns nulls when the user has never completed the academy', async () => {
    completionRepository.findByUser.mockResolvedValue(null);

    await expect(execute()).resolves.toEqual({
      completedAt: null,
      expiresAt: null,
    });
  });

  it('returns the completion date with the validity period applied', async () => {
    const completedAt = new Date('2026-07-31T09:15:00.000Z');
    completionRepository.findByUser.mockResolvedValue(
      new AcademyCompletion({ userId, completedAt }),
    );

    await expect(execute()).resolves.toEqual({
      completedAt,
      expiresAt: new Date('2027-07-31T09:15:00.000Z'),
    });
  });

  it('wraps repository failures', async () => {
    completionRepository.findByUser.mockRejectedValue(new Error('boom'));

    await expect(execute()).rejects.toThrow(UnexpectedAcademyError);
  });
});
