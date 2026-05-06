import { Injectable, Logger } from '@nestjs/common';
import { ValidatePasswordResetTokenQuery } from './validate-password-reset-token.query';
import {
  PasswordResetJwtService,
  type TokenPurpose,
} from '../../services/password-reset-jwt.service';
import { InvalidTokenError } from 'src/iam/authentication/application/authentication.errors';
import { ApplicationError } from 'src/common/errors/base.error';
import { UserUnexpectedError } from '../../users.errors';

export interface TokenValidationResult {
  valid: boolean;
  purpose: TokenPurpose | null;
}

@Injectable()
export class ValidatePasswordResetTokenUseCase {
  private readonly logger = new Logger(ValidatePasswordResetTokenUseCase.name);

  constructor(
    private readonly passwordResetJwtService: PasswordResetJwtService,
  ) {}

  execute(query: ValidatePasswordResetTokenQuery): TokenValidationResult {
    this.logger.log('validatePasswordResetToken', { hasToken: !!query.token });
    try {
      const payload = this.passwordResetJwtService.verifyPasswordResetToken(
        query.token,
      );
      return { valid: true, purpose: payload.purpose ?? 'reset' };
    } catch (error) {
      if (error instanceof InvalidTokenError) {
        return { valid: false, purpose: null };
      }
      if (error instanceof ApplicationError) throw error;
      this.logger.error('Error validating password');
      throw new UserUnexpectedError(error as Error);
    }
  }
}
