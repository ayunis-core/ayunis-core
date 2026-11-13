import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import {
  BrokerIdentityAdminClient,
  type BrokerUser,
} from 'src/iam/sso/application/ports/broker-identity-admin.client';
import { FederatedIdentitiesRepository } from 'src/iam/sso/application/ports/federated-identities.repository';
import { OrgSsoConnectionsRepository } from 'src/iam/sso/application/ports/org-sso-connections.repository';
import {
  brokerFailureDetails,
  SsoBrokerIdentityCleanupNotConfiguredError,
  UnexpectedSsoError,
} from 'src/iam/sso/application/sso.errors';

/**
 * ZITADEL creates a broker identity before Core decides whether to admit the
 * user. An identity that is still not linked to a Core user after this window
 * was rejected, abandoned, or belonged to a user whose deletion could not
 * reach the broker.
 */
export const UNLINKED_BROKER_IDENTITY_GRACE_MS = 24 * 60 * 60 * 1000;

export interface SweepUnlinkedBrokerIdentitiesResult {
  organizationCount: number;
  deletedCount: number;
  failedCount: number;
}

/**
 * Deletes broker identities in the ZITADEL organizations of Core's SSO
 * connections that no federated identity links to. Only human users with an
 * identity provider link qualify, so administrators and service users of a
 * mistakenly mapped organization are never touched.
 */
@Injectable()
export class SweepUnlinkedBrokerIdentitiesUseCase {
  private readonly logger = new Logger(
    SweepUnlinkedBrokerIdentitiesUseCase.name,
  );

  constructor(
    private readonly config: ConfigService,
    private readonly connections: OrgSsoConnectionsRepository,
    private readonly federatedIdentities: FederatedIdentitiesRepository,
    private readonly brokerAdmin: BrokerIdentityAdminClient,
  ) {}

  @HandleUnexpectedErrors(UnexpectedSsoError)
  async execute(): Promise<SweepUnlinkedBrokerIdentitiesResult> {
    const result = { organizationCount: 0, deletedCount: 0, failedCount: 0 };
    const issuer = this.config.get<string>('ssoOidc.issuer');
    if (!issuer) return result;
    if (!this.brokerAdmin.isConfigured()) {
      throw new SsoBrokerIdentityCleanupNotConfiguredError();
    }
    const createdBefore = new Date(
      Date.now() - UNLINKED_BROKER_IDENTITY_GRACE_MS,
    );
    for (const zitadelOrgId of await this.connections.findZitadelOrgIds()) {
      result.organizationCount++;
      await this.sweepOrganization(zitadelOrgId, issuer, createdBefore, result);
    }
    this.logger.log({ ...result }, 'Swept unlinked broker identities');
    return result;
  }

  private async sweepOrganization(
    zitadelOrgId: string,
    issuer: string,
    createdBefore: Date,
    result: SweepUnlinkedBrokerIdentitiesResult,
  ): Promise<void> {
    let candidates: BrokerUser[];
    try {
      candidates = await this.unlinkedUsers(
        zitadelOrgId,
        issuer,
        createdBefore,
      );
    } catch (error) {
      result.failedCount++;
      this.logger.error(
        { zitadelOrgId, ...brokerFailureDetails(error), err: error as Error },
        'Failed to list broker identities',
      );
      return;
    }
    for (const candidate of candidates) {
      await this.deleteIfUnlinked(candidate.id, issuer, result);
    }
  }

  private async unlinkedUsers(
    zitadelOrgId: string,
    issuer: string,
    createdBefore: Date,
  ): Promise<BrokerUser[]> {
    const users = (await this.brokerAdmin.listHumanUsers(zitadelOrgId)).filter(
      (user) => user.createdAt < createdBefore,
    );
    const linked = new Set(
      await this.federatedIdentities.findLinkedSubjects(
        issuer,
        users.map((user) => user.id),
      ),
    );
    return users.filter((user) => !linked.has(user.id));
  }

  private async deleteIfUnlinked(
    brokerUserId: string,
    issuer: string,
    result: SweepUnlinkedBrokerIdentitiesResult,
  ): Promise<void> {
    try {
      // Re-checked per identity: a user may have been admitted while the
      // sweep worked through the earlier candidates.
      if (
        await this.federatedIdentities.findByIssuerAndSubject(
          issuer,
          brokerUserId,
        )
      )
        return;
      if (!(await this.brokerAdmin.hasIdentityProviderLink(brokerUserId)))
        return;
      await this.brokerAdmin.deleteUser(brokerUserId);
      result.deletedCount++;
    } catch (error) {
      result.failedCount++;
      this.logger.error(
        { brokerUserId, ...brokerFailureDetails(error), err: error as Error },
        'Failed to delete unlinked broker identity',
      );
    }
  }
}
