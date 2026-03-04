import { SkillTemplateUserCreatedListener } from './user-created.listener';
import type { SkillTemplateInstallationService } from '../services/skill-template-installation.service';
import { UserCreatedEvent } from 'src/iam/users/application/events/user-created.event';
import { randomUUID } from 'crypto';

describe('SkillTemplateUserCreatedListener', () => {
  let listener: SkillTemplateUserCreatedListener;
  let installationService: jest.Mocked<SkillTemplateInstallationService>;

  beforeEach(() => {
    installationService = {
      installAllPreCreatedForUser: jest.fn().mockResolvedValue(2),
    } as unknown as jest.Mocked<SkillTemplateInstallationService>;

    listener = new SkillTemplateUserCreatedListener(installationService);
  });

  it('should call installAllPreCreatedForUser with the user ID', async () => {
    const userId = randomUUID();
    const orgId = randomUUID();
    const event = new UserCreatedEvent(userId, orgId);

    await listener.handleUserCreated(event);

    expect(
      installationService.installAllPreCreatedForUser,
    ).toHaveBeenCalledWith(userId);
  });

  it('should not throw when installation service fails', async () => {
    installationService.installAllPreCreatedForUser.mockRejectedValue(
      new Error('Unexpected error'),
    );

    const event = new UserCreatedEvent(randomUUID(), randomUUID());

    await expect(listener.handleUserCreated(event)).resolves.toBeUndefined();
  });
});
