import type { GetOrgAuthenticationPolicyUseCase } from 'src/iam/sso/application/use-cases/get-org-authentication-policy/get-org-authentication-policy.use-case';
import type { PasswordSetTokenService } from 'src/iam/users/application/services/password-set-token.service';
import type { UsersRepository } from 'src/iam/users/application/ports/users.repository';
import type { SendSetInitialPasswordEmailUseCase } from 'src/iam/users/application/use-cases/send-set-initial-password-email/send-set-initial-password-email.use-case';
import { TriggerSetInitialPasswordCommand } from 'src/iam/users/application/use-cases/trigger-set-initial-password/trigger-set-initial-password.command';
import { TriggerSetInitialPasswordUseCase } from 'src/iam/users/application/use-cases/trigger-set-initial-password/trigger-set-initial-password.use-case';
import { User } from 'src/iam/users/domain/user.entity';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';

describe(TriggerSetInitialPasswordUseCase.name, () => {
  const orgId = '11111111-1111-1111-1111-111111111111';
  const user = new User({
    id: '22222222-2222-2222-2222-222222222222',
    email: 'user@example.com',
    emailVerified: true,
    passwordHash: null,
    role: UserRole.USER,
    orgId,
    name: 'User',
    hasAcceptedMarketing: false,
  });
  const sendEmail = { execute: jest.fn() };
  const tokens = { issue: jest.fn() };
  const users = { findOneByEmail: jest.fn() };
  const policy = { execute: jest.fn() };
  const useCase = new TriggerSetInitialPasswordUseCase(
    sendEmail as unknown as SendSetInitialPasswordEmailUseCase,
    tokens as unknown as PasswordSetTokenService,
    users as unknown as UsersRepository,
    policy as unknown as GetOrgAuthenticationPolicyUseCase,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    users.findOneByEmail.mockResolvedValue(user);
    policy.execute.mockResolvedValue({ localPasswordLoginEnabled: true });
    tokens.issue.mockResolvedValue('token');
  });

  it('does not issue an initial-password link when the organization requires SSO', async () => {
    policy.execute.mockResolvedValue({ localPasswordLoginEnabled: false });

    await useCase.execute(
      new TriggerSetInitialPasswordCommand(user.email, orgId),
    );

    expect(tokens.issue).not.toHaveBeenCalled();
    expect(sendEmail.execute).not.toHaveBeenCalled();
  });
});
