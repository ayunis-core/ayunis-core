import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { UpdateLessonUseCase } from './update-lesson.use-case';
import { UpdateLessonCommand } from './update-lesson.command';
import { AcademyLessonRepository } from '../../ports/academy-lesson.repository';
import { AcademyLesson } from '../../../domain/academy-lesson.entity';
import { LessonNotFoundError } from '../../academy.errors';

describe('UpdateLessonUseCase', () => {
  let useCase: UpdateLessonUseCase;
  let lessonRepository: jest.Mocked<AcademyLessonRepository>;

  beforeAll(async () => {
    const mockLessonRepository = {
      findOne: jest.fn(),
      update: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UpdateLessonUseCase,
        { provide: AcademyLessonRepository, useValue: mockLessonRepository },
      ],
    }).compile();

    useCase = module.get<UpdateLessonUseCase>(UpdateLessonUseCase);
    lessonRepository = module.get(AcademyLessonRepository);

    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should preserve the existing description when the update omits it', async () => {
    const existing = new AcademyLesson({
      chapterId: randomUUID(),
      title: 'Initial onboarding tour',
      description: 'A walkthrough of the academy basics',
      loomUrl: 'https://www.loom.com/share/initial-tour',
      position: 2,
    });
    lessonRepository.findOne.mockResolvedValue(existing);
    lessonRepository.update.mockImplementation(
      async (lesson: AcademyLesson) => lesson,
    );

    const result = await useCase.execute(
      new UpdateLessonCommand({
        lessonId: existing.id,
        title: 'Updated onboarding tour',
        loomUrl: 'https://www.loom.com/share/updated-tour',
      }),
    );

    expect(result.description).toBe('A walkthrough of the academy basics');
  });

  it('should clear the description when the update explicitly sets it to null', async () => {
    const existing = new AcademyLesson({
      chapterId: randomUUID(),
      title: 'Initial prompt library tour',
      description: 'A walkthrough of reusable prompts',
      loomUrl: 'https://www.loom.com/share/prompt-library',
      position: 1,
    });
    lessonRepository.findOne.mockResolvedValue(existing);
    lessonRepository.update.mockImplementation(
      async (lesson: AcademyLesson) => lesson,
    );

    const result = await useCase.execute(
      new UpdateLessonCommand({
        lessonId: existing.id,
        title: 'Updated prompt library tour',
        description: null,
        loomUrl: 'https://www.loom.com/share/updated-prompt-library',
      }),
    );

    expect(result.description).toBeNull();
  });

  it('should reject updates for a non-existent lesson', async () => {
    lessonRepository.findOne.mockResolvedValue(null);

    await expect(
      useCase.execute(
        new UpdateLessonCommand({
          lessonId: randomUUID(),
          title: 'Missing lesson',
          loomUrl: 'https://www.loom.com/share/missing-lesson',
        }),
      ),
    ).rejects.toThrow(LessonNotFoundError);
    expect(lessonRepository.update).not.toHaveBeenCalled();
  });
});
