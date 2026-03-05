import { Column, Entity, TableInheritance } from 'typeorm';
import { BaseRecord } from '../../../../../../common/db/base-record';

@Entity({ name: 'skill_templates' })
@TableInheritance({ column: { type: 'varchar', name: 'distributionMode' } })
export abstract class SkillTemplateRecord extends BaseRecord {
  @Column({ nullable: false, unique: true })
  name: string;

  @Column({ nullable: false })
  shortDescription: string;

  @Column({ nullable: false, type: 'text' })
  instructions: string;

  @Column({ nullable: false, default: false })
  isActive: boolean;

  // STI: owned by PreCreatedCopy, null for other subtypes — on base record so TypeORM includes them in UPDATE for all child entities
  @Column({ type: 'boolean', nullable: true })
  defaultActive: boolean | null;

  // STI: owned by PreCreatedCopy, null for other subtypes — on base record so TypeORM includes them in UPDATE for all child entities
  @Column({ type: 'boolean', nullable: true })
  defaultPinned: boolean | null;
}
