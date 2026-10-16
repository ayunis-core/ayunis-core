import type { UUID } from 'crypto';

/**
 * How long a learner had a course module's page open and visible. This is
 * page time, not watch time: Loom embeds expose no playback events.
 */
export class AcademyModuleViewTime {
  public readonly userId: UUID;
  public readonly courseModuleId: UUID;
  public readonly visibleSeconds: number;

  constructor(params: {
    userId: UUID;
    courseModuleId: UUID;
    visibleSeconds: number;
  }) {
    this.userId = params.userId;
    this.courseModuleId = params.courseModuleId;
    this.visibleSeconds = params.visibleSeconds;
  }
}
