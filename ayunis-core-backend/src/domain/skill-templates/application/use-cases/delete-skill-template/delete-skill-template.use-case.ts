import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { SkillTemplateRepository } from '../../ports/skill-template.repository';
import { DeleteSkillTemplateCommand } from './delete-skill-template.command';
import {
  SkillTemplateNotFoundError,
  UnexpectedSkillTemplateError,
} from '../../skill-templates.errors';

@Injectable()
export class DeleteSkillTemplateUseCase {
  private readonly logger = new Logger(DeleteSkillTemplateUseCase.name);

  constructor(
    private readonly skillTemplateRepository: SkillTemplateRepository,
  ) {}

  @HandleUnexpectedErrors(UnexpectedSkillTemplateError)
  async execute(command: DeleteSkillTemplateCommand): Promise<void> {
    this.logger.log('Deleting skill template', {
      skillTemplateId: command.skillTemplateId,
    });

    const existing = await this.skillTemplateRepository.findOne(
      command.skillTemplateId,
    );
    if (!existing) {
      throw new SkillTemplateNotFoundError(command.skillTemplateId);
    }

    await this.skillTemplateRepository.delete(command.skillTemplateId);
  }
}
