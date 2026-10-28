import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import { SsoProvisioningLock } from 'src/iam/sso/application/ports/sso-provisioning-lock';

@Injectable()
export class PostgresSsoProvisioningLock extends SsoProvisioningLock {
  constructor(
    private readonly txHost: TransactionHost<TransactionalAdapterTypeOrm>,
  ) {
    super();
  }

  async acquireIdentity(issuer: string, subject: string): Promise<void> {
    await this.acquire(JSON.stringify([issuer, subject]), 1);
  }

  async acquireEmail(email: string): Promise<void> {
    await this.acquire(email.toLowerCase(), 2);
  }

  private async acquire(key: string, seed: number): Promise<void> {
    await this.txHost.tx.query(
      'SELECT pg_advisory_xact_lock(hashtextextended($1, $2))',
      [key, seed],
    );
  }
}
