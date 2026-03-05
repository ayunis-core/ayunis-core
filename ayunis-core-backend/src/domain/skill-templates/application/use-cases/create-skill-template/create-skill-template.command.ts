import type { DistributionMode } from '../../../domain/distribution-mode.enum';

export class CreateSkillTemplateCommand {
  public readonly name: string;
  public readonly shortDescription: string;
  public readonly instructions: string;
  public readonly distributionMode: DistributionMode;
  public readonly isActive?: boolean;
  public readonly defaultActive?: boolean;
  public readonly defaultPinned?: boolean;

  constructor(params: {
    name: string;
    shortDescription: string;
    instructions: string;
    distributionMode: DistributionMode;
    isActive?: boolean;
    defaultActive?: boolean;
    defaultPinned?: boolean;
  }) {
    this.name = params.name;
    this.shortDescription = params.shortDescription;
    this.instructions = params.instructions;
    this.distributionMode = params.distributionMode;
    this.isActive = params.isActive;
    this.defaultActive = params.defaultActive;
    this.defaultPinned = params.defaultPinned;
  }
}
