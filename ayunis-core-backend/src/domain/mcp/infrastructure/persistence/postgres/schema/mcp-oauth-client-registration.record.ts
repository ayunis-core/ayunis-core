import type { UUID } from 'crypto';
import { Column, Entity, Index, JoinColumn, ManyToOne, Unique } from 'typeorm';
import { BaseRecord } from 'src/common/db/base-record';
import { McpIntegrationRecord } from './mcp-integration.record';

@Entity('mcp_oauth_client_registrations')
@Unique(['integrationId', 'issuer'])
@Index(['integrationId'], { unique: true, where: '"issuer" IS NULL' })
export class McpOAuthClientRegistrationRecord extends BaseRecord {
  @Column({ name: 'integration_id', type: 'varchar' })
  integrationId: UUID;

  @ManyToOne(() => McpIntegrationRecord, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'integration_id' })
  integration: McpIntegrationRecord;

  @Column({ type: 'text', nullable: true })
  issuer: string | null;

  @Column({ name: 'registration_mode', type: 'text' })
  registrationMode: 'automatic' | 'static';

  @Column({ name: 'client_id', type: 'text' })
  clientId: string;

  @Column({ name: 'encrypted_client_secret', type: 'text', nullable: true })
  encryptedClientSecret?: string;

  @Column({
    name: 'client_secret_expires_at',
    type: 'timestamptz',
    nullable: true,
  })
  clientSecretExpiresAt?: Date;

  @Column({ name: 'discovery_metadata', type: 'jsonb', nullable: true })
  discoveryMetadata?: Record<string, unknown>;
}
