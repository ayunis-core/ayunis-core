import { Column, Entity, OneToOne, TableInheritance } from 'typeorm';
import { BaseRecord } from '../../../../../../common/db/base-record';
import { McpIntegrationAuthRecord } from './mcp-integration-auth.record';
import { UUID } from 'crypto';

@Entity('mcp_integrations')
@TableInheritance({ column: { type: 'varchar', name: 'integration_type' } })
export abstract class McpIntegrationRecord extends BaseRecord {
  @Column()
  orgId: UUID;

  @Column()
  name: string;

  @Column()
  serverUrl: string;

  @Column({ default: true })
  enabled: boolean;

  @Column({ default: 'pending' })
  connectionStatus: string;

  @Column({ type: 'text', nullable: true })
  lastConnectionError?: string;

  @Column({ type: 'timestamp', nullable: true })
  lastConnectionCheck?: Date;

  @Column({ default: true })
  returnsPii: boolean;

  @OneToOne(() => McpIntegrationAuthRecord, (auth) => auth.integration, {
    cascade: ['insert', 'update'],
    eager: true,
  })
  auth!: McpIntegrationAuthRecord;
}
