import { BaseRecord } from '../../../../../../common/db/base-record';
import { ModelProvider } from '../../../../../../domain/models/domain/value-objects/model-provider.enum';
import { LegalAcceptanceType } from '../../../../domain/value-objects/legal-acceptance-type.enum';
import { OrgRecord } from '../../../../../../iam/orgs/infrastructure/repositories/local/schema/org.record';
import { UserRecord } from '../../../../../../iam/users/infrastructure/repositories/local/schema/user.record';
import {
  ChildEntity,
  Column,
  Entity,
  Index,
  ManyToOne,
  TableInheritance,
} from 'typeorm';

@Entity({ name: 'legal_acceptances' })
@TableInheritance({
  column: {
    type: 'varchar',
    name: 'type',
  },
})
export abstract class LegalAcceptanceRecord extends BaseRecord {
  @Column()
  version: string;

  @Column()
  userId: string;

  @ManyToOne(() => UserRecord, { onDelete: 'NO ACTION' })
  user: UserRecord;

  @Column()
  orgId: string;

  @ManyToOne(() => OrgRecord, { onDelete: 'CASCADE' })
  org: OrgRecord;

  @Column()
  type: LegalAcceptanceType;
}

@ChildEntity(LegalAcceptanceType.TERMS_OF_SERVICE)
export class TermsOfServiceLegalAcceptanceRecord extends LegalAcceptanceRecord {}

@ChildEntity(LegalAcceptanceType.PRIVACY_POLICY)
export class PrivacyPolicyLegalAcceptanceRecord extends LegalAcceptanceRecord {}

@ChildEntity(LegalAcceptanceType.MODEL_PROVIDER)
export class ModelProviderLegalAcceptanceRecord extends LegalAcceptanceRecord {
  @Column({
    type: 'enum',
    enum: ModelProvider,
  })
  modelProvider: ModelProvider;
}
