import { aNotification } from 'src/domain/notifications/application/testing/notification.fixtures';
import { NotificationMapper } from './notification.mapper';

describe('NotificationMapper', () => {
  it('keeps every field through a record round trip', () => {
    const mapper = new NotificationMapper();
    const notification = aNotification({
      readAt: new Date('2026-11-07T09:00:00.000Z'),
    });

    expect(mapper.toDomain(mapper.toRecord(notification))).toEqual(
      notification,
    );
  });
});
