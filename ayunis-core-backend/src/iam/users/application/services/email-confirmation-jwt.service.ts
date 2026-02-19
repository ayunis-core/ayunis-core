import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UUID } from 'crypto';
import type { StringValue } from 'ms';
import { InvalidEmailConfirmationTokenError } from '../users.errors';

export interface EmailConfirmationJwtPayload {
  userId: UUID;
  email: string;
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
    };

    const expiresIn = this.configService.get<string>(
      'auth.jwt.emailConfirmationExpiresIn',
      '24h',
    ) as StringValue;

    return this.jwtService.sign(payload, { expiresIn });
  }

  verifyEmailConfirmationToken(token: string): EmailConfirmationJwtPayload {
    this.logger.log('verifyEmailConfirmationToken');

    try {
      const payload =
        this.jwtService.verify<EmailConfirmationJwtPayload>(token);

      this.logger.debug('Email confirmation token verified successfully', {
        userId: payload.userId,
        email: payload.email,
      });

      return payload;
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

  decodeEmailConfirmationToken(
    token: string,
  ): EmailConfirmationJwtPayload | null {
    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const decoded = this.jwtService.decode(token);
      return decoded as EmailConfirmationJwtPayload;
    } catch (error: unknown) {
      this.logger.error('Failed to decode email confirmation token', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return null;
    }
  }
}
