import {
  Column,
  Entity,
  JoinColumn,
  OneToOne,
  TableInheritance,
} from 'typeorm';
import { BaseRecord } from '../../../../../../common/db/base-record';
import { McpIntegrationRecord } from './mcp-integration.record';
import { UUID } from 'crypto';

@Entity('mcp_integration_auth_methods')
@TableInheritance({ column: { type: 'varchar', name: 'auth_type' } })
export abstract class McpIntegrationAuthRecord extends BaseRecord {
  @Column()
  integrationId: UUID;

  @OneToOne(() => McpIntegrationRecord, (integration) => integration.auth, {
    onDelete: 'CASCADE',
  })
  @JoinColumn()
  integration!: McpIntegrationRecord;
}
