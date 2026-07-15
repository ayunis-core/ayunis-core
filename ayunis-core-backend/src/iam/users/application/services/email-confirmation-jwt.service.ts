import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UUID } from 'crypto';
import type { StringValue } from 'ms';
import { InvalidEmailConfirmationTokenError } from '../users.errors';

export const EMAIL_CONFIRMATION_TOKEN_TYPE = 'email_confirmation';

export interface EmailConfirmationJwtPayload {
  userId: UUID;
  email: string;
  /**
   * Discriminates this token from every other JWT signed with the shared
   * secret. Verification rejects any token that does not carry exactly this
   * type, so an email-confirmation link can never be redeemed as a
   * password-reset (or any other) token.
   */
  type: typeof EMAIL_CONFIRMATION_TOKEN_TYPE;
}

@Injectable()
export class EmailConfirmationJwtService {
  private readonly logger = new Logger(EmailConfirmationJwtService.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  generateEmailConfirmationToken(params: {
    userId: UUID;
    email: string;
  }): string {
    this.logger.log('generateEmailConfirmationToken', {
      userId: params.userId,
      email: params.email,
    });

    const payload: EmailConfirmationJwtPayload = {
      userId: params.userId,
      email: params.email,
      type: EMAIL_CONFIRMATION_TOKEN_TYPE,
    };

    const expiresIn = this.configService.get<StringValue>(
      'auth.jwt.emailConfirmationExpiresIn',
      '24h',
    );

    return this.jwtService.sign(payload, { expiresIn });
  }

  verifyEmailConfirmationToken(token: string): EmailConfirmationJwtPayload {
    this.logger.log('verifyEmailConfirmationToken');

    try {
      const payload =
        this.jwtService.verify<Partial<EmailConfirmationJwtPayload>>(token);

      if (
        payload.type !== EMAIL_CONFIRMATION_TOKEN_TYPE ||
        !payload.userId ||
        !payload.email
      ) {
        throw new InvalidEmailConfirmationTokenError('Invalid token payload');
      }

      this.logger.debug('Email confirmation token verified successfully', {
        userId: payload.userId,
        email: payload.email,
      });

      return {
        userId: payload.userId,
        email: payload.email,
        type: EMAIL_CONFIRMATION_TOKEN_TYPE,
      };
    } catch (error: unknown) {
      this.logger.error('Email confirmation token verification failed', {
        error,
      });

      if (error instanceof InvalidEmailConfirmationTokenError) {
        throw error;
      }

      // Handle JWT-specific errors
      if (error instanceof Error) {
        if (error.name === 'TokenExpiredError') {
          throw new InvalidEmailConfirmationTokenError('Token has expired');
        }
        if (error.name === 'JsonWebTokenError') {
          throw new InvalidEmailConfirmationTokenError('Malformed token');
        }
        if (error.name === 'NotBeforeError') {
          throw new InvalidEmailConfirmationTokenError('Token not active');
        }
      }

      throw new InvalidEmailConfirmationTokenError('Token verification failed');
    }
  }
}
