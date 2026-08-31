import type { UUID } from 'crypto';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  Unique,
} from 'typeorm';
import { UserRecord } from 'src/iam/users/infrastructure/repositories/local/schema/user.record';
import { KnowledgeBaseRecord } from './knowledge-base.record';

@Entity('knowledge_base_activations')
@Unique(['knowledgeBaseId', 'userId'])
export class KnowledgeBaseActivationRecord {
  @PrimaryColumn('uuid')
  id: UUID;

  @Column('uuid')
  knowledgeBaseId: UUID;

  @ManyToOne(() => KnowledgeBaseRecord, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'knowledgeBaseId' })
  knowledgeBase: KnowledgeBaseRecord;

  @Column('uuid')
  @Index()
  userId: UUID;

  @ManyToOne(() => UserRecord, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: UserRecord;

  @CreateDateColumn()
  createdAt: Date;
}
