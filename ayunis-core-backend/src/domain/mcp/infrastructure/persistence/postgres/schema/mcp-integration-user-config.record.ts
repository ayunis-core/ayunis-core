import { Column, Entity, JoinColumn, ManyToOne, Unique } from 'typeorm';
import { BaseRecord } from '../../../../../../common/db/base-record';
import { UUID } from 'crypto';
import { McpIntegrationRecord } from './mcp-integration.record';

@Entity('mcp_integration_user_configs')
@Unique(['integrationId', 'userId'])
export class McpIntegrationUserConfigRecord extends BaseRecord {
  @Column({ name: 'integration_id', type: 'varchar' })
  integrationId: string;

  @ManyToOne(() => McpIntegrationRecord, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'integration_id' })
  integration: McpIntegrationRecord;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: UUID;

  @Column({ name: 'config_values', type: 'jsonb', default: '{}' })
  configValues: Record<string, string>;
}
