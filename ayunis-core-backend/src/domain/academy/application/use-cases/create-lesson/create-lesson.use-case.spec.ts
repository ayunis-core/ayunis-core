import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { CreateLessonUseCase } from './create-lesson.use-case';
import { CreateLessonCommand } from './create-lesson.command';
import { AcademyChapterRepository } from '../../ports/academy-chapter.repository';
import { AcademyLessonRepository } from '../../ports/academy-lesson.repository';
import { AcademyChapter } from '../../../domain/academy-chapter.entity';
import { AcademyLesson } from '../../../domain/academy-lesson.entity';
import { ChapterNotFoundError } from '../../academy.errors';

describe('CreateLessonUseCase', () => {
  let useCase: CreateLessonUseCase;
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
      findMaxPosition: jest.fn(),
      create: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateLessonUseCase,
        { provide: AcademyChapterRepository, useValue: mockChapterRepository },
        { provide: AcademyLessonRepository, useValue: mockLessonRepository },
      ],
    }).compile();

    useCase = module.get<CreateLessonUseCase>(CreateLessonUseCase);
    chapterRepository = module.get(AcademyChapterRepository);
    lessonRepository = module.get(AcademyLessonRepository);

    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should create a lesson appended after the last position', async () => {
    chapterRepository.findOne.mockResolvedValue(chapter);
    lessonRepository.findMaxPosition.mockResolvedValue(3);
    lessonRepository.create.mockImplementation(
      async (lesson: AcademyLesson) => lesson,
    );

    const result = await useCase.execute(
      new CreateLessonCommand({
        chapterId: chapter.id,
        title: 'Creating your first chat',
        loomUrl: 'https://www.loom.com/share/abc123def456',
      }),
    );

    expect(result.position).toBe(4);
    expect(result.chapterId).toBe(chapter.id);
    expect(result.description).toBeNull();
    expect(lessonRepository.create).toHaveBeenCalledWith(
      expect.any(AcademyLesson),
    );
  });

  it('should create the first lesson of a chapter at position 0', async () => {
    chapterRepository.findOne.mockResolvedValue(chapter);
    lessonRepository.findMaxPosition.mockResolvedValue(null);
    lessonRepository.create.mockImplementation(
      async (lesson: AcademyLesson) => lesson,
    );

    const result = await useCase.execute(
      new CreateLessonCommand({
        chapterId: chapter.id,
        title: 'Welcome to the academy',
        description: 'A short introduction video',
        loomUrl: 'https://www.loom.com/share/abc123def456',
      }),
    );

    expect(result.position).toBe(0);
    expect(result.description).toBe('A short introduction video');
  });

  it('should reject lesson creation for a non-existent chapter', async () => {
    chapterRepository.findOne.mockResolvedValue(null);

    await expect(
      useCase.execute(
        new CreateLessonCommand({
          chapterId: randomUUID(),
          title: 'Orphan lesson',
          loomUrl: 'https://www.loom.com/share/abc123def456',
        }),
      ),
    ).rejects.toThrow(ChapterNotFoundError);
    expect(lessonRepository.create).not.toHaveBeenCalled();
  });
});
