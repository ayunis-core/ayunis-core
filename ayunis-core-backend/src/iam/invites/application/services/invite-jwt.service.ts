import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UUID } from 'crypto';
import type { StringValue } from 'ms';
import { InvalidInviteTokenError } from '../invites.errors';

export const INVITE_TOKEN_TYPE = 'invite';

export interface InviteJwtPayload {
  inviteId: UUID;
  /**
   * Discriminates this token from every other JWT signed with the shared
   * secret. New invite tokens carry this type; verification also accepts
   * legacy untyped `{inviteId}` tokens during a short grace window.
   */
  type: typeof INVITE_TOKEN_TYPE;
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
      type: INVITE_TOKEN_TYPE,
    };

    const expiresIn = this.configService.get<StringValue>(
      'auth.jwt.inviteExpiresIn',
      '2d',
    );

    return this.jwtService.sign(payload, { expiresIn });
  }

  verifyInviteToken(token: string): InviteJwtPayload {
    this.logger.log('verifyInviteToken');

    try {
      const payload = this.jwtService.verify<Partial<InviteJwtPayload>>(token);
      const inviteId = this.extractInviteId(payload);

      this.logger.debug('Invite token verified successfully', { inviteId });

      return { inviteId, type: INVITE_TOKEN_TYPE };
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

  /**
   * Accepts a properly typed invite token, or a legacy untyped `{inviteId}`
   * token during the grace window. No other token type carries `inviteId`, so
   * requiring that field excludes reset/confirmation/access tokens.
   *
   * FUTURE(AYC-451): remove the legacy untyped branch ~2 days after deploy,
   * once all pre-deploy invite links have expired.
   */
  private extractInviteId(payload: Partial<InviteJwtPayload>): UUID {
    const isTyped = payload.type === INVITE_TOKEN_TYPE;
    const isLegacyUntyped = payload.type === undefined;
    if ((!isTyped && !isLegacyUntyped) || !payload.inviteId) {
      throw new InvalidInviteTokenError('Invalid token payload');
    }
    return payload.inviteId;
  }
}
