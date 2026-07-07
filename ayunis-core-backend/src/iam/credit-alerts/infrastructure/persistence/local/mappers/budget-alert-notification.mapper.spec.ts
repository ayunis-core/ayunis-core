import { BudgetAlertNotification } from '../../../../domain/budget-alert-notification.entity';
import { BudgetAlertScope } from '../../../../domain/value-objects/budget-alert-scope.enum';
import { BudgetAlertNotificationMapper } from './budget-alert-notification.mapper';

describe('BudgetAlertNotificationMapper', () => {
  const mapper = new BudgetAlertNotificationMapper();

  it('preserves all fields on a domain → record → domain round-trip', () => {
    const original = new BudgetAlertNotification({
      id: '33333333-3333-3333-3333-333333333333',
      orgId: '11111111-1111-1111-1111-111111111111',
      scope: BudgetAlertScope.USER,
      targetId: '22222222-2222-2222-2222-222222222222',
      threshold: 80,
      periodStart: new Date('2026-07-01T00:00:00.000Z'),
      createdAt: new Date('2026-07-07T03:00:00.000Z'),
      updatedAt: new Date('2026-07-07T03:00:00.000Z'),
    });

    const roundTripped = mapper.toDomain(mapper.toRecord(original));

    expect(roundTripped).toEqual(original);
  });
});
