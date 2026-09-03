import { Test, type TestingModule } from '@nestjs/testing';
import { User } from 'src/iam/users/domain/user.entity';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import { PasswordSetTokenService } from 'src/iam/users/application/services/password-set-token.service';
import { UsersRepository } from 'src/iam/users/application/ports/users.repository';
import { SendPasswordResetEmailUseCase } from 'src/iam/users/application/use-cases/send-password-reset-email/send-password-reset-email.use-case';
import { TriggerPasswordResetCommand } from './trigger-password-reset.command';
import { TriggerPasswordResetUseCase } from './trigger-password-reset.use-case';

describe('TriggerPasswordResetUseCase', () => {
  let useCase: TriggerPasswordResetUseCase;
  const usersRepository = { findOneByEmail: jest.fn() };
  const tokenService = { issue: jest.fn() };
  const emailUseCase = { execute: jest.fn() };

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TriggerPasswordResetUseCase,
        { provide: UsersRepository, useValue: usersRepository },
        { provide: PasswordSetTokenService, useValue: tokenService },
        { provide: SendPasswordResetEmailUseCase, useValue: emailUseCase },
      ],
    }).compile();
    useCase = module.get(TriggerPasswordResetUseCase);
  });

  beforeEach(() => jest.clearAllMocks());

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

    await useCase.execute(new TriggerPasswordResetCommand('maria@gemeinde.de'));

    expect(tokenService.issue).not.toHaveBeenCalled();
    expect(emailUseCase.execute).not.toHaveBeenCalled();
  });
});
