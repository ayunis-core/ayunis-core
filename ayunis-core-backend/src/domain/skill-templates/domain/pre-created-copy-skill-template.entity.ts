import type { UUID } from 'crypto';
import { DistributionMode } from './distribution-mode.enum';
import { SkillTemplate } from './skill-template.entity';

export class PreCreatedCopySkillTemplate extends SkillTemplate {
  public readonly distributionMode = DistributionMode.PRE_CREATED_COPY;
  public readonly defaultActive: boolean;
  public readonly defaultPinned: boolean;

  constructor(params: {
    id?: UUID;
    name: string;
    shortDescription: string;
    instructions: string;
    isActive?: boolean;
    defaultActive?: boolean;
    defaultPinned?: boolean;
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    super(params);
    this.defaultActive = params.defaultActive ?? false;
    this.defaultPinned = params.defaultPinned ?? false;
  }
}
