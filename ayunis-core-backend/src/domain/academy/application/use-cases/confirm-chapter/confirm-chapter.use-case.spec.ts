import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { getLoggerToken } from 'nestjs-pino';
import { randomUUID } from 'crypto';
import type { UUID } from 'crypto';
import { createPinoLoggerMock } from 'src/common/testing/pino-logger.mock';
import { AcademyChapter } from 'src/domain/academy/domain/academy-chapter.entity';
import { AcademyChapterConfirmation } from 'src/domain/academy/domain/academy-chapter-confirmation.entity';
import { AcademyCompletion } from 'src/domain/academy/domain/academy-completion.entity';
import { AcademyChapterRepository } from 'src/domain/academy/application/ports/academy-chapter.repository';
import { AcademyChapterConfirmationRepository } from 'src/domain/academy/application/ports/academy-chapter-confirmation.repository';
import { AcademyCompletionRepository } from 'src/domain/academy/application/ports/academy-completion.repository';
import { ChapterNotFoundError } from 'src/domain/academy/application/academy.errors';
import { ConfirmChapterCommand } from './confirm-chapter.command';
import { ConfirmChapterUseCase } from './confirm-chapter.use-case';

describe('ConfirmChapterUseCase', () => {
  let useCase: ConfirmChapterUseCase;
  let chapterRepository: jest.Mocked<AcademyChapterRepository>;
  let confirmationRepository: jest.Mocked<AcademyChapterConfirmationRepository>;
  let completionRepository: jest.Mocked<AcademyCompletionRepository>;

  const userId = randomUUID();
  const chapter = new AcademyChapter({
    title: 'Responsible AI basics',
    description: 'How to use AI systems responsibly in public administration',
    position: 0,
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: getLoggerToken(ConfirmChapterUseCase.name),
          useValue: createPinoLoggerMock(),
        },
        ConfirmChapterUseCase,
        {
          provide: AcademyChapterRepository,
          useValue: { findOne: jest.fn(), findAllIds: jest.fn() },
        },
        {
          provide: AcademyChapterConfirmationRepository,
          useValue: { upsert: jest.fn(), findAllByUser: jest.fn() },
        },
        {
          provide: AcademyCompletionRepository,
          useValue: { findByUser: jest.fn(), upsert: jest.fn() },
        },
      ],
    }).compile();

    useCase = module.get(ConfirmChapterUseCase);
    chapterRepository = module.get(AcademyChapterRepository);
    confirmationRepository = module.get(AcademyChapterConfirmationRepository);
    completionRepository = module.get(AcademyCompletionRepository);

    chapterRepository.findOne.mockResolvedValue(chapter);
    chapterRepository.findAllIds.mockResolvedValue([chapter.id]);
    confirmationRepository.upsert.mockImplementation(
      async (confirmation) => confirmation,
    );
    completionRepository.findByUser.mockResolvedValue(null);
    completionRepository.upsert.mockImplementation(
      async (completion) => completion,
    );
  });

  function confirmationOf(
    chapterId: UUID,
    confirmedAt = new Date(),
  ): AcademyChapterConfirmation {
    return new AcademyChapterConfirmation({ userId, chapterId, confirmedAt });
  }

  function confirm(chapterId = chapter.id) {
    return useCase.execute(new ConfirmChapterCommand({ userId, chapterId }));
  }

  it('stores the first chapter confirmation', async () => {
    const confirmation = confirmationOf(chapter.id);
    confirmationRepository.upsert.mockResolvedValue(confirmation);
    confirmationRepository.findAllByUser.mockResolvedValue([confirmation]);

    const result = await confirm();

    expect(result.chapterId).toBe(chapter.id);
    expect(result.confirmedAt).toBe(confirmation.confirmedAt);
    expect(confirmationRepository.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ userId, chapterId: chapter.id }),
    );
  });

  it('refreshes the confirmation timestamp when a chapter is reconfirmed', async () => {
    const previous = confirmationOf(
      chapter.id,
      new Date('2025-01-01T00:00:00.000Z'),
    );
    const refreshed = confirmationOf(
      chapter.id,
      new Date('2026-08-27T08:00:00.000Z'),
    );
    confirmationRepository.upsert.mockResolvedValue(refreshed);
    confirmationRepository.findAllByUser.mockResolvedValue([refreshed]);

    const result = await confirm();

    expect(result.confirmedAt).toEqual(refreshed.confirmedAt);
    expect(result.confirmedAt).not.toEqual(previous.confirmedAt);
  });

  it('handles duplicate confirmation requests idempotently', async () => {
    const confirmation = confirmationOf(chapter.id);
    confirmationRepository.upsert.mockResolvedValue(confirmation);
    confirmationRepository.findAllByUser.mockResolvedValue([confirmation]);

    await expect(confirm()).resolves.toMatchObject({ chapterId: chapter.id });
    await expect(confirm()).resolves.toMatchObject({ chapterId: chapter.id });

    expect(confirmationRepository.upsert).toHaveBeenCalledTimes(2);
  });

  it('rejects an unknown chapter without writing a confirmation', async () => {
    const unknownChapterId = randomUUID();
    chapterRepository.findOne.mockResolvedValue(null);

    await expect(confirm(unknownChapterId)).rejects.toThrow(
      ChapterNotFoundError,
    );
    expect(confirmationRepository.upsert).not.toHaveBeenCalled();
  });

  it('does not complete the academy while another chapter is unconfirmed', async () => {
    chapterRepository.findAllIds.mockResolvedValue([chapter.id, randomUUID()]);
    const confirmation = confirmationOf(chapter.id);
    confirmationRepository.upsert.mockResolvedValue(confirmation);
    confirmationRepository.findAllByUser.mockResolvedValue([confirmation]);

    const result = await confirm();

    expect(result.academyCompleted).toBe(false);
    expect(completionRepository.upsert).not.toHaveBeenCalled();
  });

  it('completes the academy when every configured chapter is confirmed', async () => {
    const otherChapterId = randomUUID();
    chapterRepository.findAllIds.mockResolvedValue([
      chapter.id,
      otherChapterId,
    ]);
    const confirmation = confirmationOf(chapter.id);
    confirmationRepository.upsert.mockResolvedValue(confirmation);
    confirmationRepository.findAllByUser.mockResolvedValue([
      confirmation,
      confirmationOf(otherChapterId),
    ]);

    const result = await confirm();

    expect(result.academyCompleted).toBe(true);
    expect(completionRepository.upsert).toHaveBeenCalledWith(
      expect.any(AcademyCompletion),
    );
  });

  it('requires every chapter confirmation to be within the annual renewal window', async () => {
    const otherChapterId = randomUUID();
    chapterRepository.findAllIds.mockResolvedValue([
      chapter.id,
      otherChapterId,
    ]);
    const confirmation = confirmationOf(chapter.id);
    confirmationRepository.upsert.mockResolvedValue(confirmation);
    confirmationRepository.findAllByUser.mockResolvedValue([
      confirmation,
      confirmationOf(
        otherChapterId,
        new Date(Date.now() - 400 * 24 * 60 * 60 * 1000),
      ),
    ]);

    const result = await confirm();

    expect(result.academyCompleted).toBe(false);
    expect(completionRepository.upsert).not.toHaveBeenCalled();
  });

  it('does not extend completion until every chapter is reconfirmed', async () => {
    const otherChapterId = randomUUID();
    const previousCompletion = new AcademyCompletion({
      userId,
      completedAt: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000),
    });
    const refreshed = confirmationOf(chapter.id);
    chapterRepository.findAllIds.mockResolvedValue([
      chapter.id,
      otherChapterId,
    ]);
    confirmationRepository.upsert.mockResolvedValue(refreshed);
    confirmationRepository.findAllByUser.mockResolvedValue([
      refreshed,
      confirmationOf(
        otherChapterId,
        new Date(Date.now() - 200 * 24 * 60 * 60 * 1000),
      ),
    ]);
    completionRepository.findByUser.mockResolvedValue(previousCompletion);

    const result = await confirm();

    expect(result.academyCompleted).toBe(true);
    expect(completionRepository.upsert).not.toHaveBeenCalled();
  });

  it('renews completion after every chapter is reconfirmed', async () => {
    const otherChapterId = randomUUID();
    const previousCompletion = new AcademyCompletion({
      userId,
      completedAt: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000),
    });
    const refreshed = confirmationOf(chapter.id);
    chapterRepository.findAllIds.mockResolvedValue([
      chapter.id,
      otherChapterId,
    ]);
    confirmationRepository.upsert.mockResolvedValue(refreshed);
    confirmationRepository.findAllByUser.mockResolvedValue([
      refreshed,
      confirmationOf(otherChapterId),
    ]);
    completionRepository.findByUser.mockResolvedValue(previousCompletion);

    const result = await confirm();

    expect(result.academyCompleted).toBe(true);
    expect(completionRepository.upsert).toHaveBeenCalledWith(
      expect.any(AcademyCompletion),
    );
  });

  it('does not complete an academy with no configured chapters', async () => {
    chapterRepository.findAllIds.mockResolvedValue([]);
    const confirmation = confirmationOf(chapter.id);
    confirmationRepository.upsert.mockResolvedValue(confirmation);
    confirmationRepository.findAllByUser.mockResolvedValue([confirmation]);

    const result = await confirm();

    expect(result.academyCompleted).toBe(false);
    expect(completionRepository.upsert).not.toHaveBeenCalled();
  });
});
