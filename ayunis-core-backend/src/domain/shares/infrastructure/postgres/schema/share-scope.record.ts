import { Entity, TableInheritance, ChildEntity } from 'typeorm';
import { BaseRecord } from '../../../../../common/db/base-record';
import { ShareScopeType } from '../../../../../domain/shares/domain/value-objects/share-scope-type.enum';

@Entity('share_scopes')
@TableInheritance({
  column: { type: 'enum', enum: ShareScopeType, name: 'scope_type' },
})
export class ShareScopeRecord extends BaseRecord {}

@ChildEntity(ShareScopeType.ORG)
export class OrgShareScopeRecord extends ShareScopeRecord {
  // No additional columns for OrgShareScope yet
  // Add org-specific columns here when needed
}
