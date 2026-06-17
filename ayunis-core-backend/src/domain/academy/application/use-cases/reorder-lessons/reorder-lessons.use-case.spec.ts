import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { ReorderLessonsUseCase } from './reorder-lessons.use-case';
import { ReorderLessonsCommand } from './reorder-lessons.command';
import { AcademyChapterRepository } from '../../ports/academy-chapter.repository';
import { AcademyLessonRepository } from '../../ports/academy-lesson.repository';
import { AcademyChapter } from '../../../domain/academy-chapter.entity';
import {
  ChapterNotFoundError,
  InvalidReorderError,
} from '../../academy.errors';

describe('ReorderLessonsUseCase', () => {
  let useCase: ReorderLessonsUseCase;
  let chapterRepository: jest.Mocked<AcademyChapterRepository>;
  let lessonRepository: jest.Mocked<AcademyLessonRepository>;

  const chapter = new AcademyChapter({
    title: 'Getting Started',
    description: 'Basics of Ayunis Core',
    position: 0,
  });

  beforeAll(async () => {
    const mockChapterRepository = {
      findOne: jest.fn(),
    };
    const mockLessonRepository = {
      findIdsByChapterId: jest.fn(),
      updatePositions: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReorderLessonsUseCase,
        { provide: AcademyChapterRepository, useValue: mockChapterRepository },
        { provide: AcademyLessonRepository, useValue: mockLessonRepository },
      ],
    }).compile();

    useCase = module.get<ReorderLessonsUseCase>(ReorderLessonsUseCase);
    chapterRepository = module.get(AcademyChapterRepository);
    lessonRepository = module.get(AcademyLessonRepository);

    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should persist the submitted order scoped to the chapter', async () => {
    const lessonIds = [randomUUID(), randomUUID()];
    chapterRepository.findOne.mockResolvedValue(chapter);
    lessonRepository.findIdsByChapterId.mockResolvedValue(lessonIds);
    const reversed = [...lessonIds].reverse();

    await useCase.execute(
      new ReorderLessonsCommand({ chapterId: chapter.id, lessonIds: reversed }),
    );

    expect(lessonRepository.updatePositions).toHaveBeenCalledWith(
      chapter.id,
      reversed,
    );
  });

  it('should reject reordering lessons of a non-existent chapter', async () => {
    chapterRepository.findOne.mockResolvedValue(null);

    await expect(
      useCase.execute(
        new ReorderLessonsCommand({
          chapterId: randomUUID(),
          lessonIds: [randomUUID()],
        }),
      ),
    ).rejects.toThrow(ChapterNotFoundError);
    expect(lessonRepository.updatePositions).not.toHaveBeenCalled();
  });

  it('should reject a reorder containing a lesson from another chapter', async () => {
    const lessonIds = [randomUUID(), randomUUID()];
    chapterRepository.findOne.mockResolvedValue(chapter);
    lessonRepository.findIdsByChapterId.mockResolvedValue(lessonIds);

    await expect(
      useCase.execute(
        new ReorderLessonsCommand({
          chapterId: chapter.id,
          lessonIds: [lessonIds[0], lessonIds[1], randomUUID()],
        }),
      ),
    ).rejects.toThrow(InvalidReorderError);
    expect(lessonRepository.updatePositions).not.toHaveBeenCalled();
  });

  it('should reject a reorder that omits a lesson of the chapter', async () => {
    const lessonIds = [randomUUID(), randomUUID()];
    chapterRepository.findOne.mockResolvedValue(chapter);
    lessonRepository.findIdsByChapterId.mockResolvedValue(lessonIds);

    await expect(
      useCase.execute(
        new ReorderLessonsCommand({
          chapterId: chapter.id,
          lessonIds: [lessonIds[0]],
        }),
      ),
    ).rejects.toThrow(InvalidReorderError);
    expect(lessonRepository.updatePositions).not.toHaveBeenCalled();
  });
});
