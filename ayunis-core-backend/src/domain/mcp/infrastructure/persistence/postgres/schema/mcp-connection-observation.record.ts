import { Column, Entity, JoinColumn, ManyToOne, Unique } from 'typeorm';
import { BaseRecord } from 'src/common/db/base-record';
import type { UUID } from 'crypto';
import { McpIntegrationRecord } from './mcp-integration.record';
import { UserRecord } from 'src/iam/users/infrastructure/repositories/local/schema/user.record';
import type { McpConnectionFailure } from 'src/domain/mcp/domain/mcp-connection-observation';

@Entity('mcp_connection_observations')
@Unique(['integrationId', 'userId'])
export class McpConnectionObservationRecord extends BaseRecord {
  @Column({ name: 'integration_id', type: 'varchar' })
  integrationId: UUID;

  @ManyToOne(() => McpIntegrationRecord, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'integration_id' })
  integration: McpIntegrationRecord;

  @Column({ name: 'user_id', type: 'varchar' })
  userId: UUID;

  @ManyToOne(() => UserRecord, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: UserRecord;

  @Column()
  revision: string;

  @Column({ type: 'timestamp' })
  startedAt: Date;

  @Column({ type: 'timestamp' })
  checkedAt: Date;

  @Column({ type: 'varchar', nullable: true })
  failure: McpConnectionFailure | null;
}
