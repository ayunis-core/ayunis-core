import { UUID } from 'crypto';
import { Column, Entity, Index } from 'typeorm';
import { BaseRecord } from '../../../../../../common/db/base-record';

@Entity({ name: 'prompts' })
export class PromptRecord extends BaseRecord {
  @Column()
  title: string;

  @Column('text')
  content: string;

  @Column()
  @Index()
  userId: UUID;
}
