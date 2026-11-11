import type { UUID } from 'crypto';
import { Column, Entity, JoinColumn, ManyToOne, Unique } from 'typeorm';
import { BaseRecord } from 'src/common/db/base-record';
import { UserRecord } from 'src/iam/users/infrastructure/repositories/local/schema/user.record';
import { McpIntegrationRecord } from './mcp-integration.record';

@Entity('mcp_tool_allowances')
@Unique(['userId', 'integrationId', 'toolName'])
export class McpToolAllowanceRecord extends BaseRecord {
  @Column({ name: 'user_id', type: 'varchar' })
  userId: UUID;

  @ManyToOne(() => UserRecord, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: UserRecord;

  @Column({ name: 'integration_id', type: 'varchar' })
  integrationId: UUID;

  @ManyToOne(() => McpIntegrationRecord, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'integration_id' })
  integration: McpIntegrationRecord;

  @Column({ name: 'tool_name', type: 'varchar' })
  toolName: string;
}
