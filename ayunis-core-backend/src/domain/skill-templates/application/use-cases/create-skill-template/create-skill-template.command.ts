import type { DistributionMode } from '../../../domain/distribution-mode.enum';

export class CreateSkillTemplateCommand {
  public readonly name: string;
  public readonly shortDescription: string;
  public readonly instructions: string;
  public readonly distributionMode: DistributionMode;
  public readonly isActive?: boolean;

  constructor(params: {
    name: string;
    shortDescription: string;
    instructions: string;
    distributionMode: DistributionMode;
    isActive?: boolean;
  }) {
    this.name = params.name;
    this.shortDescription = params.shortDescription;
    this.instructions = params.instructions;
    this.distributionMode = params.distributionMode;
    this.isActive = params.isActive;
  }
}
