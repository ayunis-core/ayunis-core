import { randomUUID } from 'crypto';
import {
  createMockNotificationsRepository,
  TEST_ORG_ID,
} from 'src/domain/notifications/application/testing/notification.fixtures';
import { NotificationInvalidError } from 'src/domain/notifications/application/notifications.errors';
import { NotificationType } from 'src/domain/notifications/domain/notification-type.enum';
import { NotifyUsersCommand } from './notify-users.command';
import { NotifyUsersUseCase } from './notify-users.use-case';

const anna = randomUUID();
const ben = randomUUID();
const workspaceId = randomUUID();

describe(NotifyUsersUseCase.name, () => {
  function setup() {
    const repository = createMockNotificationsRepository();
    return { repository, useCase: new NotifyUsersUseCase(repository) };
  }

  function aCommand(
    overrides: Partial<
      ConstructorParameters<typeof NotifyUsersCommand>[0]
    > = {},
  ) {
    return new NotifyUsersCommand({
      userIds: [anna, ben],
      orgId: TEST_ORG_ID,
      type: NotificationType.ORGANIZATION,
      headline: '  Sie wurden zu einem Arbeitsbereich hinzugefügt ',
      subheadline: 'Bürgeranfragen',
      body: 'Clara hat Sie zum Arbeitsbereich „Bürgeranfragen“ hinzugefügt.',
      workspaceId,
      ...overrides,
    });
  }

  it('writes one unread notification per recipient in a single insert', async () => {
    const { repository, useCase } = setup();

    await useCase.execute(aCommand({ userIds: [anna, ben, anna] }));

    expect(repository.createMany).toHaveBeenCalledTimes(1);
    const written = repository.createMany.mock.calls[0][0];
    expect(written.map(({ userId }) => userId)).toEqual([anna, ben]);
    for (const notification of written) {
      expect(notification).toMatchObject({
        orgId: TEST_ORG_ID,
        type: NotificationType.ORGANIZATION,
        headline: 'Sie wurden zu einem Arbeitsbereich hinzugefügt',
        subheadline: 'Bürgeranfragen',
        workspaceId,
        readAt: null,
      });
    }
  });

  it('writes nothing without recipients', async () => {
    const { repository, useCase } = setup();

    await useCase.execute(aCommand({ userIds: [] }));

    expect(repository.createMany).not.toHaveBeenCalled();
  });

  it('rejects an empty body without writing', async () => {
    const { repository, useCase } = setup();

    await expect(useCase.execute(aCommand({ body: ' ' }))).rejects.toThrow(
      NotificationInvalidError,
    );
    expect(repository.createMany).not.toHaveBeenCalled();
  });
});
