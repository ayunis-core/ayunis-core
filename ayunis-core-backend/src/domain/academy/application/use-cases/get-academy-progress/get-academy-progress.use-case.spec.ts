import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { getLoggerToken } from 'nestjs-pino';
import { randomUUID } from 'crypto';
import { createPinoLoggerMock } from 'src/common/testing/pino-logger.mock';
import { AcademyChapterConfirmation } from 'src/domain/academy/domain/academy-chapter-confirmation.entity';
import { AcademyCompletion } from 'src/domain/academy/domain/academy-completion.entity';
import { AcademyChapterConfirmationRepository } from 'src/domain/academy/application/ports/academy-chapter-confirmation.repository';
import { AcademyCompletionRepository } from 'src/domain/academy/application/ports/academy-completion.repository';
import { certificateExpiresAt } from 'src/domain/academy/application/util/certificate-validity';
import { GetAcademyProgressQuery } from './get-academy-progress.query';
import { GetAcademyProgressUseCase } from './get-academy-progress.use-case';

describe('GetAcademyProgressUseCase', () => {
  let useCase: GetAcademyProgressUseCase;
  let confirmationRepository: jest.Mocked<AcademyChapterConfirmationRepository>;
  let completionRepository: jest.Mocked<AcademyCompletionRepository>;

  const userId = randomUUID();
  const chapterId = randomUUID();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: getLoggerToken(GetAcademyProgressUseCase.name),
          useValue: createPinoLoggerMock(),
        },
        GetAcademyProgressUseCase,
        {
          provide: AcademyChapterConfirmationRepository,
          useValue: { findAllByUser: jest.fn() },
        },
        {
          provide: AcademyCompletionRepository,
          useValue: { findByUser: jest.fn() },
        },
      ],
    }).compile();

    useCase = module.get(GetAcademyProgressUseCase);
    confirmationRepository = module.get(AcademyChapterConfirmationRepository);
    completionRepository = module.get(AcademyCompletionRepository);
  });

  function daysAgo(days: number): Date {
    return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  }

  it('maps chapter confirmations and the completion snapshot', async () => {
    const confirmedAt = daysAgo(30);
    const completedAt = daysAgo(29);
    confirmationRepository.findAllByUser.mockResolvedValue([
      new AcademyChapterConfirmation({ userId, chapterId, confirmedAt }),
    ]);
    completionRepository.findByUser.mockResolvedValue(
      new AcademyCompletion({ userId, completedAt }),
    );

    const result = await useCase.execute(
      new GetAcademyProgressQuery({ userId }),
    );

    expect(result).toEqual({
      chapters: [
        {
          chapterId,
          confirmed: true,
          confirmationValid: true,
          confirmedAt,
        },
      ],
      academyCompletedAt: completedAt,
      academyCompletionExpiresAt: certificateExpiresAt(completedAt),
    });
  });

  it('reports an aged-out confirmation as no longer valid', async () => {
    const confirmedAt = daysAgo(400);
    confirmationRepository.findAllByUser.mockResolvedValue([
      new AcademyChapterConfirmation({ userId, chapterId, confirmedAt }),
    ]);
    completionRepository.findByUser.mockResolvedValue(null);

    const result = await useCase.execute(
      new GetAcademyProgressQuery({ userId }),
    );

    expect(result.chapters[0]).toMatchObject({
      confirmed: true,
      confirmationValid: false,
      confirmedAt,
    });
  });

  it('returns empty progress when no chapter has been confirmed', async () => {
    confirmationRepository.findAllByUser.mockResolvedValue([]);
    completionRepository.findByUser.mockResolvedValue(null);

    const result = await useCase.execute(
      new GetAcademyProgressQuery({ userId }),
    );

    expect(result.chapters).toEqual([]);
    expect(result.academyCompletedAt).toBeNull();
    expect(result.academyCompletionExpiresAt).toBeNull();
  });
});
