import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { ReorderCourseModulesUseCase } from './reorder-course-modules.use-case';
import { ReorderCourseModulesCommand } from './reorder-course-modules.command';
import { AcademyChapterRepository } from '../../ports/academy-chapter.repository';
import { AcademyCourseModuleRepository } from '../../ports/academy-course-module.repository';
import { AcademyChapter } from 'src/domain/academy/domain/academy-chapter.entity';
import {
  ChapterNotFoundError,
  InvalidReorderError,
} from '../../academy.errors';

describe('ReorderCourseModulesUseCase', () => {
  let useCase: ReorderCourseModulesUseCase;
  let chapterRepository: jest.Mocked<AcademyChapterRepository>;
  let courseModuleRepository: jest.Mocked<AcademyCourseModuleRepository>;

  const chapter = new AcademyChapter({
    title: 'Getting Started',
    description: 'Basics of Ayunis Core',
    position: 0,
  });

  beforeAll(async () => {
    const mockChapterRepository = {
      findOne: jest.fn(),
    };
    const mockCourseModuleRepository = {
      findIdsByChapterId: jest.fn(),
      updatePositions: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReorderCourseModulesUseCase,
        { provide: AcademyChapterRepository, useValue: mockChapterRepository },
        {
          provide: AcademyCourseModuleRepository,
          useValue: mockCourseModuleRepository,
        },
      ],
    }).compile();

    useCase = module.get<ReorderCourseModulesUseCase>(
      ReorderCourseModulesUseCase,
    );
    chapterRepository = module.get(AcademyChapterRepository);
    courseModuleRepository = module.get(AcademyCourseModuleRepository);

    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should persist the submitted order scoped to the chapter', async () => {
    const courseModuleIds = [randomUUID(), randomUUID()];
    chapterRepository.findOne.mockResolvedValue(chapter);
    courseModuleRepository.findIdsByChapterId.mockResolvedValue(
      courseModuleIds,
    );
    const reversed = [...courseModuleIds].reverse();

    await useCase.execute(
      new ReorderCourseModulesCommand({
        chapterId: chapter.id,
        courseModuleIds: reversed,
      }),
    );

    expect(courseModuleRepository.updatePositions).toHaveBeenCalledWith(
      chapter.id,
      reversed,
    );
  });

  it('should reject reordering modules of a non-existent chapter', async () => {
    chapterRepository.findOne.mockResolvedValue(null);

    await expect(
      useCase.execute(
        new ReorderCourseModulesCommand({
          chapterId: randomUUID(),
          courseModuleIds: [randomUUID()],
        }),
      ),
    ).rejects.toThrow(ChapterNotFoundError);
    expect(courseModuleRepository.updatePositions).not.toHaveBeenCalled();
  });

  it('should reject a reorder containing a module from another chapter', async () => {
    const courseModuleIds = [randomUUID(), randomUUID()];
    chapterRepository.findOne.mockResolvedValue(chapter);
    courseModuleRepository.findIdsByChapterId.mockResolvedValue(
      courseModuleIds,
    );

    await expect(
      useCase.execute(
        new ReorderCourseModulesCommand({
          chapterId: chapter.id,
          courseModuleIds: [
            courseModuleIds[0],
            courseModuleIds[1],
            randomUUID(),
          ],
        }),
      ),
    ).rejects.toThrow(InvalidReorderError);
    expect(courseModuleRepository.updatePositions).not.toHaveBeenCalled();
  });

  it('should reject a reorder that omits a module of the chapter', async () => {
    const courseModuleIds = [randomUUID(), randomUUID()];
    chapterRepository.findOne.mockResolvedValue(chapter);
    courseModuleRepository.findIdsByChapterId.mockResolvedValue(
      courseModuleIds,
    );

    await expect(
      useCase.execute(
        new ReorderCourseModulesCommand({
          chapterId: chapter.id,
          courseModuleIds: [courseModuleIds[0]],
        }),
      ),
    ).rejects.toThrow(InvalidReorderError);
    expect(courseModuleRepository.updatePositions).not.toHaveBeenCalled();
  });
});
