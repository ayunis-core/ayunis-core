import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import type { UUID } from 'crypto';
import type { StringValue } from 'ms';
import { InvalidMfaPendingTokenError } from 'src/iam/authentication/application/authentication.errors';
import { SessionAuthenticationMethod } from 'src/iam/sessions/domain/value-objects/session-authentication-method.enum';

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
  authenticationMethod: SessionAuthenticationMethod;
  zitadelSessionId: string | null;
}

@Injectable()
export class MfaPendingJwtService {
  constructor(
    @InjectPinoLogger(MfaPendingJwtService.name)
    private readonly logger: PinoLogger,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  generate(params: {
    userId: UUID;
    enrollmentRequired: boolean;
    authenticationMethod?: SessionAuthenticationMethod;
    zitadelSessionId?: string | null;
  }): string {
    this.logger.info({ userId: params.userId }, 'generateMfaPendingToken');

    const expiresIn = this.configService.get<StringValue>(
      'auth.jwt.mfaPendingExpiresIn',
      '5m',
    );
    const payload: MfaPendingJwtPayload = {
      sub: params.userId,
      type: MFA_PENDING_TOKEN_TYPE,
      enrollmentRequired: params.enrollmentRequired,
      authenticationMethod:
        params.authenticationMethod ?? SessionAuthenticationMethod.PASSWORD,
      zitadelSessionId: params.zitadelSessionId ?? null,
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
        authenticationMethod: this.authenticationMethod(payload),
        zitadelSessionId: this.zitadelSessionId(payload),
      };
    } catch (error: unknown) {
      if (error instanceof InvalidMfaPendingTokenError) {
        throw error;
      }
      this.logger.warn(
        { err: error as Error },
        'MFA pending token verification failed',
      );
      throw new InvalidMfaPendingTokenError();
    }
  }

  private authenticationMethod(
    payload: Partial<MfaPendingJwtPayload>,
  ): SessionAuthenticationMethod {
    const method =
      payload.authenticationMethod ?? SessionAuthenticationMethod.PASSWORD;
    if (!Object.values(SessionAuthenticationMethod).includes(method)) {
      throw new InvalidMfaPendingTokenError();
    }
    return method;
  }

  private zitadelSessionId(
    payload: Partial<MfaPendingJwtPayload>,
  ): string | null {
    const sessionId = payload.zitadelSessionId ?? null;
    if (sessionId !== null && typeof sessionId !== 'string') {
      throw new InvalidMfaPendingTokenError();
    }
    return sessionId;
  }
}
