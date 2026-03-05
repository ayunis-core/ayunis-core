import type { UUID } from 'crypto';
import type { DistributionMode } from '../../../domain/distribution-mode.enum';

export class UpdateSkillTemplateCommand {
  public readonly skillTemplateId: UUID;
  public readonly name?: string;
  public readonly shortDescription?: string;
  public readonly instructions?: string;
  public readonly distributionMode?: DistributionMode;
  public readonly isActive?: boolean;

  constructor(params: {
    skillTemplateId: UUID;
    name?: string;
    shortDescription?: string;
    instructions?: string;
    distributionMode?: DistributionMode;
    isActive?: boolean;
  }) {
    this.skillTemplateId = params.skillTemplateId;
    this.name = params.name;
    this.shortDescription = params.shortDescription;
    this.instructions = params.instructions;
    this.distributionMode = params.distributionMode;
    this.isActive = params.isActive;
  }
}
