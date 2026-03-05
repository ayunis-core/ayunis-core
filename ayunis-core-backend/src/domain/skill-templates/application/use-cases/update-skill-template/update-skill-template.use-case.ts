import { Injectable, Logger } from '@nestjs/common';
import { SkillTemplateRepository } from '../../ports/skill-template.repository';
import { UpdateSkillTemplateCommand } from './update-skill-template.command';
import type { SkillTemplate } from '../../../domain/skill-template.entity';
import { InvalidSkillTemplateNameError } from '../../../domain/skill-template.entity';
import { AlwaysOnSkillTemplate } from '../../../domain/always-on-skill-template.entity';
import { PreCreatedCopySkillTemplate } from '../../../domain/pre-created-copy-skill-template.entity';
import { DistributionMode } from '../../../domain/distribution-mode.enum';
import {
  DuplicateSkillTemplateNameError,
  SkillTemplateNotFoundError,
  UnexpectedSkillTemplateError,
} from '../../skill-templates.errors';
import { ApplicationError } from 'src/common/errors/base.error';

@Injectable()
export class UpdateSkillTemplateUseCase {
  private readonly logger = new Logger(UpdateSkillTemplateUseCase.name);

  constructor(
    private readonly skillTemplateRepository: SkillTemplateRepository,
  ) {}

  async execute(command: UpdateSkillTemplateCommand): Promise<SkillTemplate> {
    this.logger.log('Updating skill template', {
      skillTemplateId: command.skillTemplateId,
    });
    try {
      const existing = await this.skillTemplateRepository.findOne(
        command.skillTemplateId,
      );
      if (!existing) {
        throw new SkillTemplateNotFoundError(command.skillTemplateId);
      }

      const name = command.name ?? existing.name;

      if (name !== existing.name) {
        const duplicate = await this.skillTemplateRepository.findByName(name);
        if (duplicate) {
          throw new DuplicateSkillTemplateNameError(name);
        }
      }

      const targetMode = command.distributionMode ?? existing.distributionMode;
      const updated = this.buildUpdatedEntity(
        existing,
        command,
        name,
        targetMode,
      );

      return await this.skillTemplateRepository.update(updated);
    } catch (error) {
      if (
        error instanceof ApplicationError ||
        error instanceof InvalidSkillTemplateNameError
      )
        throw error;
      this.logger.error('Error updating skill template', {
        error: error as Error,
      });
      throw new UnexpectedSkillTemplateError(error);
    }
  }

  private buildUpdatedEntity(
    existing: SkillTemplate,
    command: UpdateSkillTemplateCommand,
    name: string,
    targetMode: DistributionMode,
  ): SkillTemplate {
    const base = {
      id: existing.id,
      name,
      shortDescription: command.shortDescription ?? existing.shortDescription,
      instructions: command.instructions ?? existing.instructions,
      isActive: command.isActive ?? existing.isActive,
      createdAt: existing.createdAt,
      updatedAt: new Date(),
    };

    switch (targetMode) {
      case DistributionMode.ALWAYS_ON:
        return new AlwaysOnSkillTemplate(base);
      case DistributionMode.PRE_CREATED_COPY: {
        const existingCopy =
          existing instanceof PreCreatedCopySkillTemplate ? existing : null;
        return new PreCreatedCopySkillTemplate({
          ...base,
          defaultActive:
            command.defaultActive ?? existingCopy?.defaultActive ?? false,
          defaultPinned:
            command.defaultPinned ?? existingCopy?.defaultPinned ?? false,
        });
      }
    }
  }
}
