import { Injectable, Logger } from '@nestjs/common';
import { BrokerIdentityAdminClient } from 'src/iam/sso/application/ports/broker-identity-admin.client';
import {
  brokerFailureDetails,
  SsoBrokerIdentityCleanupIncompleteError,
  SsoBrokerIdentityCleanupNotConfiguredError,
} from 'src/iam/sso/application/sso.errors';

/**
 * Removes broker identities and organizations that Core no longer uses.
 * Every failure is logged with the broker ID it concerns and makes the call
 * reject once all remaining work has been attempted, so callers report
 * incomplete cleanup instead of passing it silently.
 */
@Injectable()
export class BrokerIdentityCleanupService {
  private readonly logger = new Logger(BrokerIdentityCleanupService.name);

  constructor(private readonly brokerAdmin: BrokerIdentityAdminClient) {}

  async deleteIdentities(subjects: string[]): Promise<void> {
    this.requireConfigured();
    const failed = await this.deleteUsers(subjects);
    if (failed > 0) throw new SsoBrokerIdentityCleanupIncompleteError(failed);
  }

  async deleteOrganization(
    zitadelOrgId: string | null,
    subjects: string[],
  ): Promise<void> {
    this.requireConfigured();
    let failed = 0;
    if (zitadelOrgId !== null) {
      failed += await this.attempt(
        { zitadelOrgId },
        'Failed to delete broker organization',
        () => this.brokerAdmin.deleteOrganization(zitadelOrgId),
      );
    }
    failed += await this.deleteRemainingUsers(subjects);
    if (failed > 0) throw new SsoBrokerIdentityCleanupIncompleteError(failed);
  }

  // Deleting a broker organization deletes its users, so usually only
  // identities in another broker organization (after a remap) are left. The
  // lookup only saves calls: if it fails, every identity is deleted.
  private async deleteRemainingUsers(subjects: string[]): Promise<number> {
    if (subjects.length === 0) return 0;
    let remaining = subjects;
    try {
      remaining = await this.brokerAdmin.findExistingUserIds(subjects);
    } catch (error) {
      this.logger.warn(
        { subjectCount: subjects.length, ...brokerFailureDetails(error) },
        'Failed to look up remaining broker identities; deleting all of them',
      );
    }
    return this.deleteUsers(remaining);
  }

  private async deleteUsers(subjects: string[]): Promise<number> {
    let failed = 0;
    for (const subject of subjects) {
      failed += await this.attempt(
        { brokerUserId: subject },
        'Failed to delete broker identity',
        () => this.brokerAdmin.deleteUser(subject),
      );
    }
    return failed;
  }

  private async attempt(
    metadata: object,
    message: string,
    operation: () => Promise<void>,
  ): Promise<0 | 1> {
    try {
      await operation();
      return 0;
    } catch (error) {
      this.logger.error(
        { ...metadata, ...brokerFailureDetails(error), err: error as Error },
        message,
      );
      return 1;
    }
  }

  private requireConfigured(): void {
    if (this.brokerAdmin.isConfigured()) return;
    this.logger.error(
      'Broker identity cleanup is not configured; set SSO_ZITADEL_IDENTITY_CLEANUP_TOKEN',
    );
    throw new SsoBrokerIdentityCleanupNotConfiguredError();
  }
}
