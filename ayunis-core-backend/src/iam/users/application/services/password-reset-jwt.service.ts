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
    const expiresIn = this.configService.get<StringValue>(
      'auth.jwt.passwordResetExpiresIn',
      '2h',
    );
    return this.generateToken(params, expiresIn);
  }

  generateInitialPasswordToken(params: {
    userId: UUID;
    email: string;
  }): string {
    const expiresIn = this.configService.get<StringValue>(
      'auth.jwt.initialPasswordExpiresIn',
      '7d',
    );
    return this.generateToken(params, expiresIn);
  }

  private generateToken(
    params: { userId: UUID; email: string },
    expiresIn: StringValue,
  ): string {
    this.logger.log('generatePasswordResetToken', {
      userId: params.userId,
      email: params.email,
    });

    const payload: PasswordResetJwtPayload = {
      userId: params.userId,
      email: params.email,
    };

    return this.jwtService.sign(payload, { expiresIn });
  }

  verifyPasswordResetToken(token: string): PasswordResetJwtPayload {
    this.logger.log('verifyPasswordResetToken');

    try {
      const payload = this.jwtService.verify<
        Partial<PasswordResetJwtPayload> & {
          type?: string;
        }
      >(token);

      // Reject any token carrying a `type` claim: reset tokens are untyped, so
      // a typed token (e.g. an email-confirmation token, which shares the
      // `{userId, email}` shape and the signing secret) must never be redeemed
      // here as a password reset.
      if (payload.type !== undefined || !payload.userId || !payload.email) {
        throw new InvalidTokenError('Invalid token payload');
      }

      this.logger.debug('Password reset token verified successfully', {
        userId: payload.userId,
        email: payload.email,
      });

      return { userId: payload.userId, email: payload.email };
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
