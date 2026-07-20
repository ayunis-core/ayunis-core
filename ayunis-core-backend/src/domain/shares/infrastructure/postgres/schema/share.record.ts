import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  TableInheritance,
  ChildEntity,
} from 'typeorm';
import { BaseRecord } from 'src/common/db/base-record';
import { SharedEntityType } from 'src/domain/shares/domain/value-objects/shared-entity-type.enum';
import { ShareScopeRecord } from './share-scope.record';
import { SkillRecord } from 'src/domain/skills/infrastructure/persistence/local/schema/skill.record';
import { KnowledgeBaseRecord } from 'src/domain/knowledge-bases/infrastructure/persistence/local/schema/knowledge-base.record';
import { UUID } from 'crypto';

@Entity('shares')
@TableInheritance({ column: { type: 'varchar', name: 'entity_type' } })
export class ShareRecord extends BaseRecord {
  @ManyToOne(() => ShareScopeRecord, {
    eager: true,
    cascade: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'scope_id' })
  scope: ShareScopeRecord;

  @Column({ name: 'owner_id' })
  ownerId: UUID;
}

@ChildEntity(SharedEntityType.SKILL)
export class SkillShareRecord extends ShareRecord {
  @Column({ name: 'skill_id' })
  skillId: UUID;

  @ManyToOne(() => SkillRecord, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({ name: 'skill_id' })
  skill: SkillRecord;
}

@ChildEntity(SharedEntityType.KNOWLEDGE_BASE)
export class KnowledgeBaseShareRecord extends ShareRecord {
  @Column({ name: 'knowledge_base_id' })
  knowledgeBaseId: UUID;

  @ManyToOne(() => KnowledgeBaseRecord, {
    onDelete: 'CASCADE',
    nullable: false,
  })
  @JoinColumn({ name: 'knowledge_base_id' })
  knowledgeBase: KnowledgeBaseRecord;
}
