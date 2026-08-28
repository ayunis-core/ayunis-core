import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { UUID } from 'crypto';
import { getMillisecondsFromJwtExpiry } from 'src/common/util/jwt.util';
import { SsoBrokerSessionsRepository } from 'src/iam/sso/application/ports/sso-broker-sessions.repository';
import { SsoEncryptionPort } from 'src/iam/sso/application/ports/sso-encryption.port';

@Injectable()
export class SsoBrokerSessionService {
  constructor(
    private readonly sessions: SsoBrokerSessionsRepository,
    private readonly encryption: SsoEncryptionPort,
    private readonly configService: ConfigService,
  ) {}

  async store(
    userId: UUID,
    zitadelSessionId: string,
    idToken: string,
  ): Promise<void> {
    await this.sessions.upsert({
      userId,
      zitadelSessionId,
      encryptedIdToken: this.encryption.encrypt(idToken),
      expiresAt: new Date(Date.now() + this.retentionMs()),
    });
  }

  async idTokenFor(zitadelSessionId: string): Promise<string | undefined> {
    const session = await this.sessions.findActiveByZitadelSessionId(
      zitadelSessionId,
      new Date(),
    );
    return session
      ? this.encryption.decrypt(session.encryptedIdToken)
      : undefined;
  }

  private retentionMs(): number {
    const maxAgeMs =
      this.configService.get<number>(
        'ssoOidc.reauthenticationMaxAgeSeconds',
        86_400,
      ) * 1000;
    const mfaPendingMs = getMillisecondsFromJwtExpiry(
      this.configService.get<string>('auth.jwt.mfaPendingExpiresIn', '5m'),
    );
    return maxAgeMs + mfaPendingMs;
  }
}
