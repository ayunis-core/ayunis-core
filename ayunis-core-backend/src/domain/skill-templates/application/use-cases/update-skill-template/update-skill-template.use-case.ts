import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { SkillTemplateRepository } from '../../ports/skill-template.repository';
import { UpdateSkillTemplateCommand } from './update-skill-template.command';
import { SkillTemplate } from '../../../domain/skill-template.entity';
import { AlwaysOnSkillTemplate } from '../../../domain/always-on-skill-template.entity';
import { PreCreatedCopySkillTemplate } from '../../../domain/pre-created-copy-skill-template.entity';
import { DistributionMode } from '../../../domain/distribution-mode.enum';
import {
  DuplicateSkillTemplateNameError,
  SkillTemplateNotFoundError,
  UnexpectedSkillTemplateError,
} from '../../skill-templates.errors';

@Injectable()
export class UpdateSkillTemplateUseCase {
  private readonly logger = new Logger(UpdateSkillTemplateUseCase.name);

  constructor(
    private readonly skillTemplateRepository: SkillTemplateRepository,
  ) {}

  @HandleUnexpectedErrors(UnexpectedSkillTemplateError)
  async execute(command: UpdateSkillTemplateCommand): Promise<SkillTemplate> {
    this.logger.log('Updating skill template', {
      skillTemplateId: command.skillTemplateId,
    });

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

    const updated = this.buildUpdatedTemplate(command, existing, name);

    return await this.skillTemplateRepository.update(updated);
  }

  private buildUpdatedTemplate(
    command: UpdateSkillTemplateCommand,
    existing: SkillTemplate,
    name: string,
  ): SkillTemplate {
    const distributionMode =
      command.distributionMode ?? existing.distributionMode;
    const baseParams = {
      id: existing.id,
      name,
      shortDescription: command.shortDescription ?? existing.shortDescription,
      instructions: command.instructions ?? existing.instructions,
      isActive: command.isActive ?? existing.isActive,
      createdAt: existing.createdAt,
      updatedAt: new Date(),
    };

    return distributionMode === DistributionMode.ALWAYS_ON
      ? new AlwaysOnSkillTemplate(baseParams)
      : new PreCreatedCopySkillTemplate({
          ...baseParams,
          defaultActive:
            command.defaultActive ??
            (existing instanceof PreCreatedCopySkillTemplate
              ? existing.defaultActive
              : false),
          defaultPinned:
            command.defaultPinned ??
            (existing instanceof PreCreatedCopySkillTemplate
              ? existing.defaultPinned
              : false),
        });
  }
}
