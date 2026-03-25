import { SkillTemplateUserCreatedListener } from './user-created.listener';
import type { SkillTemplateInstallationService } from '../services/skill-template-installation.service';
import { UserCreatedEvent } from 'src/iam/users/application/events/user-created.event';
import { User } from 'src/iam/users/domain/user.entity';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import type { UUID } from 'crypto';
import { randomUUID } from 'crypto';

function makeUser(id?: UUID, orgId?: UUID): User {
  return new User({
    id: id ?? randomUUID(),
    email: 'test@example.com',
    emailVerified: true,
    passwordHash: 'hashed',
    role: UserRole.USER,
    orgId: orgId ?? randomUUID(),
    name: 'Test User',
    hasAcceptedMarketing: false,
  });
}

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
    const user = makeUser(userId, orgId);
    const event = new UserCreatedEvent(userId, orgId, user);

    await listener.handleUserCreated(event);

    expect(
      installationService.installAllPreCreatedForUser,
    ).toHaveBeenCalledWith(userId);
  });

  it('should not throw when installation service fails', async () => {
    installationService.installAllPreCreatedForUser.mockRejectedValue(
      new Error('Unexpected error'),
    );

    const userId = randomUUID();
    const orgId = randomUUID();
    const event = new UserCreatedEvent(userId, orgId, makeUser(userId, orgId));

    await expect(listener.handleUserCreated(event)).resolves.toBeUndefined();
  });
});
