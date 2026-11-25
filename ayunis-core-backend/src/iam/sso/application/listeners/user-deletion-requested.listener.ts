import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OnEvent } from '@nestjs/event-emitter';
import { UserDeletionRequestedEvent } from 'src/iam/users/application/events/user-deletion-requested.event';
import { FederatedIdentitiesRepository } from 'src/iam/sso/application/ports/federated-identities.repository';
import { BrokerIdentityCleanupService } from 'src/iam/sso/application/services/broker-identity-cleanup.service';

/**
 * Deletes a deleted user's broker identities. The subjects are read before
 * the user row cascade removes the federated identities that hold them; the
 * deletion itself runs only after the row delete succeeded.
 *
 * A lookup failure is logged and does not block user deletion. The orphaned
 * identity is then removed by the unlinked broker identity sweep.
 */
@Injectable()
export class SsoUserDeletionRequestedListener {
  private readonly logger = new Logger(SsoUserDeletionRequestedListener.name);

  constructor(
    private readonly config: ConfigService,
    private readonly federatedIdentities: FederatedIdentitiesRepository,
    private readonly cleanup: BrokerIdentityCleanupService,
  ) {}

  @OnEvent(UserDeletionRequestedEvent.EVENT_NAME)
  async handleUserDeletionRequested(
    event: UserDeletionRequestedEvent,
  ): Promise<void> {
    const issuer = this.config.get<string>('ssoOidc.issuer');
    if (!issuer) return;
    let subjects: string[];
    try {
      subjects = await this.federatedIdentities.findSubjectsByUserId(
        event.userId,
        issuer,
      );
    } catch (error) {
      this.logger.error(
        { userId: event.userId, err: error as Error },
        'Failed to resolve broker identities for deleted user',
      );
      return;
    }
    if (subjects.length === 0) return;
    event.deferCleanup('delete broker identities', () =>
      this.cleanup.deleteIdentities(subjects),
    );
  }
}
