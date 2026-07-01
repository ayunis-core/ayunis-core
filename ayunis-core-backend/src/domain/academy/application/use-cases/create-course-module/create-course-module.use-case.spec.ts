import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { CreateCourseModuleUseCase } from './create-course-module.use-case';
import { CreateCourseModuleCommand } from './create-course-module.command';
import { AcademyChapterRepository } from '../../ports/academy-chapter.repository';
import { AcademyCourseModuleRepository } from '../../ports/academy-course-module.repository';
import { AcademyChapter } from '../../../domain/academy-chapter.entity';
import { AcademyCourseModule } from '../../../domain/academy-course-module.entity';
import { ChapterNotFoundError } from '../../academy.errors';

describe('CreateCourseModuleUseCase', () => {
  let useCase: CreateCourseModuleUseCase;
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
      findMaxPosition: jest.fn(),
      create: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateCourseModuleUseCase,
        { provide: AcademyChapterRepository, useValue: mockChapterRepository },
        {
          provide: AcademyCourseModuleRepository,
          useValue: mockCourseModuleRepository,
        },
      ],
    }).compile();

    useCase = module.get<CreateCourseModuleUseCase>(CreateCourseModuleUseCase);
    chapterRepository = module.get(AcademyChapterRepository);
    courseModuleRepository = module.get(AcademyCourseModuleRepository);

    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should create a module appended after the last position', async () => {
    chapterRepository.findOne.mockResolvedValue(chapter);
    courseModuleRepository.findMaxPosition.mockResolvedValue(3);
    courseModuleRepository.create.mockImplementation(
      async (courseModule: AcademyCourseModule) => courseModule,
    );

    const result = await useCase.execute(
      new CreateCourseModuleCommand({
        chapterId: chapter.id,
        title: 'Creating your first chat',
        loomUrl: 'https://www.loom.com/share/abc123def456',
      }),
    );

    expect(result.position).toBe(4);
    expect(result.chapterId).toBe(chapter.id);
    expect(result.description).toBeNull();
    expect(courseModuleRepository.create).toHaveBeenCalledWith(
      expect.any(AcademyCourseModule),
    );
  });

  it('should create the first module of a chapter at position 0', async () => {
    chapterRepository.findOne.mockResolvedValue(chapter);
    courseModuleRepository.findMaxPosition.mockResolvedValue(null);
    courseModuleRepository.create.mockImplementation(
      async (courseModule: AcademyCourseModule) => courseModule,
    );

    const result = await useCase.execute(
      new CreateCourseModuleCommand({
        chapterId: chapter.id,
        title: 'Welcome to the academy',
        description: 'A short introduction video',
        loomUrl: 'https://www.loom.com/share/abc123def456',
      }),
    );

    expect(result.position).toBe(0);
    expect(result.description).toBe('A short introduction video');
  });

  it('should reject module creation for a non-existent chapter', async () => {
    chapterRepository.findOne.mockResolvedValue(null);

    await expect(
      useCase.execute(
        new CreateCourseModuleCommand({
          chapterId: randomUUID(),
          title: 'Orphan module',
          loomUrl: 'https://www.loom.com/share/abc123def456',
        }),
      ),
    ).rejects.toThrow(ChapterNotFoundError);
    expect(courseModuleRepository.create).not.toHaveBeenCalled();
  });
});
