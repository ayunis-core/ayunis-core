jest.mock('@nestjs-cls/transactional', () => ({
  Transactional:
    () => (_target: unknown, _key: string, descriptor: PropertyDescriptor) =>
      descriptor,
}));
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'crypto';
import type { UUID } from 'crypto';
import { AcademyChapter } from 'src/domain/academy/domain/academy-chapter.entity';
import { AcademyChapterConfirmation } from 'src/domain/academy/domain/academy-chapter-confirmation.entity';
import { AcademyCompletion } from 'src/domain/academy/domain/academy-completion.entity';
import { AcademyCourseModule } from 'src/domain/academy/domain/academy-course-module.entity';
import { AcademyModuleViewTime } from 'src/domain/academy/domain/academy-module-view-time.entity';
import { AcademyChapterRepository } from 'src/domain/academy/application/ports/academy-chapter.repository';
import { AcademyChapterConfirmationRepository } from 'src/domain/academy/application/ports/academy-chapter-confirmation.repository';
import { AcademyCompletionRepository } from 'src/domain/academy/application/ports/academy-completion.repository';
import { AcademyModuleViewTimeRepository } from 'src/domain/academy/application/ports/academy-module-view-time.repository';
import {
  ChapterModulesBelowMinimumTimeError,
  ChapterNotFoundError,
} from 'src/domain/academy/application/academy.errors';
import { GetAcademyMinimumModuleSecondsUseCase } from 'src/iam/platform-config/application/use-cases/get-academy-minimum-module-seconds/get-academy-minimum-module-seconds.use-case';
import { ConfirmChapterCommand } from './confirm-chapter.command';
import { ConfirmChapterUseCase } from './confirm-chapter.use-case';

