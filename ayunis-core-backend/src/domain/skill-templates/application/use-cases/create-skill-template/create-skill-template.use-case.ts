import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { SkillTemplateRepository } from '../../ports/skill-template.repository';
import { CreateSkillTemplateCommand } from './create-skill-template.command';
import { SkillTemplate } from '../../../domain/skill-template.entity';
import { AlwaysOnSkillTemplate } from '../../../domain/always-on-skill-template.entity';
import { PreCreatedCopySkillTemplate } from '../../../domain/pre-created-copy-skill-template.entity';
import { DistributionMode } from '../../../domain/distribution-mode.enum';
import {
  DuplicateSkillTemplateNameError,
  UnexpectedSkillTemplateError,
} from '../../skill-templates.errors';

@Injectable()
export class CreateSkillTemplateUseCase {
  private readonly logger = new Logger(CreateSkillTemplateUseCase.name);

  constructor(
    private readonly skillTemplateRepository: SkillTemplateRepository,
  ) {}

  @HandleUnexpectedErrors(UnexpectedSkillTemplateError)
  async execute(command: CreateSkillTemplateCommand): Promise<SkillTemplate> {
    this.logger.log('Creating skill template', { name: command.name });

    const existing = await this.skillTemplateRepository.findByName(
      command.name,
    );
    if (existing) {
      throw new DuplicateSkillTemplateNameError(command.name);
    }

    const baseParams = {
      name: command.name,
      shortDescription: command.shortDescription,
      instructions: command.instructions,
      isActive: command.isActive,
    };

    const skillTemplate: SkillTemplate =
      command.distributionMode === DistributionMode.ALWAYS_ON
        ? new AlwaysOnSkillTemplate(baseParams)
        : new PreCreatedCopySkillTemplate({
            ...baseParams,
            defaultActive: command.defaultActive,
            defaultPinned: command.defaultPinned,
          });

    return await this.skillTemplateRepository.create(skillTemplate);
  }
}
