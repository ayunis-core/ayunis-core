import type { UUID } from 'crypto';

export class RecordModuleHeartbeatCommand {
  public readonly userId: UUID;
  public readonly courseModuleId: UUID;
  public readonly sessionStart: boolean;

  constructor(params: {
    userId: UUID;
    courseModuleId: UUID;
    sessionStart: boolean;
  }) {
    this.userId = params.userId;
    this.courseModuleId = params.courseModuleId;
    this.sessionStart = params.sessionStart;
  }
}
