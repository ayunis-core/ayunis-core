import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes, randomUUID, type UUID } from 'crypto';
import { sha256Hex } from 'src/common/util/sha256.util';
import { getMillisecondsFromJwtExpiry } from 'src/common/util/jwt.util';
import { RefreshToken } from 'src/iam/sessions/domain/refresh-token.entity';
import { SessionAuthenticationMethod } from 'src/iam/sessions/domain/value-objects/session-authentication-method.enum';

/**
 * Builds opaque refresh tokens. The plaintext (32 random bytes, base64url) is
 * returned once for the cookie; only its SHA-256 hash is stored on the entity.
 */
@Injectable()
export class RefreshTokenFactory {
  constructor(private readonly configService: ConfigService) {}

  create(params: {
    userId: UUID;
    familyId: UUID;
    authenticationMethod: SessionAuthenticationMethod;
    zitadelSessionId: string | null;
    familyExpiresAt?: Date;
  }): {
    token: RefreshToken;
    plaintext: string;
  } {
    const plaintext = randomBytes(32).toString('base64url');
    const token = new RefreshToken({
      userId: params.userId,
      familyId: params.familyId,
      tokenHash: sha256Hex(plaintext),
      authenticationMethod: params.authenticationMethod,
      zitadelSessionId: params.zitadelSessionId,
      expiresAt: this.expiresAt(params),
    });
    return { token, plaintext };
  }

  newFamilyId(): UUID {
    return randomUUID();
  }

  private ttlMs(): number {
    return getMillisecondsFromJwtExpiry(
      this.configService.get<string>('auth.jwt.refreshTokenExpiresIn', '7d'),
    );
  }

  private expiresAt(params: {
    authenticationMethod: SessionAuthenticationMethod;
    familyExpiresAt?: Date;
  }): Date {
    const slidingExpiry = new Date(Date.now() + this.ttlMs());
    if (params.authenticationMethod !== SessionAuthenticationMethod.SSO) {
      return slidingExpiry;
    }
    const familyExpiry =
      params.familyExpiresAt ??
      new Date(Date.now() + this.ssoMaxAgeSeconds() * 1000);
    return familyExpiry < slidingExpiry ? familyExpiry : slidingExpiry;
  }

  private ssoMaxAgeSeconds(): number {
    return this.configService.get<number>(
      'ssoOidc.reauthenticationMaxAgeSeconds',
      86_400,
    );
  }
}
