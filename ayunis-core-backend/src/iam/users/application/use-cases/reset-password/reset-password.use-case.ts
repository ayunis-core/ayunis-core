import { Injectable, Logger } from '@nestjs/common';
import { UsersRepository } from 'src/iam/users/application/ports/users.repository';
import { ResetPasswordCommand } from './reset-password.command';
import { InvalidTokenError } from '../../../../authentication/application/authentication.errors';
import { HashTextCommand } from 'src/iam/hashing/application/use-cases/hash-text/hash-text.command';
import { HashTextUseCase } from 'src/iam/hashing/application/use-cases/hash-text/hash-text.use-case';
import { PasswordSetTokenService } from '../../services/password-set-token.service';
import { PasswordSetTokensRepository } from '../../ports/password-set-tokens.repository';
import { UserUnexpectedError } from '../../users.errors';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { IsValidPasswordUseCase } from 'src/iam/users/application/use-cases/is-valid-password/is-valid-password.use-case';
import { IsValidPasswordQuery } from 'src/iam/users/application/use-cases/is-valid-password/is-valid-password.query';
import { InvalidPasswordError } from '../../../../authentication/application/authentication.errors';
import type { PasswordSetToken } from '../../../domain/password-set-token.entity';

@Injectable()
export class ResetPasswordUseCase {
  private readonly logger = new Logger(ResetPasswordUseCase.name);

  constructor(
    private readonly passwordSetTokenService: PasswordSetTokenService,
    private readonly passwordSetTokensRepository: PasswordSetTokensRepository,
    private readonly hashTextUseCase: HashTextUseCase,
    private readonly isValidPasswordUseCase: IsValidPasswordUseCase,
    private readonly usersRepository: UsersRepository,
  ) {}

  @HandleUnexpectedErrors(UserUnexpectedError)
  async execute(command: ResetPasswordCommand): Promise<void> {
    this.logger.log('resetPassword', { hasToken: !!command.resetToken });

    // Look up (read-only) before consuming, so a weak-password attempt does
    // not burn the link.
    const token = await this.passwordSetTokenService.findValid(
      command.resetToken,
    );

    this.assertPasswordsAcceptable(command);
    await this.assertPasswordStrength(command.newPassword, token.userId);

    const user = await this.usersRepository.findOneById(token.userId);
    if (!user) {
      this.logger.error('User not found during password reset', {
        userId: token.userId,
      });
      throw new InvalidTokenError('Invalid token - user not found');
    }

    const newHashedPassword = await this.hashTextUseCase.execute(
      new HashTextCommand(command.newPassword),
    );

    // Atomic single-use gate: a concurrent duplicate submit loses the
    // conditional update and never writes the password a second time.
    await this.consumeToken(token);

    user.passwordHash = newHashedPassword;
    await this.usersRepository.update(user);

    this.logger.debug('Password reset successfully', { userId: user.id });
  }

  private assertPasswordsAcceptable(command: ResetPasswordCommand): void {
    if (command.newPassword !== command.newPasswordConfirmation) {
      this.logger.warn('Password confirmation mismatch');
      throw new InvalidPasswordError('Passwords do not match');
    }
  }

  private async assertPasswordStrength(
    password: string,
    userId: string,
  ): Promise<void> {
    const isValid = await this.isValidPasswordUseCase.execute(
      new IsValidPasswordQuery(password),
    );
    if (!isValid) {
      this.logger.warn('Password does not meet security requirements', {
        userId,
      });
      throw new InvalidPasswordError(
        'Password does not meet security requirements',
      );
    }
  }

  private async consumeToken(token: PasswordSetToken): Promise<void> {
    const consumed = await this.passwordSetTokensRepository.consume(
      token.id,
      new Date(),
    );
    if (!consumed) {
      this.logger.warn('Token already used', { userId: token.userId });
      throw new InvalidTokenError('Token already used');
    }
  }
}
