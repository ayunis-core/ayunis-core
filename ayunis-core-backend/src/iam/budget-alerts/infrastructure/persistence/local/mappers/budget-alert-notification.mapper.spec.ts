import {
  OrgBudgetAlertNotification,
  TeamBudgetAlertNotification,
  UserBudgetAlertNotification,
} from '../../../../domain/budget-alert-notification.entity';
import {
  OrgBudgetAlertNotificationRecord,
  TeamBudgetAlertNotificationRecord,
  UserBudgetAlertNotificationRecord,
} from '../schema/budget-alert-notification.record';
import { BudgetAlertNotificationMapper } from './budget-alert-notification.mapper';

describe('BudgetAlertNotificationMapper', () => {
  const mapper = new BudgetAlertNotificationMapper();

  it('preserves user subtype fields on a domain → record → domain round-trip', () => {
    const original = new UserBudgetAlertNotification({
      id: '33333333-3333-3333-3333-333333333333',
      orgId: '11111111-1111-1111-1111-111111111111',
      userId: '22222222-2222-2222-2222-222222222222',
      threshold: 80,
      periodStart: new Date('2026-07-01T00:00:00.000Z'),
      createdAt: new Date('2026-07-07T03:00:00.000Z'),
      updatedAt: new Date('2026-07-07T03:00:00.000Z'),
    });

    const record = mapper.toRecord(original);
    expect(record).toBeInstanceOf(UserBudgetAlertNotificationRecord);
    expect((record as UserBudgetAlertNotificationRecord).userId).toBe(
      original.userId,
    );

    const roundTripped = mapper.toDomain(record);

    expect(roundTripped).toEqual(original);
  });

  it('maps organization notifications to the organization subtype', () => {
    const notification = new OrgBudgetAlertNotification({
      orgId: '11111111-1111-1111-1111-111111111111',
      threshold: 80,
      periodStart: new Date('2026-07-01T00:00:00.000Z'),
    });

    const record = mapper.toRecord(notification);

    expect(record).toBeInstanceOf(OrgBudgetAlertNotificationRecord);
  });

  it('maps team notifications to the team subtype', () => {
    const notification = new TeamBudgetAlertNotification({
      orgId: '11111111-1111-1111-1111-111111111111',
      teamId: '33333333-3333-3333-3333-333333333333',
      threshold: 80,
      periodStart: new Date('2026-07-01T00:00:00.000Z'),
    });

    const record = mapper.toRecord(notification);

    expect(record).toBeInstanceOf(TeamBudgetAlertNotificationRecord);
    expect((record as TeamBudgetAlertNotificationRecord).teamId).toBe(
      notification.teamId,
    );
  });
});
