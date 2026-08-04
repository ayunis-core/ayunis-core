import type { UUID } from 'crypto';
import { Column, Entity, JoinColumn, ManyToOne, Unique } from 'typeorm';
import { BaseRecord } from 'src/common/db/base-record';
import { OrgRecord } from 'src/iam/orgs/infrastructure/repositories/local/schema/org.record';
import { UserRecord } from 'src/iam/users/infrastructure/repositories/local/schema/user.record';
import { McpIntegrationRecord } from './mcp-integration.record';

@Entity('mcp_oauth_pending_sessions')
@Unique(['stateHash'])
export class McpOAuthPendingSessionRecord extends BaseRecord {
  @Column({ name: 'state_hash', type: 'text' })
  stateHash: string;

  @Column({ name: 'encrypted_code_verifier', type: 'text' })
  encryptedCodeVerifier: string;

  @Column({ name: 'redirect_uri', type: 'text' })
  redirectUri: string;

  @Column({ name: 'integration_id', type: 'varchar' })
  integrationId: UUID;

  @ManyToOne(() => McpIntegrationRecord, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'integration_id' })
  integration: McpIntegrationRecord;

  @Column({ name: 'org_id', type: 'varchar' })
  orgId: UUID;

  @ManyToOne(() => OrgRecord, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'org_id' })
  org: OrgRecord;

  @Column({ name: 'user_id', type: 'varchar' })
  userId: UUID;

  @ManyToOne(() => UserRecord, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: UserRecord;

  @Column({ type: 'text' })
  issuer: string;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt: Date;

  @Column({ name: 'consumed_at', type: 'timestamptz', nullable: true })
  consumedAt?: Date;
}
