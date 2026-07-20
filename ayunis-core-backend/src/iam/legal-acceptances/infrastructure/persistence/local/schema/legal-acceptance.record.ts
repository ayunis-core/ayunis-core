import { BaseRecord } from 'src/common/db/base-record';
import { LegalAcceptanceType } from 'src/iam/legal-acceptances/domain/value-objects/legal-acceptance-type.enum';
import { OrgRecord } from 'src/iam/orgs/infrastructure/repositories/local/schema/org.record';
import { UserRecord } from 'src/iam/users/infrastructure/repositories/local/schema/user.record';
import {
  ChildEntity,
  Column,
  Entity,
  ManyToOne,
  TableInheritance,
} from 'typeorm';
import { UUID } from 'crypto';

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
  userId: UUID;

  @ManyToOne(() => UserRecord, { onDelete: 'CASCADE' })
  user: UserRecord;

  @Column()
  orgId: UUID;

  @ManyToOne(() => OrgRecord, { onDelete: 'CASCADE' })
  org: OrgRecord;

  @Column()
  type: LegalAcceptanceType;
}

@ChildEntity(LegalAcceptanceType.TERMS_OF_SERVICE)
export class TermsOfServiceLegalAcceptanceRecord extends LegalAcceptanceRecord {}

@ChildEntity(LegalAcceptanceType.PRIVACY_POLICY)
export class PrivacyPolicyLegalAcceptanceRecord extends LegalAcceptanceRecord {}
