import type { UUID } from 'crypto';
import { Column, Entity, JoinColumn, ManyToOne, Unique } from 'typeorm';
import { BaseRecord } from 'src/common/db/base-record';
import { UserRecord } from 'src/iam/users/infrastructure/repositories/local/schema/user.record';
import { McpIntegrationRecord } from './mcp-integration.record';

@Entity('mcp_oauth_user_tokens')
@Unique(['integrationId', 'userId'])
export class McpOAuthUserTokenRecord extends BaseRecord {
  @Column({ name: 'integration_id', type: 'varchar' })
  integrationId: UUID;

  @ManyToOne(() => McpIntegrationRecord, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'integration_id' })
  integration: McpIntegrationRecord;

  @Column({ name: 'user_id', type: 'varchar' })
  userId: UUID;

  @ManyToOne(() => UserRecord, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: UserRecord;

  @Column({ type: 'text' })
  issuer: string;

  @Column({ name: 'encrypted_access_token', type: 'text' })
  encryptedAccessToken: string;

  @Column({ name: 'encrypted_refresh_token', type: 'text', nullable: true })
  encryptedRefreshToken?: string;

  @Column({ name: 'expires_at', type: 'timestamptz', nullable: true })
  expiresAt?: Date;

  @Column({ name: 'token_type', type: 'text', nullable: true })
  tokenType?: string;

  @Column({ type: 'text', array: true, default: () => "'{}'" })
  scopes: string[];
}
