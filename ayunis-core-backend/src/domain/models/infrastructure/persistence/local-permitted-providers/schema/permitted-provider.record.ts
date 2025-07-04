import { UUID } from 'crypto';
import { ModelProvider } from '../../../../domain/value-objects/model-provider.enum';
import { OrgRecord } from '../../../../../../iam/orgs/infrastructure/repositories/local/schema/org.record';
import {
  Column,
  Entity,
  ManyToOne,
  PrimaryColumn,
  BeforeRemove,
} from 'typeorm';
import { PermittedModelRecord } from '../../local-permitted-models/schema/permitted-model.record';
import AppDataSource from '../../../../../../db/datasource';
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

  @BeforeRemove()
  async removeRelatedPermittedModels() {
    this.logger.log(
      `Deleting all permitted models for provider ${this.provider} and organization ${this.orgId}`,
    );
    // Delete all permitted models for this provider and organization
    // Use subquery since DELETE doesn't support joins the same way
    await AppDataSource.getRepository(PermittedModelRecord)
      .createQueryBuilder()
      .delete()
      .where('orgId = :orgId', { orgId: this.orgId })
      .andWhere(
        'modelId IN (SELECT id FROM models WHERE provider = :provider)',
        { provider: this.provider },
      )
      .execute();
  }
}
