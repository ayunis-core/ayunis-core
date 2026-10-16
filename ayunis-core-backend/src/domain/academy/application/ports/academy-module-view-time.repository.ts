import type { UUID } from 'crypto';
import type { AcademyModuleViewTime } from 'src/domain/academy/domain/academy-module-view-time.entity';

export abstract class AcademyModuleViewTimeRepository {
  abstract findAllByUser(userId: UUID): Promise<AcademyModuleViewTime[]>;

  /**
   * Stamps the heartbeat and credits the time since the learner's latest
   * heartbeat on any course module, capped at `maxIncrementSeconds`. One
   * clock per learner means videos open at once split the time instead of
   * each earning it, and no client-reported duration is trusted. A session
   * start only stamps the clock, so a closed or hidden gap is never credited.
   */
  abstract recordHeartbeat(params: {
    userId: UUID;
    courseModuleId: UUID;
    sessionStart: boolean;
    maxIncrementSeconds: number;
  }): Promise<void>;

  abstract deleteAllByUser(userId: UUID): Promise<void>;
}
