import { Injectable, Logger } from '@nestjs/common';
import { SkillTemplateRepository } from 'src/domain/skill-templates/application/ports/skill-template.repository';
import { CreateSkillTemplateCommand } from './create-skill-template.command';
import { SkillTemplate } from 'src/domain/skill-templates/domain/skill-template.entity';
import { AlwaysOnSkillTemplate } from 'src/domain/skill-templates/domain/always-on-skill-template.entity';
import { PreCreatedCopySkillTemplate } from 'src/domain/skill-templates/domain/pre-created-copy-skill-template.entity';
import { DistributionMode } from 'src/domain/skill-templates/domain/distribution-mode.enum';
import {
  DuplicateSkillTemplateNameError,
  UnexpectedSkillTemplateError,
} from 'src/domain/skill-templates/application/skill-templates.errors';
import { InvalidSkillTemplateNameError } from 'src/domain/skill-templates/domain/skill-template.entity';
import { ApplicationError } from 'src/common/errors/base.error';

@Injectable()
export class CreateSkillTemplateUseCase {
  private readonly logger = new Logger(CreateSkillTemplateUseCase.name);

  constructor(
    private readonly skillTemplateRepository: SkillTemplateRepository,
  ) {}

  async execute(command: CreateSkillTemplateCommand): Promise<SkillTemplate> {
    this.logger.log({ name: command.name }, 'Creating skill template');
    try {
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
    } catch (error) {
      if (
        error instanceof ApplicationError ||
        error instanceof InvalidSkillTemplateNameError
      )
        throw error;
      this.logger.error(
        {
          err: error as Error,
        },
        'Error creating skill template',
      );
      throw new UnexpectedSkillTemplateError(error);
    }
  }
}
