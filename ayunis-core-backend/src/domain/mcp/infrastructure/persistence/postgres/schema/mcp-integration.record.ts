import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  TableInheritance,
} from 'typeorm';
import { BaseRecord } from 'src/common/db/base-record';
import { McpIntegrationAuthRecord } from './mcp-integration-auth.record';
import { OrgRecord } from 'src/iam/orgs/infrastructure/repositories/local/schema/org.record';
import { UUID } from 'crypto';

@Entity('mcp_integrations')
@TableInheritance({ column: { type: 'varchar', name: 'integration_type' } })
export abstract class McpIntegrationRecord extends BaseRecord {
  @Column()
  orgId: UUID;

  @ManyToOne(() => OrgRecord, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({ name: 'orgId' })
  org: OrgRecord;

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

  @Column({ type: 'text', nullable: true })
  description?: string;

  @OneToOne(() => McpIntegrationAuthRecord, (auth) => auth.integration, {
    cascade: ['insert', 'update'],
    eager: true,
  })
  auth!: McpIntegrationAuthRecord;
}
