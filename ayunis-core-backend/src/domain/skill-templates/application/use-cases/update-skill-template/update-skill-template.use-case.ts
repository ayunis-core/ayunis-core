import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
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
import { InvalidSkillTemplateNameError } from '../../../domain/skill-template.entity';
import { ApplicationError } from 'src/common/errors/base.error';

@Injectable()
export class UpdateSkillTemplateUseCase {
  constructor(
    @InjectPinoLogger(UpdateSkillTemplateUseCase.name)
    private readonly logger: PinoLogger,
    private readonly skillTemplateRepository: SkillTemplateRepository,
  ) {}

  async execute(command: UpdateSkillTemplateCommand): Promise<SkillTemplate> {
    this.logger.info(
      { skillTemplateId: command.skillTemplateId },
      'Updating skill template',
    );
    try {
      const existing = await this.findExisting(command);
      const name = await this.resolveName(command, existing);
      const updated = this.buildUpdatedTemplate(command, existing, name);
      return await this.skillTemplateRepository.update(updated);
    } catch (error) {
      if (
        error instanceof ApplicationError ||
        error instanceof InvalidSkillTemplateNameError
      ) {
        throw error;
      }
      this.logger.error(
        { err: error as Error },
        'Error updating skill template',
      );
      throw new UnexpectedSkillTemplateError(error);
    }
  }

  private async findExisting(
    command: UpdateSkillTemplateCommand,
  ): Promise<SkillTemplate> {
    const existing = await this.skillTemplateRepository.findOne(
      command.skillTemplateId,
    );
    if (!existing) {
      throw new SkillTemplateNotFoundError(command.skillTemplateId);
    }
    return existing;
  }

  private async resolveName(
    command: UpdateSkillTemplateCommand,
    existing: SkillTemplate,
  ): Promise<string> {
    const name = command.name ?? existing.name;
    if (name === existing.name) {
      return name;
    }
    const duplicate = await this.skillTemplateRepository.findByName(name);
    if (duplicate) {
      throw new DuplicateSkillTemplateNameError(name);
    }
    return name;
  }

  private buildUpdatedTemplate(
    command: UpdateSkillTemplateCommand,
    existing: SkillTemplate,
    name: string,
  ): SkillTemplate {
    const baseParams = this.buildBaseParams(command, existing, name);
    const mode = command.distributionMode ?? existing.distributionMode;
    if (mode === DistributionMode.ALWAYS_ON) {
      return new AlwaysOnSkillTemplate(baseParams);
    }
    return this.buildPreCreatedTemplate(command, existing, baseParams);
  }

  private buildBaseParams(
    command: UpdateSkillTemplateCommand,
    existing: SkillTemplate,
    name: string,
  ) {
    return {
      id: existing.id,
      name,
      shortDescription: command.shortDescription ?? existing.shortDescription,
      instructions: command.instructions ?? existing.instructions,
      isActive: command.isActive ?? existing.isActive,
      createdAt: existing.createdAt,
      updatedAt: new Date(),
    };
  }

  private buildPreCreatedTemplate(
    command: UpdateSkillTemplateCommand,
    existing: SkillTemplate,
    baseParams: ConstructorParameters<typeof AlwaysOnSkillTemplate>[0],
  ): PreCreatedCopySkillTemplate {
    const previous =
      existing instanceof PreCreatedCopySkillTemplate ? existing : undefined;
    return new PreCreatedCopySkillTemplate({
      ...baseParams,
      defaultActive: command.defaultActive ?? previous?.defaultActive ?? false,
      defaultPinned: command.defaultPinned ?? previous?.defaultPinned ?? false,
    });
  }
}
