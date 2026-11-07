import {
  createMockNotificationsRepository,
  TEST_ORG_ID,
  TEST_ROUTINE_ID,
  TEST_ROUTINE_THREAD_ID,
  TEST_USER_ID,
} from 'src/domain/notifications/application/testing/notification.fixtures';
import {
  NotificationInvalidError,
  NotificationLimitReachedError,
} from 'src/domain/notifications/application/notifications.errors';
import { NotificationType } from 'src/domain/notifications/domain/notification-type.enum';
import { NOTIFICATION_HEADLINE_MAX_LENGTH } from 'src/domain/notifications/domain/notifications.constants';
import { CreateNotificationCommand } from './create-notification.command';
import { CreateNotificationUseCase } from './create-notification.use-case';

describe('CreateNotificationUseCase', () => {
  function setup() {
    const repository = createMockNotificationsRepository();
    return { repository, useCase: new CreateNotificationUseCase(repository) };
  }

  function aCommand(
    overrides: Partial<
      ConstructorParameters<typeof CreateNotificationCommand>[0]
    > = {},
  ) {
    return new CreateNotificationCommand({
      userId: TEST_USER_ID,
      orgId: TEST_ORG_ID,
      type: NotificationType.ROUTINE,
      headline: 'Neue Verordnung zur Grundsteuer',
      subheadline: 'GVBl. NRW vom 07.11.2026',
      body: 'Die [Verordnung](https://recht.nrw.de/gvbl/2026-11-07) ändert die Hebesätze.',
      routineId: TEST_ROUTINE_ID,
      routineThreadId: TEST_ROUTINE_THREAD_ID,
      ...overrides,
    });
  }

  it('stores an unread notification for the recipient with its origin', async () => {
    const { repository, useCase } = setup();

    const created = await useCase.execute(aCommand());

    expect(repository.create).toHaveBeenCalledTimes(1);
    expect(created).toMatchObject({
      userId: TEST_USER_ID,
      orgId: TEST_ORG_ID,
      type: NotificationType.ROUTINE,
      headline: 'Neue Verordnung zur Grundsteuer',
      routineId: TEST_ROUTINE_ID,
      routineThreadId: TEST_ROUTINE_THREAD_ID,
      readAt: null,
    });
  });

  it('trims the texts before storing them', async () => {
    const { useCase } = setup();

    const created = await useCase.execute(
      aCommand({ headline: '  Neue Verordnung  ', body: '\nText\n' }),
    );

    expect(created).toMatchObject({
      headline: 'Neue Verordnung',
      body: 'Text',
    });
  });

  it.each([
    ['an empty headline', { headline: '   ' }],
    ['an empty body', { body: '' }],
    [
      'a headline over the limit',
      { headline: 'A'.repeat(NOTIFICATION_HEADLINE_MAX_LENGTH + 1) },
    ],
  ])('rejects %s without writing', async (_label, overrides) => {
    const { repository, useCase } = setup();

    await expect(useCase.execute(aCommand(overrides))).rejects.toThrow(
      NotificationInvalidError,
    );
    expect(repository.create).not.toHaveBeenCalled();
  });

  it('creates within the routine thread limit when one is given', async () => {
    const { repository, useCase } = setup();

    await useCase.execute(aCommand({ limitPerRoutineThread: 3 }));

    expect(repository.createWithinRoutineThreadLimit).toHaveBeenCalledWith(
      expect.objectContaining({ routineThreadId: TEST_ROUTINE_THREAD_ID }),
      3,
    );
    expect(repository.create).not.toHaveBeenCalled();
  });

  it('refuses a notification once the routine thread reached its limit', async () => {
    const { repository, useCase } = setup();
    repository.createWithinRoutineThreadLimit.mockResolvedValue(null);

    await expect(
      useCase.execute(aCommand({ limitPerRoutineThread: 3 })),
    ).rejects.toThrow(NotificationLimitReachedError);
  });

  it('rejects a limit without a routine thread to count against', async () => {
    const { repository, useCase } = setup();

    await expect(
      useCase.execute(
        aCommand({ routineThreadId: null, limitPerRoutineThread: 3 }),
      ),
    ).rejects.toThrow(NotificationInvalidError);
    expect(repository.createWithinRoutineThreadLimit).not.toHaveBeenCalled();
  });

  it('keeps a system notification without origin', async () => {
    const { useCase } = setup();

    const created = await useCase.execute(
      aCommand({
        type: NotificationType.ROUTINE_ERROR,
        routineId: null,
        routineThreadId: null,
      }),
    );

    expect(created).toMatchObject({
      type: NotificationType.ROUTINE_ERROR,
      routineId: null,
      routineThreadId: null,
    });
  });
});
