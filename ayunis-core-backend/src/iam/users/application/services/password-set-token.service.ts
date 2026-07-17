import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes, type UUID } from 'crypto';
import { InvalidTokenError } from 'src/iam/authentication/application/authentication.errors';
import { sha256Hex } from 'src/common/util/sha256.util';
import { getMillisecondsFromJwtExpiry } from 'src/common/util/jwt.util';
import { PasswordSetToken } from '../../domain/password-set-token.entity';
import { PasswordSetTokenPurpose } from '../../domain/value-objects/password-set-token-purpose.enum';
import { PasswordSetTokensRepository } from '../ports/password-set-tokens.repository';

/**
 * Issues and validates opaque, single-use password-set tokens. The plaintext
 * token is returned once (for the email link) and never stored; only its
 * SHA-256 hash is persisted, so a database leak cannot yield a usable token.
 */
@Injectable()
export class PasswordSetTokenService {
  private readonly logger = new Logger(PasswordSetTokenService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly passwordSetTokensRepository: PasswordSetTokensRepository,
  ) {}

  async issue(params: {
    userId: UUID;
    purpose: PasswordSetTokenPurpose;
  }): Promise<string> {
    this.logger.log('issue', {
      userId: params.userId,
      purpose: params.purpose,
    });

    const plaintext = randomBytes(32).toString('base64url');
    const token = new PasswordSetToken({
      userId: params.userId,
      tokenHash: sha256Hex(plaintext),
      purpose: params.purpose,
      expiresAt: new Date(Date.now() + this.expiryMs(params.purpose)),
    });

    await this.passwordSetTokensRepository.replaceForUser(
      params.userId,
      params.purpose,
      token,
    );

    return plaintext;
  }

  /**
   * Read-only lookup of a valid token by its plaintext. Throws when the token is
   * unknown, already used, or expired. Never mutates state, so it is safe for
   * the pre-submit validation call as well as redemption.
   */
  async findValid(plaintext: string): Promise<PasswordSetToken> {
    const token = await this.passwordSetTokensRepository.findByTokenHash(
      sha256Hex(plaintext),
    );

    if (!token || token.isUsed() || token.isExpired()) {
      throw new InvalidTokenError('Invalid or expired token');
    }

    return token;
  }

  private expiryMs(purpose: PasswordSetTokenPurpose): number {
    const key =
      purpose === PasswordSetTokenPurpose.INITIAL
        ? 'auth.jwt.initialPasswordExpiresIn'
        : 'auth.jwt.passwordResetExpiresIn';
    const fallback = purpose === PasswordSetTokenPurpose.INITIAL ? '7d' : '2h';
    return getMillisecondsFromJwtExpiry(
      this.configService.get<string>(key, fallback),
    );
  }
}
