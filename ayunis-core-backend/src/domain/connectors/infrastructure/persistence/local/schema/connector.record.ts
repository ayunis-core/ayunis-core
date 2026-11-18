import type { UUID } from 'crypto';
import { Column, Entity, JoinColumn, ManyToOne, Unique } from 'typeorm';
import { BaseRecord } from 'src/common/db/base-record';
import { OrgRecord } from 'src/iam/orgs/infrastructure/repositories/local/schema/org.record';
import { ConnectorProduct } from 'src/domain/connectors/domain/connector-product.enum';
import type { ConnectorSetup } from 'src/domain/connectors/domain/connector.entity';

@Entity({ name: 'connectors' })
@Unique(['orgId', 'product'])
export class ConnectorRecord extends BaseRecord {
  // No separate index on orgId: the (orgId, product) unique constraint already
  // indexes it as the leading column, for lookups and for the FK cascade.
  @Column({ nullable: false })
  orgId: UUID;

  @ManyToOne(() => OrgRecord, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'orgId' })
  org: OrgRecord;

  @Column({ type: 'enum', enum: ConnectorProduct })
  product: ConnectorProduct;

  @Column({ type: 'jsonb', default: {} })
  setup: ConnectorSetup;

  @Column({ type: 'text', nullable: true })
  encryptedCredentials: string | null;
}
