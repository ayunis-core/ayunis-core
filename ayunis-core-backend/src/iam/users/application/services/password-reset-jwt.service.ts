import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UUID } from 'crypto';
import type { StringValue } from 'ms';
import { InvalidTokenError } from '../../../authentication/application/authentication.errors';

export interface PasswordResetJwtPayload {
  userId: UUID;
  email: string;
}

@Injectable()
export class PasswordResetJwtService {
  private readonly logger = new Logger(PasswordResetJwtService.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  generatePasswordResetToken(params: { userId: UUID; email: string }): string {
    this.logger.log('generatePasswordResetToken', {
      userId: params.userId,
      email: params.email,
    });

    const payload: PasswordResetJwtPayload = {
      userId: params.userId,
      email: params.email,
    };

    const expiresIn = this.configService.get<StringValue>(
      'auth.jwt.passwordResetExpiresIn',
      '2h',
    ) as StringValue;

    return this.jwtService.sign(payload, { expiresIn });
  }

  verifyPasswordResetToken(token: string): PasswordResetJwtPayload {
    this.logger.log('verifyPasswordResetToken');

    try {
      const payload = this.jwtService.verify<PasswordResetJwtPayload>(token);

      this.logger.debug('Password reset token verified successfully', {
        userId: payload.userId,
        email: payload.email,
      });

      return payload;
    } catch (error: unknown) {
      this.logger.error('Password reset token verification failed', {
        error,
      });

      if (error instanceof InvalidTokenError) {
        throw error;
      }

      // Handle JWT-specific errors
      if (error instanceof Error) {
        if (error.name === 'TokenExpiredError') {
          throw new InvalidTokenError('Token has expired');
        }
        if (error.name === 'JsonWebTokenError') {
          throw new InvalidTokenError('Malformed token');
        }
        if (error.name === 'NotBeforeError') {
          throw new InvalidTokenError('Token not active');
        }
      }

      throw new InvalidTokenError('Token verification failed');
    }
  }
}
