import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OnEvent } from '@nestjs/event-emitter';
import { OrgDeletionRequestedEvent } from 'src/iam/orgs/application/events/org-deletion-requested.event';
import { FederatedIdentitiesRepository } from 'src/iam/sso/application/ports/federated-identities.repository';
import { OrgSsoConnectionsRepository } from 'src/iam/sso/application/ports/org-sso-connections.repository';
import { BrokerIdentityCleanupService } from 'src/iam/sso/application/services/broker-identity-cleanup.service';

/**
 * Deletes a deleted organization's broker organization and the broker
 * identities of its users. Both are read before the org cascade removes the
 * SSO connection and federated identities; the deletion runs only after the
 * row delete succeeded, and a failure is reported as incomplete cleanup.
 */
@Injectable()
export class SsoOrgDeletionRequestedListener {
  constructor(
    private readonly config: ConfigService,
    private readonly connections: OrgSsoConnectionsRepository,
    private readonly federatedIdentities: FederatedIdentitiesRepository,
    private readonly cleanup: BrokerIdentityCleanupService,
  ) {}

  // A failed lookup rejects the deletion before any row is removed; once the
  // connection is gone nothing could find the broker organization again.
  @OnEvent(OrgDeletionRequestedEvent.EVENT_NAME, { suppressErrors: false })
  async handleOrgDeletionRequested(
    event: OrgDeletionRequestedEvent,
  ): Promise<void> {
    const connection = await this.connections.findByOrgId(event.orgId);
    const zitadelOrgId = connection?.zitadelOrgId ?? null;
    const issuer = this.config.get<string>('ssoOidc.issuer');
    const subjects = issuer
      ? await this.federatedIdentities.findSubjectsByOrgId(event.orgId, issuer)
      : [];
    if (zitadelOrgId === null && subjects.length === 0) return;
    event.deferCleanup('delete broker organization and identities', () =>
      this.cleanup.deleteOrganization(zitadelOrgId, subjects),
    );
  }
}
