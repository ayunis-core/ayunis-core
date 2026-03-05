import type { UUID } from 'crypto';
import { DistributionMode } from './distribution-mode.enum';
import { SkillTemplate } from './skill-template.entity';

export class AlwaysOnSkillTemplate extends SkillTemplate {
  public readonly distributionMode = DistributionMode.ALWAYS_ON;

  constructor(params: {
    id?: UUID;
    name: string;
    shortDescription: string;
    instructions: string;
    isActive?: boolean;
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    super(params);
  }
}
