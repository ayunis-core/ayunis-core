import { Column, Entity, Unique } from 'typeorm';
import { BaseRecord } from '../../../../../../common/db/base-record';
import { UUID } from 'crypto';

@Entity('mcp_integration_user_configs')
@Unique(['integrationId', 'userId'])
export class McpIntegrationUserConfigRecord extends BaseRecord {
  @Column({ name: 'integration_id', type: 'uuid' })
  integrationId: UUID;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: UUID;

  @Column({ name: 'config_values', type: 'jsonb', default: '{}' })
  configValues: Record<string, string>;
}
