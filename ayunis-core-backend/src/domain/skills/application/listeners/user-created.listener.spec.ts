import { UserCreatedListener } from './user-created.listener';
import { UserCreatedEvent } from 'src/iam/users/application/events/user-created.event';
import type { MarketplaceSkillInstallationService } from '../services/marketplace-skill-installation.service';
import { User } from 'src/iam/users/domain/user.entity';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import type { UUID } from 'crypto';

const USER_ID = '00000000-0000-0000-0000-000000000001' as UUID;
const ORG_ID = '00000000-0000-0000-0000-000000000002' as UUID;

function makeUser(): User {
  return new User({
    id: USER_ID,
    email: 'test@example.com',
    emailVerified: true,
    passwordHash: 'hashed',
    role: UserRole.USER,
    orgId: ORG_ID,
    name: 'Test User',
    hasAcceptedMarketing: false,
  });
}

describe('UserCreatedListener', () => {
  let listener: UserCreatedListener;
  let skillInstallationService: jest.Mocked<MarketplaceSkillInstallationService>;

  beforeEach(() => {
    skillInstallationService = {
      installAllPreInstalled: jest.fn().mockResolvedValue(3),
      installFromMarketplace: jest.fn(),
    } as unknown as jest.Mocked<MarketplaceSkillInstallationService>;

    listener = new UserCreatedListener(skillInstallationService);
  });

  it('should delegate to installAllPreInstalled with the user ID from the event', async () => {
    await listener.handleUserCreated(
      new UserCreatedEvent(USER_ID, ORG_ID, makeUser()),
    );

    expect(
      skillInstallationService.installAllPreInstalled,
    ).toHaveBeenCalledWith(USER_ID);
    expect(
      skillInstallationService.installAllPreInstalled,
    ).toHaveBeenCalledTimes(1);
  });

  it('should not throw when the service throws an unexpected error', async () => {
    skillInstallationService.installAllPreInstalled.mockRejectedValue(
      new Error('Unexpected failure'),
    );

    await expect(
      listener.handleUserCreated(
        new UserCreatedEvent(USER_ID, ORG_ID, makeUser()),
      ),
    ).resolves.toBeUndefined();
  });
});
