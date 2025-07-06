import { UUID } from 'crypto';
import { ModelProvider } from '../../../../domain/value-objects/model-provider.enum';
import { OrgRecord } from '../../../../../../iam/orgs/infrastructure/repositories/local/schema/org.record';
import { Column, Entity, ManyToOne, PrimaryColumn } from 'typeorm';
import { Logger } from '@nestjs/common';

@Entity({ name: 'permitted_providers' })
export class PermittedProviderRecord {
  private readonly logger = new Logger(PermittedProviderRecord.name);

  @PrimaryColumn({ type: 'enum', enum: ModelProvider })
  provider: ModelProvider;

  @ManyToOne(() => OrgRecord, { onDelete: 'CASCADE', nullable: false })
  org: OrgRecord;

  @Column({ type: 'uuid' })
  orgId: UUID;
}
