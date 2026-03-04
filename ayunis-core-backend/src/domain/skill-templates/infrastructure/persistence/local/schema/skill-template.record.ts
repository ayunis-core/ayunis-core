import { Column, Entity } from 'typeorm';
import { BaseRecord } from '../../../../../../common/db/base-record';
import { DistributionMode } from '../../../../domain/distribution-mode.enum';

@Entity({ name: 'skill_templates' })
export class SkillTemplateRecord extends BaseRecord {
  @Column({ nullable: false, unique: true })
  name: string;

  @Column({ nullable: false })
  shortDescription: string;

  @Column({ nullable: false, type: 'text' })
  instructions: string;

  @Column({
    type: 'enum',
    enum: DistributionMode,
    nullable: false,
  })
  distributionMode: DistributionMode;

  @Column({ nullable: false, default: false })
  isActive: boolean;
}
