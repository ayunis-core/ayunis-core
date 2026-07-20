import { UUID } from 'crypto';
import { BaseRecord } from 'src/common/db/base-record';
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { OrgRecord } from 'src/iam/orgs/infrastructure/repositories/local/schema/org.record';

@Entity({ name: 'org_chat_settings' })
export class OrgChatSettingsRecord extends BaseRecord {
  @Column({ nullable: false })
  @Index({ unique: true })
  orgId: UUID;

  @ManyToOne(() => OrgRecord, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'orgId' })
  org: OrgRecord;

  @Column({ type: 'boolean', nullable: false, default: true })
  internetSearchEnabled: boolean;
}
