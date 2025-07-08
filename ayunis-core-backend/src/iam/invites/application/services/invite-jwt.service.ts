import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UUID } from 'crypto';
import { InvalidInviteTokenError } from '../invites.errors';

export interface InviteJwtPayload {
  inviteId: UUID;
}

@Injectable()
export class InviteJwtService {
  private readonly logger = new Logger(InviteJwtService.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  generateInviteToken(params: { inviteId: UUID }): string {
    this.logger.log('generateInviteToken', {
      inviteId: params.inviteId,
    });

    const payload: InviteJwtPayload = {
      inviteId: params.inviteId,
    };

    const expiresIn = this.configService.get<string>(
      'auth.jwt.inviteExpiresIn',
      '2d',
    );

    return this.jwtService.sign(payload, { expiresIn });
  }

  verifyInviteToken(token: string): InviteJwtPayload {
    this.logger.log('verifyInviteToken');

    try {
      const payload = this.jwtService.verify<InviteJwtPayload>(token);

      this.logger.debug('Invite token verified successfully', {
        inviteId: payload.inviteId,
      });

      return payload;
    } catch (error: unknown) {
      this.logger.error('Invite token verification failed', { error });

      if (error instanceof InvalidInviteTokenError) {
        throw error;
      }

      // Handle JWT-specific errors
      if (error instanceof Error) {
        if (error.name === 'TokenExpiredError') {
          throw new InvalidInviteTokenError('Token has expired');
        }
        if (error.name === 'JsonWebTokenError') {
          throw new InvalidInviteTokenError('Malformed token');
        }
        if (error.name === 'NotBeforeError') {
          throw new InvalidInviteTokenError('Token not active');
        }
      }

      throw new InvalidInviteTokenError('Token verification failed');
    }
  }

  decodeInviteToken(token: string): InviteJwtPayload | null {
    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const decoded = this.jwtService.decode(token);
      return decoded as InviteJwtPayload;
    } catch (error) {
      this.logger.error('Failed to decode invite token', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return null;
    }
  }
}