describe('ConfirmChapterUseCase', () => {
  let useCase: ConfirmChapterUseCase;
  let chapterRepository: jest.Mocked<AcademyChapterRepository>;
  let confirmationRepository: jest.Mocked<AcademyChapterConfirmationRepository>;
  let completionRepository: jest.Mocked<AcademyCompletionRepository>;
  let viewTimeRepository: jest.Mocked<AcademyModuleViewTimeRepository>;
  let getMinimumModuleSeconds: jest.Mocked<GetAcademyMinimumModuleSecondsUseCase>;

  const userId = randomUUID();
  const chapter = new AcademyChapter({
    title: 'Responsible AI basics',
    description: 'How to use AI systems responsibly in public administration',
    position: 0,
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConfirmChapterUseCase,
        {
          provide: AcademyChapterRepository,
          useValue: { findOne: jest.fn(), findAllIds: jest.fn() },
        },
        {
          provide: AcademyChapterConfirmationRepository,
          useValue: {
            upsert: jest.fn(),
            findAllByUser: jest.fn(),
            lockForUser: jest.fn(),
          },
        },
        {
          provide: AcademyCompletionRepository,
          useValue: { findByUser: jest.fn(), upsert: jest.fn() },
        },
        {
          provide: AcademyModuleViewTimeRepository,
          useValue: { findAllByUser: jest.fn(), deleteAllByUser: jest.fn() },
        },
        {
          provide: GetAcademyMinimumModuleSecondsUseCase,
          useValue: { execute: jest.fn() },
        },
      ],
    }).compile();

    useCase = module.get(ConfirmChapterUseCase);
    chapterRepository = module.get(AcademyChapterRepository);
    confirmationRepository = module.get(AcademyChapterConfirmationRepository);
    completionRepository = module.get(AcademyCompletionRepository);
    viewTimeRepository = module.get(AcademyModuleViewTimeRepository);
    getMinimumModuleSeconds = module.get(GetAcademyMinimumModuleSecondsUseCase);

    chapterRepository.findOne.mockResolvedValue(chapter);
    chapterRepository.findAllIds.mockResolvedValue([chapter.id]);
    confirmationRepository.upsert.mockImplementation(
      async (confirmation) => confirmation,
    );
    completionRepository.findByUser.mockResolvedValue(null);
    completionRepository.upsert.mockImplementation(
      async (completion) => completion,
    );
    viewTimeRepository.findAllByUser.mockResolvedValue([]);
    getMinimumModuleSeconds.execute.mockResolvedValue(60);
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
    confirmationRepository.findAllByUser
      .mockResolvedValueOnce([])
      .mockResolvedValue([confirmation]);

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
    confirmationRepository.findAllByUser
      .mockResolvedValueOnce([])
      .mockResolvedValue([confirmation]);

    await expect(confirm()).resolves.toMatchObject({ chapterId: chapter.id });
    await expect(confirm()).resolves.toMatchObject({
      chapterId: chapter.id,
      confirmedAt: confirmation.confirmedAt,
    });

    expect(confirmationRepository.upsert).toHaveBeenCalledTimes(1);
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
    expect(viewTimeRepository.deleteAllByUser).toHaveBeenCalledWith(userId);
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
    expect(viewTimeRepository.deleteAllByUser).not.toHaveBeenCalled();
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

  describe('minimum time per video page', () => {
    const firstModule = courseModuleOf(0);
    const secondModule = courseModuleOf(1);
    const chapterWithModules = new AcademyChapter({
      title: 'Prompting',
      description: 'Writing good prompts',
      position: 1,
      courseModules: [firstModule, secondModule],
    });

    function courseModuleOf(position: number): AcademyCourseModule {
      return new AcademyCourseModule({
        chapterId: randomUUID(),
        title: `Video ${position + 1}`,
        loomUrl: 'https://www.loom.com/share/abc123',
        position,
      });
    }

    function viewTimeOf(
      courseModule: AcademyCourseModule,
      visibleSeconds: number,
    ): AcademyModuleViewTime {
      return new AcademyModuleViewTime({
        userId,
        courseModuleId: courseModule.id,
        visibleSeconds,
      });
    }

    beforeEach(() => {
      chapterRepository.findOne.mockResolvedValue(chapterWithModules);
      chapterRepository.findAllIds.mockResolvedValue([chapterWithModules.id]);
      confirmationRepository.findAllByUser.mockResolvedValue([]);
    });

    it('rejects the confirmation and names every module still short', async () => {
      viewTimeRepository.findAllByUser.mockResolvedValue([
        viewTimeOf(firstModule, 59.9),
      ]);

      const result = confirm(chapterWithModules.id);

      await expect(result).rejects.toThrow(ChapterModulesBelowMinimumTimeError);
      await expect(result).rejects.toMatchObject({
        metadata: {
          courseModuleIds: [firstModule.id, secondModule.id],
          minimumSeconds: 60,
        },
      });
      expect(confirmationRepository.upsert).not.toHaveBeenCalled();
    });

    it('confirms once every module has reached the minimum', async () => {
      viewTimeRepository.findAllByUser.mockResolvedValue([
        viewTimeOf(firstModule, 60),
        viewTimeOf(secondModule, 300),
      ]);

      await expect(confirm(chapterWithModules.id)).resolves.toMatchObject({
        chapterId: chapterWithModules.id,
      });
      expect(confirmationRepository.upsert).toHaveBeenCalled();
    });

    it('confirms without recorded time when the minimum is 0', async () => {
      getMinimumModuleSeconds.execute.mockResolvedValue(0);

      await expect(confirm(chapterWithModules.id)).resolves.toMatchObject({
        chapterId: chapterWithModules.id,
      });
    });

    it('replays a confirmation made moments ago even after time was reset', async () => {
      const recent = confirmationOf(
        chapterWithModules.id,
        new Date(Date.now() - 60 * 1000),
      );
      confirmationRepository.findAllByUser.mockResolvedValue([recent]);
      completionRepository.findByUser.mockResolvedValue(
        new AcademyCompletion({ userId, completedAt: new Date() }),
      );

      const result = await confirm(chapterWithModules.id);

      expect(result).toMatchObject({
        chapterId: chapterWithModules.id,
        confirmedAt: recent.confirmedAt,
      });
      expect(confirmationRepository.upsert).not.toHaveBeenCalled();
      expect(viewTimeRepository.deleteAllByUser).not.toHaveBeenCalled();
    });

    it('requires the minimum time again to renew an older confirmation', async () => {
      confirmationRepository.findAllByUser.mockResolvedValue([
        confirmationOf(
          chapterWithModules.id,
          new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        ),
      ]);

      await expect(confirm(chapterWithModules.id)).rejects.toThrow(
        ChapterModulesBelowMinimumTimeError,
      );
      expect(confirmationRepository.upsert).not.toHaveBeenCalled();
    });

    it('keeps a chapter without modules confirmable', async () => {
      chapterRepository.findOne.mockResolvedValue(chapter);

      await expect(confirm()).resolves.toMatchObject({ chapterId: chapter.id });
      expect(viewTimeRepository.findAllByUser).not.toHaveBeenCalled();
    });
  });
});
