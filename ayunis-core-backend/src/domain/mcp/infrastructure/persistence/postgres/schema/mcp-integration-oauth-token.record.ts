import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseRecord } from '../../../../../../common/db/base-record';
import { UUID } from 'crypto';
import { McpIntegrationRecord } from './mcp-integration.record';
import { UserRecord } from '../../../../../../iam/users/infrastructure/repositories/local/schema/user.record';

@Entity('mcp_integration_oauth_tokens')
@Index('idx_mcp_oauth_token_integration', ['integrationId'])
@Index('idx_mcp_oauth_token_user', ['userId'])
export class McpIntegrationOAuthTokenRecord extends BaseRecord {
  @Column({ name: 'integration_id', type: 'varchar' })
  integrationId: UUID;

  @Column({ name: 'user_id', type: 'varchar', nullable: true })
  userId: UUID | null;

  @ManyToOne(() => UserRecord, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'user_id' })
  user?: UserRecord;

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
