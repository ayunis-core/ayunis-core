import { Test, type TestingModule } from '@nestjs/testing';
import { User } from 'src/iam/users/domain/user.entity';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import { PasswordSetTokenService } from 'src/iam/users/application/services/password-set-token.service';
import { UsersRepository } from 'src/iam/users/application/ports/users.repository';
import { SendPasswordResetEmailUseCase } from 'src/iam/users/application/use-cases/send-password-reset-email/send-password-reset-email.use-case';
import { TriggerPasswordResetCommand } from './trigger-password-reset.command';
import { TriggerPasswordResetUseCase } from './trigger-password-reset.use-case';
import { GetOrgAuthenticationPolicyUseCase } from 'src/iam/sso/application/use-cases/get-org-authentication-policy/get-org-authentication-policy.use-case';
import { EmailSendFailedError } from 'src/common/emails/application/emails.errors';
import { ServiceUnavailableError } from 'src/common/errors/service-unavailable.error';

describe('TriggerPasswordResetUseCase', () => {
  let useCase: TriggerPasswordResetUseCase;
  const usersRepository = { findOneByEmail: jest.fn() };
  const tokenService = { issue: jest.fn() };
  const emailUseCase = { execute: jest.fn() };
  const getPolicy = { execute: jest.fn() };

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TriggerPasswordResetUseCase,
        { provide: UsersRepository, useValue: usersRepository },
        { provide: PasswordSetTokenService, useValue: tokenService },
        { provide: SendPasswordResetEmailUseCase, useValue: emailUseCase },
        { provide: GetOrgAuthenticationPolicyUseCase, useValue: getPolicy },
      ],
    }).compile();
    useCase = module.get(TriggerPasswordResetUseCase);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    usersRepository.findOneByEmail.mockReset();
    tokenService.issue.mockReset();
    emailUseCase.execute.mockReset().mockResolvedValue(undefined);
    getPolicy.execute.mockReset();
    getPolicy.execute.mockResolvedValue({
      localPasswordLoginEnabled: true,
    });
  });

  it('returns service unavailable when the user lookup cannot reach PostgreSQL', async () => {
    usersRepository.findOneByEmail.mockRejectedValue(
      Object.assign(new Error('connect ECONNREFUSED 127.0.0.1:5432'), {
        code: 'ECONNREFUSED',
      }),
    );

    await expect(
      useCase.execute(
        new TriggerPasswordResetCommand('maria@gemeinde.example'),
      ),
    ).rejects.toMatchObject({
      code: 'SERVICE_UNAVAILABLE',
      statusCode: 503,
    });
  });

  it('preserves a typed email-provider connection failure', async () => {
    usersRepository.findOneByEmail.mockResolvedValue(
      new User({
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Maria Müller',
        email: 'maria@gemeinde.de',
        emailVerified: true,
        passwordHash: 'hash',
        role: UserRole.USER,
        orgId: '660e8400-e29b-41d4-a716-446655440000',
        hasAcceptedMarketing: false,
      }),
    );
    tokenService.issue.mockResolvedValue('reset-token');
    const providerError = Object.assign(new Error('connection refused'), {
      code: 'ECONNREFUSED',
    });
    const emailError = new EmailSendFailedError('connection refused', {
      error: providerError,
    });
    emailUseCase.execute.mockRejectedValue(emailError);

    await expect(
      useCase.execute(new TriggerPasswordResetCommand('maria@gemeinde.de')),
    ).rejects.toBe(emailError);
  });

  it('preserves a policy lookup service-unavailable error', async () => {
    usersRepository.findOneByEmail.mockResolvedValue(
      new User({
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Maria Müller',
        email: 'maria@gemeinde.de',
        emailVerified: true,
        passwordHash: 'hash',
        role: UserRole.USER,
        orgId: '660e8400-e29b-41d4-a716-446655440000',
        hasAcceptedMarketing: false,
      }),
    );
    const serviceUnavailable = new ServiceUnavailableError(
      Object.assign(new Error('connection refused'), {
        code: 'ECONNREFUSED',
      }),
    );
    getPolicy.execute.mockRejectedValue(serviceUnavailable);

    await expect(
      useCase.execute(new TriggerPasswordResetCommand('maria@gemeinde.de')),
    ).rejects.toBe(serviceUnavailable);
  });

  it('does not issue a reset token for a user without a local password', async () => {
    usersRepository.findOneByEmail.mockResolvedValue(
      new User({
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Maria Müller',
        email: 'maria@gemeinde.de',
        emailVerified: true,
        passwordHash: null,
        role: UserRole.USER,
        orgId: '660e8400-e29b-41d4-a716-446655440000',
        hasAcceptedMarketing: false,
      }),
    );

    const sent = await useCase.execute(
      new TriggerPasswordResetCommand('maria@gemeinde.de'),
    );

    expect(sent).toBe(false);
    expect(tokenService.issue).not.toHaveBeenCalled();
    expect(emailUseCase.execute).not.toHaveBeenCalled();
  });

  it('does not issue a reset token when the organization requires SSO', async () => {
    usersRepository.findOneByEmail.mockResolvedValue(
      new User({
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Maria Müller',
        email: 'maria@gemeinde.de',
        emailVerified: true,
        passwordHash: 'hash',
        role: UserRole.USER,
        orgId: '660e8400-e29b-41d4-a716-446655440000',
        hasAcceptedMarketing: false,
      }),
    );
    getPolicy.execute.mockResolvedValue({
      localPasswordLoginEnabled: false,
    });

    const sent = await useCase.execute(
      new TriggerPasswordResetCommand('maria@gemeinde.de'),
    );

    expect(sent).toBe(false);
    expect(tokenService.issue).not.toHaveBeenCalled();
    expect(emailUseCase.execute).not.toHaveBeenCalled();
  });

  it('reports when a reset email is sent', async () => {
    usersRepository.findOneByEmail.mockResolvedValue(
      new User({
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Maria Müller',
        email: 'maria@gemeinde.de',
        emailVerified: true,
        passwordHash: 'hash',
        role: UserRole.USER,
        orgId: '660e8400-e29b-41d4-a716-446655440000',
        hasAcceptedMarketing: false,
      }),
    );
    tokenService.issue.mockResolvedValue('reset-token');

    const sent = await useCase.execute(
      new TriggerPasswordResetCommand('maria@gemeinde.de'),
    );

    expect(sent).toBe(true);
    expect(emailUseCase.execute).toHaveBeenCalledTimes(1);
  });
});
