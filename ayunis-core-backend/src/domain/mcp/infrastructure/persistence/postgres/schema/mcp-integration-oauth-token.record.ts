import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseRecord } from '../../../../../../common/db/base-record';
import { UUID } from 'crypto';
import { McpIntegrationRecord } from './mcp-integration.record';

/**
 * Partial unique indexes (uq_mcp_oauth_token_user WHERE user_id IS NOT NULL,
 * uq_mcp_oauth_token_org WHERE user_id IS NULL) are migration-only because
 * TypeORM decorators cannot express partial indexes.
 *
 * The FK from user_id → users is also migration-only to avoid a cross-domain
 * import. Only integration has a decorator-based relation (@ManyToOne).
 */
@Entity('mcp_integration_oauth_tokens')
@Index('idx_mcp_oauth_token_integration', ['integrationId'])
@Index('idx_mcp_oauth_token_user', ['userId'])
export class McpIntegrationOAuthTokenRecord extends BaseRecord {
  @Column({ name: 'integration_id', type: 'varchar' })
  integrationId: UUID;

  @Column({ name: 'user_id', type: 'varchar', nullable: true })
  userId: UUID | null;

  @Column({ name: 'access_token_encrypted', type: 'text' })
  accessTokenEncrypted: string;

  @Column({ name: 'refresh_token_encrypted', type: 'text', nullable: true })
  refreshTokenEncrypted: string | null;

  @Column({ name: 'token_expires_at', type: 'timestamp', nullable: true })
  tokenExpiresAt: Date | null;

  @Column({ type: 'text', nullable: true })
  scope: string | null;

  @ManyToOne(() => McpIntegrationRecord, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'integration_id' })
  integration?: McpIntegrationRecord;
}
