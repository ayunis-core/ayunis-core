import { Injectable, Logger } from '@nestjs/common';
import { SkillTemplateRepository } from '../../ports/skill-template.repository';
import { DeleteSkillTemplateCommand } from './delete-skill-template.command';
import {
  SkillTemplateNotFoundError,
  UnexpectedSkillTemplateError,
} from '../../skill-templates.errors';
import { ApplicationError } from 'src/common/errors/base.error';

@Injectable()
export class DeleteSkillTemplateUseCase {
  private readonly logger = new Logger(DeleteSkillTemplateUseCase.name);

  constructor(
    private readonly skillTemplateRepository: SkillTemplateRepository,
  ) {}

  async execute(command: DeleteSkillTemplateCommand): Promise<void> {
    this.logger.log('Deleting skill template', {
      skillTemplateId: command.skillTemplateId,
    });
    try {
      const existing = await this.skillTemplateRepository.findOne(
        command.skillTemplateId,
      );
      if (!existing) {
        throw new SkillTemplateNotFoundError(command.skillTemplateId);
      }

      await this.skillTemplateRepository.delete(command.skillTemplateId);
    } catch (error) {
      if (error instanceof ApplicationError) throw error;
      this.logger.error('Error deleting skill template', {
        error: error as Error,
      });
      throw new UnexpectedSkillTemplateError(error);
    }
  }
}
