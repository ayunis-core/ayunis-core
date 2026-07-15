import { Injectable, Logger } from '@nestjs/common';
import { ValidatePasswordResetTokenQuery } from './validate-password-reset-token.query';
import { PasswordSetTokenService } from '../../services/password-set-token.service';
import { InvalidTokenError } from 'src/iam/authentication/application/authentication.errors';
import { ApplicationError } from 'src/common/errors/base.error';
import { UserUnexpectedError } from '../../users.errors';

export interface TokenValidationResult {
  valid: boolean;
}

@Injectable()
export class ValidatePasswordResetTokenUseCase {
  private readonly logger = new Logger(ValidatePasswordResetTokenUseCase.name);

  constructor(
    private readonly passwordSetTokenService: PasswordSetTokenService,
  ) {}

  async execute(
    query: ValidatePasswordResetTokenQuery,
  ): Promise<TokenValidationResult> {
    this.logger.log('validatePasswordResetToken', { hasToken: !!query.token });
    try {
      // Read-only: never consumes the token, so the frontend can validate it
      // before rendering the form and still redeem it on submit.
      await this.passwordSetTokenService.findValid(query.token);
      return { valid: true };
    } catch (error) {
      if (error instanceof InvalidTokenError) {
        return { valid: false };
      }
      if (error instanceof ApplicationError) throw error;
      this.logger.error('Error validating password reset token');
      throw new UserUnexpectedError(error as Error);
    }
  }
}
