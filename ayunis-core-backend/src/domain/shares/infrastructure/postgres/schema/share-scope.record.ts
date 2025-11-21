import {
  Entity,
  TableInheritance,
  ChildEntity,
  ManyToOne,
  Column,
} from 'typeorm';
import { BaseRecord } from '../../../../../common/db/base-record';
import { ShareScopeType } from '../../../../../domain/shares/domain/value-objects/share-scope-type.enum';
import { OrgRecord } from '../../../../../iam/orgs/infrastructure/repositories/local/schema/org.record';
import { UUID } from 'crypto';

@Entity('share_scopes')
@TableInheritance({
  column: { type: 'enum', enum: ShareScopeType, name: 'scope_type' },
})
export class ShareScopeRecord extends BaseRecord {}

@ChildEntity(ShareScopeType.ORG)
export class OrgShareScopeRecord extends ShareScopeRecord {
  @Column()
  orgId: UUID;

  @ManyToOne(() => OrgRecord, { nullable: false, onDelete: 'CASCADE' })
  org: OrgRecord;
}
