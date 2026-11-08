import type { UUID } from 'crypto';

export class DownloadNotificationImageQuery {
  constructor(public readonly notificationId: UUID) {}
}
