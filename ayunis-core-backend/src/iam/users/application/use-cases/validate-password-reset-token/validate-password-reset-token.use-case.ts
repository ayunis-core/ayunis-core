import { Injectable, Logger } from '@nestjs/common';
import { ValidatePasswordResetTokenQuery } from './validate-password-reset-token.query';
import { PasswordResetJwtService } from '../../services/password-reset-jwt.service';
import { InvalidTokenError } from 'src/iam/authentication/application/authentication.errors';
import { ApplicationError } from 'src/common/errors/base.error';
import { UnexpectedUserError } from '../../users.errors';

@Injectable()
export class ValidatePasswordResetTokenUseCase {
  private readonly logger = new Logger(ValidatePasswordResetTokenUseCase.name);

  constructor(
    private readonly passwordResetJwtService: PasswordResetJwtService,
  ) {}

  execute(query: ValidatePasswordResetTokenQuery): boolean {
    this.logger.log('validatePasswordResetToken', { hasToken: !!query.token });
    try {
      // verifyPasswordResetToken throws InvalidTokenError if token is expired or invalid
      this.passwordResetJwtService.verifyPasswordResetToken(query.token);
      return true;
    } catch (error) {
      if (error instanceof InvalidTokenError) return false;
      if (error instanceof ApplicationError) throw error;
      this.logger.error('Error validating password');
      throw new UnexpectedUserError(error as Error);
    }
  }
}
