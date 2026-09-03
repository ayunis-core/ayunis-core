import { Injectable, Logger } from '@nestjs/common';
import { SkillTemplateRepository } from 'src/domain/skill-templates/application/ports/skill-template.repository';
import { DeleteSkillTemplateCommand } from './delete-skill-template.command';
import {
  SkillTemplateNotFoundError,
  UnexpectedSkillTemplateError,
} from 'src/domain/skill-templates/application/skill-templates.errors';
import { ApplicationError } from 'src/common/errors/base.error';

@Injectable()
export class DeleteSkillTemplateUseCase {
  private readonly logger = new Logger(DeleteSkillTemplateUseCase.name);

  constructor(
    private readonly skillTemplateRepository: SkillTemplateRepository,
  ) {}

  async execute(command: DeleteSkillTemplateCommand): Promise<void> {
    this.logger.log(
      {
        skillTemplateId: command.skillTemplateId,
      },
      'Deleting skill template',
    );
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
      this.logger.error(
        {
          err: error as Error,
        },
        'Error deleting skill template',
      );
      throw new UnexpectedSkillTemplateError(error);
    }
  }
}
