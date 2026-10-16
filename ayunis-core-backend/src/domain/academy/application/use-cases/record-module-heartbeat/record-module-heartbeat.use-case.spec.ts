import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'crypto';
import { AcademyCourseModule } from 'src/domain/academy/domain/academy-course-module.entity';
import { AcademyCourseModuleRepository } from 'src/domain/academy/application/ports/academy-course-module.repository';
import { AcademyModuleViewTimeRepository } from 'src/domain/academy/application/ports/academy-module-view-time.repository';
import { CourseModuleNotFoundError } from 'src/domain/academy/application/academy.errors';
import { RecordModuleHeartbeatCommand } from './record-module-heartbeat.command';
import {
  MODULE_HEARTBEAT_INTERVAL_SECONDS,
  RecordModuleHeartbeatUseCase,
} from './record-module-heartbeat.use-case';

describe('RecordModuleHeartbeatUseCase', () => {
  let useCase: RecordModuleHeartbeatUseCase;
  let courseModuleRepository: jest.Mocked<AcademyCourseModuleRepository>;
  let viewTimeRepository: jest.Mocked<AcademyModuleViewTimeRepository>;

  const userId = randomUUID();
  const courseModule = new AcademyCourseModule({
    chapterId: randomUUID(),
    title: 'Prompting basics',
    loomUrl: 'https://www.loom.com/share/abc123',
    position: 0,
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecordModuleHeartbeatUseCase,
        {
          provide: AcademyCourseModuleRepository,
          useValue: { findOne: jest.fn() },
        },
        {
          provide: AcademyModuleViewTimeRepository,
          useValue: { recordHeartbeat: jest.fn() },
        },
      ],
    }).compile();

    useCase = module.get(RecordModuleHeartbeatUseCase);
    courseModuleRepository = module.get(AcademyCourseModuleRepository);
    viewTimeRepository = module.get(AcademyModuleViewTimeRepository);
    courseModuleRepository.findOne.mockResolvedValue(courseModule);
  });

  it.each([true, false])(
    'records a heartbeat capped at one interval (sessionStart=%p)',
    async (sessionStart) => {
      await useCase.execute(
        new RecordModuleHeartbeatCommand({
          userId,
          courseModuleId: courseModule.id,
          sessionStart,
        }),
      );

      expect(viewTimeRepository.recordHeartbeat).toHaveBeenCalledWith({
        userId,
        courseModuleId: courseModule.id,
        sessionStart,
        maxIncrementSeconds: MODULE_HEARTBEAT_INTERVAL_SECONDS,
      });
    },
  );

  it('rejects an unknown course module without recording time', async () => {
    courseModuleRepository.findOne.mockResolvedValue(null);

    await expect(
      useCase.execute(
        new RecordModuleHeartbeatCommand({
          userId,
          courseModuleId: randomUUID(),
          sessionStart: false,
        }),
      ),
    ).rejects.toThrow(CourseModuleNotFoundError);
    expect(viewTimeRepository.recordHeartbeat).not.toHaveBeenCalled();
  });
});
