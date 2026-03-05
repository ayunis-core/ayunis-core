import type { UUID } from 'crypto';
import type { SkillTemplate } from '../../domain/skill-template.entity';
import type { DistributionMode } from '../../domain/distribution-mode.enum';

export abstract class SkillTemplateRepository {
  abstract create(skillTemplate: SkillTemplate): Promise<SkillTemplate>;
  abstract update(skillTemplate: SkillTemplate): Promise<SkillTemplate>;
  abstract delete(id: UUID): Promise<void>;
  abstract findOne(id: UUID): Promise<SkillTemplate | null>;
  abstract findAll(): Promise<SkillTemplate[]>;
  abstract findByName(name: string): Promise<SkillTemplate | null>;
  abstract findActiveByMode(mode: DistributionMode): Promise<SkillTemplate[]>;
}
