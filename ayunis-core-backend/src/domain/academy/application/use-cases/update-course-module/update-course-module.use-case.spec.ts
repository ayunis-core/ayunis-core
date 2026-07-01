import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { UpdateCourseModuleUseCase } from './update-course-module.use-case';
import { UpdateCourseModuleCommand } from './update-course-module.command';
import { AcademyCourseModuleRepository } from '../../ports/academy-course-module.repository';
import { AcademyCourseModule } from '../../../domain/academy-course-module.entity';
import { CourseModuleNotFoundError } from '../../academy.errors';

describe('UpdateCourseModuleUseCase', () => {
  let useCase: UpdateCourseModuleUseCase;
  let courseModuleRepository: jest.Mocked<AcademyCourseModuleRepository>;

  beforeAll(async () => {
    const mockCourseModuleRepository = {
      findOne: jest.fn(),
      update: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UpdateCourseModuleUseCase,
        {
          provide: AcademyCourseModuleRepository,
          useValue: mockCourseModuleRepository,
        },
      ],
    }).compile();

    useCase = module.get<UpdateCourseModuleUseCase>(UpdateCourseModuleUseCase);
    courseModuleRepository = module.get(AcademyCourseModuleRepository);

    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should preserve the existing description when the update omits it', async () => {
    const existing = new AcademyCourseModule({
      chapterId: randomUUID(),
      title: 'Initial onboarding tour',
      description: 'A walkthrough of the academy basics',
      loomUrl: 'https://www.loom.com/share/initial-tour',
      position: 2,
    });
    courseModuleRepository.findOne.mockResolvedValue(existing);
    courseModuleRepository.update.mockImplementation(
      async (courseModule: AcademyCourseModule) => courseModule,
    );

    const result = await useCase.execute(
      new UpdateCourseModuleCommand({
        courseModuleId: existing.id,
        title: 'Updated onboarding tour',
        loomUrl: 'https://www.loom.com/share/updated-tour',
      }),
    );

    expect(result.description).toBe('A walkthrough of the academy basics');
  });

  it('should clear the description when the update explicitly sets it to null', async () => {
    const existing = new AcademyCourseModule({
      chapterId: randomUUID(),
      title: 'Initial prompt library tour',
      description: 'A walkthrough of reusable prompts',
      loomUrl: 'https://www.loom.com/share/prompt-library',
      position: 1,
    });
    courseModuleRepository.findOne.mockResolvedValue(existing);
    courseModuleRepository.update.mockImplementation(
      async (courseModule: AcademyCourseModule) => courseModule,
    );

    const result = await useCase.execute(
      new UpdateCourseModuleCommand({
        courseModuleId: existing.id,
        title: 'Updated prompt library tour',
        description: null,
        loomUrl: 'https://www.loom.com/share/updated-prompt-library',
      }),
    );

    expect(result.description).toBeNull();
  });

  it('should reject updates for a non-existent module', async () => {
    courseModuleRepository.findOne.mockResolvedValue(null);

    await expect(
      useCase.execute(
        new UpdateCourseModuleCommand({
          courseModuleId: randomUUID(),
          title: 'Missing module',
          loomUrl: 'https://www.loom.com/share/missing-module',
        }),
      ),
    ).rejects.toThrow(CourseModuleNotFoundError);
    expect(courseModuleRepository.update).not.toHaveBeenCalled();
  });
});
