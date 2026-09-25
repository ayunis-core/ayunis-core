import { Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import { UserCreatedEvent } from 'src/iam/users/application/events/user-created.event';
import type { User } from 'src/iam/users/domain/user.entity';
import { WorkspaceTutorialUserCreatedListener } from './workspace-tutorial-user-created.listener';

const USER_ID = '00000000-0000-0000-0000-000000000001' as UUID;
const ORG_ID = '00000000-0000-0000-0000-000000000002' as UUID;
const event = new UserCreatedEvent(USER_ID, ORG_ID, {} as User);

describe(WorkspaceTutorialUserCreatedListener.name, () => {
  const provisioning = { provisionFor: jest.fn().mockResolvedValue(undefined) };
  const makeListener = (workspacesEnabled: boolean) =>
    new WorkspaceTutorialUserCreatedListener(
      provisioning as never,
      {
        workspacesEnabled,
      } as never,
    );

  beforeEach(() => jest.clearAllMocks());
  afterEach(() => jest.restoreAllMocks());

  it('provisions the tutorial for the new user', async () => {
    await makeListener(true).handleUserCreated(event);
    expect(provisioning.provisionFor).toHaveBeenCalledWith(USER_ID, ORG_ID);
  });

  it('does nothing while workspaces are disabled', async () => {
    await makeListener(false).handleUserCreated(event);
    expect(provisioning.provisionFor).not.toHaveBeenCalled();
  });

  it('logs a provisioning failure without rethrowing', async () => {
    const errorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();
    const failure = new Error('resource creation failed');
    provisioning.provisionFor.mockRejectedValueOnce(failure);

    await expect(
      makeListener(true).handleUserCreated(event),
    ).resolves.toBeUndefined();
    expect(errorSpy).toHaveBeenCalledWith(
      expect.objectContaining({ userId: USER_ID, orgId: ORG_ID, err: failure }),
      'Failed to provision workspace tutorial',
    );
  });
});
