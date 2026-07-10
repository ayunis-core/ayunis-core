import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import type { UUID } from 'crypto';
import type { StringValue } from 'ms';
import { InvalidMfaPendingTokenError } from '../mfa.errors';

export const MFA_PENDING_TOKEN_TYPE = 'mfa_pending';

export interface MfaPendingJwtPayload {
  sub: UUID;
  /**
   * Discriminates this token from every other JWT signed with the shared
   * secret. Session token paths reject any payload carrying a `type` claim,
   * and this service rejects any token without exactly this type.
   */
  type: typeof MFA_PENDING_TOKEN_TYPE;
  /** True when the org requires MFA and the user still has to enroll. */
  enrollmentRequired: boolean;
}

@Injectable()
export class MfaPendingJwtService {
  private readonly logger = new Logger(MfaPendingJwtService.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  generate(params: { userId: UUID; enrollmentRequired: boolean }): string {
    this.logger.log('generateMfaPendingToken', { userId: params.userId });

    const expiresIn = this.configService.get<StringValue>(
      'auth.jwt.mfaPendingExpiresIn',
      '5m',
    );
    const payload: MfaPendingJwtPayload = {
      sub: params.userId,
      type: MFA_PENDING_TOKEN_TYPE,
      enrollmentRequired: params.enrollmentRequired,
    };

    return this.jwtService.sign(payload, { expiresIn });
  }

  verify(token: string): MfaPendingJwtPayload {
    try {
      const payload =
        this.jwtService.verify<Partial<MfaPendingJwtPayload>>(token);

      if (payload.type !== MFA_PENDING_TOKEN_TYPE || !payload.sub) {
        throw new InvalidMfaPendingTokenError();
      }

      return {
        sub: payload.sub,
        type: MFA_PENDING_TOKEN_TYPE,
        enrollmentRequired: payload.enrollmentRequired === true,
      };
    } catch (error: unknown) {
      if (error instanceof InvalidMfaPendingTokenError) {
        throw error;
      }
      this.logger.warn('MFA pending token verification failed', { error });
      throw new InvalidMfaPendingTokenError();
    }
  }
}
