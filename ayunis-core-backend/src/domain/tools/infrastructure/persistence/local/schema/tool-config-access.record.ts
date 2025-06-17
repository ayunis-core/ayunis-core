import { BaseRecord } from '../../../../../../common/db/base-record';
import { Column, Entity, Index, ManyToOne } from 'typeorm';
import { ToolConfigRecord } from './tool-config.record';
import { UUID } from 'crypto';

@Entity()
export class TollConfigAccessRecord extends BaseRecord {
  @ManyToOne(() => ToolConfigRecord)
  toolConfig: ToolConfigRecord;

  @Column()
  @Index()
  recipientId: UUID;
}
