import {
  Column,
  Entity,
  JoinColumn,
  OneToOne,
  TableInheritance,
} from 'typeorm';
import { BaseRecord } from '../../../../../../common/db/base-record';
import { McpIntegrationRecord } from './mcp-integration.record';

@Entity('mcp_integration_auth_methods')
@TableInheritance({ column: { type: 'varchar', name: 'auth_type' } })
export abstract class McpIntegrationAuthRecord extends BaseRecord {
  @Column({ name: 'integration_id' })
  integrationId: string;

  @OneToOne(() => McpIntegrationRecord, (integration) => integration.auth, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'integration_id' })
  integration!: McpIntegrationRecord;
}
