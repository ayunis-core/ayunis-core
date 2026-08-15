import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { SkillTemplateRepository } from '../../ports/skill-template.repository';
import { CreateSkillTemplateCommand } from './create-skill-template.command';
import { SkillTemplate } from 'src/domain/skill-templates/domain/skill-template.entity';
import { AlwaysOnSkillTemplate } from 'src/domain/skill-templates/domain/always-on-skill-template.entity';
import { PreCreatedCopySkillTemplate } from 'src/domain/skill-templates/domain/pre-created-copy-skill-template.entity';
import { DistributionMode } from 'src/domain/skill-templates/domain/distribution-mode.enum';
import {
  DuplicateSkillTemplateNameError,
  UnexpectedSkillTemplateError,
} from '../../skill-templates.errors';
import { InvalidSkillTemplateNameError } from 'src/domain/skill-templates/domain/skill-template.entity';
import { ApplicationError } from 'src/common/errors/base.error';

@Injectable()
export class CreateSkillTemplateUseCase {
  constructor(
    @InjectPinoLogger(CreateSkillTemplateUseCase.name)
    private readonly logger: PinoLogger,
    private readonly skillTemplateRepository: SkillTemplateRepository,
  ) {}

  async execute(command: CreateSkillTemplateCommand): Promise<SkillTemplate> {
    this.logger.info({ name: command.name }, 'Creating skill template');
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
