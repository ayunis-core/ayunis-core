import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import {
  CourseModuleNotFoundError,
  UnexpectedAcademyError,
} from 'src/domain/academy/application/academy.errors';
import { AcademyCourseModuleRepository } from 'src/domain/academy/application/ports/academy-course-module.repository';
import { AcademyModuleViewTimeRepository } from 'src/domain/academy/application/ports/academy-module-view-time.repository';
import { RecordModuleHeartbeatCommand } from './record-module-heartbeat.command';

/** Must match the frontend heartbeat interval; a late heartbeat earns no more. */
export const MODULE_HEARTBEAT_INTERVAL_SECONDS = 15;

@Injectable()
export class RecordModuleHeartbeatUseCase {
  private readonly logger = new Logger(RecordModuleHeartbeatUseCase.name);

  constructor(
    private readonly courseModuleRepository: AcademyCourseModuleRepository,
    private readonly viewTimeRepository: AcademyModuleViewTimeRepository,
  ) {}

  @HandleUnexpectedErrors(UnexpectedAcademyError)
  async execute(command: RecordModuleHeartbeatCommand): Promise<void> {
    this.logger.log(
      {
        userId: command.userId,
        courseModuleId: command.courseModuleId,
        sessionStart: command.sessionStart,
      },
      'Recording academy module heartbeat',
    );
    const courseModule = await this.courseModuleRepository.findOne(
      command.courseModuleId,
    );
    if (!courseModule) {
      throw new CourseModuleNotFoundError(command.courseModuleId);
    }

    await this.viewTimeRepository.recordHeartbeat({
      userId: command.userId,
      courseModuleId: command.courseModuleId,
      sessionStart: command.sessionStart,
      maxIncrementSeconds: MODULE_HEARTBEAT_INTERVAL_SECONDS,
    });
  }
}
