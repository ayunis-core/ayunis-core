import { Column, Entity, Index, OneToOne, TableInheritance } from 'typeorm';
import { BaseRecord } from '../../../../../../common/db/base-record';
import { McpIntegrationAuthRecord } from './mcp-integration-auth.record';

@Entity('mcp_integrations')
@TableInheritance({ column: { type: 'varchar', name: 'integration_type' } })
@Index(['orgId', 'predefinedSlug'], {
  unique: true,
  where: 'predefined_slug IS NOT NULL',
})
export abstract class McpIntegrationRecord extends BaseRecord {
  @Column({ name: 'org_id' })
  orgId: string;

  @Column()
  name: string;

  @Column({ name: 'server_url' })
  serverUrl: string;

  @Column({ default: true })
  enabled: boolean;

  @Column({ name: 'connection_status', default: 'pending' })
  connectionStatus: string;

  @Column({ name: 'last_connection_error', type: 'text', nullable: true })
  lastConnectionError?: string;

  @Column({ name: 'last_connection_check', type: 'timestamp', nullable: true })
  lastConnectionCheck?: Date;

  @OneToOne(() => McpIntegrationAuthRecord, (auth) => auth.integration, {
    cascade: ['insert', 'update'],
    eager: true,
  })
  auth!: McpIntegrationAuthRecord;
}
