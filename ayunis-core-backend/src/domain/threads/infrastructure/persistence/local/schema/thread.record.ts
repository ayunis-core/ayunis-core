import { UUID } from 'crypto';
import { MessageRecord } from '../../../../../messages/infrastructure/persistence/local/schema/message.record';
import { SourceRecord } from '../../../../../sources/infrastructure/persistence/local/schema/source.record';
import { Column, Entity, OneToMany, Index, ManyToOne } from 'typeorm';
import { BaseRecord } from '../../../../../../common/db/base-record';
import { PermittedModelRecord } from '../../../../../models/infrastructure/persistence/local-permitted-models/schema/permitted-model.record';

@Entity({ name: 'threads' })
export class ThreadRecord extends BaseRecord {
  @Column()
  @Index()
  userId: UUID;

  @Column()
  modelId: UUID;

  @ManyToOne(() => PermittedModelRecord, { nullable: false })
  model: PermittedModelRecord;

  @Column({ nullable: true })
  title?: string;

  @Column({ nullable: true })
  instruction?: string;

  @Column({ default: false })
  isInternetSearchEnabled: boolean;

  @OneToMany(() => MessageRecord, (message) => message.thread)
  messages: MessageRecord[];

  @OneToMany(() => SourceRecord, (source) => source.thread)
  sources: SourceRecord[];
}
