import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService, type ConfigType } from '@nestjs/config';
import type { UUID } from 'crypto';
import { appConfig } from 'src/config/app.config';
import { FeatureFlag } from 'src/config/features.config';
import { CreateNotificationCommand } from 'src/domain/notifications/application/use-cases/create-notification/create-notification.command';
import { CreateNotificationUseCase } from 'src/domain/notifications/application/use-cases/create-notification/create-notification.use-case';
import { NotificationType } from 'src/domain/notifications/domain/notification-type.enum';
import type { Routine } from 'src/domain/routines/domain/routine.entity';
import { routineFailureNotification } from 'src/domain/routines/domain/routine-failure-notification';

export interface RoutineFailure {
  routine: Pick<Routine, 'id' | 'userId' | 'orgId' | 'name'>;
  failureReason: string;
  /** This failure paused the routine. */
  paused: boolean;
  /** The thread of the failed run, if it got that far. */
  routineThreadId: UUID | null;
}

/** Tells a routine's owner in their inbox that a run failed. */
@Injectable()
export class RoutineFailureNotifier {
  private readonly logger = new Logger(RoutineFailureNotifier.name);

  constructor(
    private readonly createNotificationUseCase: CreateNotificationUseCase,
    private readonly configService: ConfigService,
    @Inject(appConfig.KEY)
    private readonly app: ConfigType<typeof appConfig>,
  ) {}

  /**
   * Best effort: the failure is already recorded on the routine, and a
   * notification that cannot be posted must not fail the run's bookkeeping.
   */
  async notify(failure: RoutineFailure): Promise<void> {
    if (!this.configService.get<boolean>(`features.${FeatureFlag.Routines}`)) {
      return;
    }
    const { routine } = failure;
    const text = routineFailureNotification({
      routineName: routine.name,
      failureReason: failure.failureReason,
      paused: failure.paused,
      hasRoutineThread: failure.routineThreadId !== null,
      routinesUrl: `${this.app.frontend.baseUrl}/routines`,
    });
    try {
      await this.createNotificationUseCase.execute(
        new CreateNotificationCommand({
          userId: routine.userId,
          orgId: routine.orgId,
          type: NotificationType.ROUTINE_ERROR,
          ...text,
          routineId: routine.id,
          routineThreadId: failure.routineThreadId,
        }),
      );
    } catch (error) {
      this.logger.error(
        { routineId: routine.id, err: error as Error },
        'Could not post the routine failure notification',
      );
    }
  }
}
