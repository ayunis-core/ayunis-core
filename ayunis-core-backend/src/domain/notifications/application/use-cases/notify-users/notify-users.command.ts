import type { UUID } from 'crypto';
import type { NotificationType } from 'src/domain/notifications/domain/notification-type.enum';

/** The same notification for every recipient, all of the given organization. */
export class NotifyUsersCommand {
  readonly userIds: UUID[];
  readonly orgId: UUID;
  readonly type: NotificationType;
  readonly headline: string;
  readonly subheadline: string | null;
  readonly body: string;
  readonly workspaceId: UUID | null;

  constructor(params: {
    userIds: UUID[];
    orgId: UUID;
    type: NotificationType;
    headline: string;
    subheadline?: string | null;
    body: string;
    workspaceId?: UUID | null;
  }) {
    this.userIds = params.userIds;
    this.orgId = params.orgId;
    this.type = params.type;
    this.headline = params.headline;
    this.subheadline = params.subheadline ?? null;
    this.body = params.body;
    this.workspaceId = params.workspaceId ?? null;
  }
}
