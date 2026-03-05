import { Injectable, Logger } from '@nestjs/common';
import { SkillTemplateRepository } from '../../ports/skill-template.repository';
import { CreateSkillTemplateCommand } from './create-skill-template.command';
import type { SkillTemplate } from '../../../domain/skill-template.entity';
import { InvalidSkillTemplateNameError } from '../../../domain/skill-template.entity';
import { AlwaysOnSkillTemplate } from '../../../domain/always-on-skill-template.entity';
import { PreCreatedCopySkillTemplate } from '../../../domain/pre-created-copy-skill-template.entity';
import { DistributionMode } from '../../../domain/distribution-mode.enum';
import {
  DuplicateSkillTemplateNameError,
  UnexpectedSkillTemplateError,
} from '../../skill-templates.errors';
import { ApplicationError } from 'src/common/errors/base.error';

@Injectable()
export class CreateSkillTemplateUseCase {
  private readonly logger = new Logger(CreateSkillTemplateUseCase.name);

  constructor(
    private readonly skillTemplateRepository: SkillTemplateRepository,
  ) {}

  async execute(command: CreateSkillTemplateCommand): Promise<SkillTemplate> {
    this.logger.log('Creating skill template', { name: command.name });
    try {
      const existing = await this.skillTemplateRepository.findByName(
        command.name,
      );
      if (existing) {
        throw new DuplicateSkillTemplateNameError(command.name);
      }

      const skillTemplate = this.createEntity(command);

      return await this.skillTemplateRepository.create(skillTemplate);
    } catch (error) {
      if (
        error instanceof ApplicationError ||
        error instanceof InvalidSkillTemplateNameError
      )
        throw error;
      this.logger.error('Error creating skill template', {
        error: error as Error,
      });
      throw new UnexpectedSkillTemplateError(error);
    }
  }

  private createEntity(command: CreateSkillTemplateCommand): SkillTemplate {
    const base = {
      name: command.name,
      shortDescription: command.shortDescription,
      instructions: command.instructions,
      isActive: command.isActive,
    };

    switch (command.distributionMode) {
      case DistributionMode.ALWAYS_ON:
        return new AlwaysOnSkillTemplate(base);
      case DistributionMode.PRE_CREATED_COPY:
        return new PreCreatedCopySkillTemplate({
          ...base,
          defaultActive: command.defaultActive,
          defaultPinned: command.defaultPinned,
        });
    }
  }
}
