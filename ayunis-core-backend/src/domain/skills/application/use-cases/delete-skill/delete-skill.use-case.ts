import { Injectable, Logger } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { SkillRepository } from 'src/domain/skills/application/ports/skill.repository';
import { SkillAuthorizationService } from 'src/domain/skills/application/services/skill-authorization.service';
import {
  SkillNotFoundError,
  UnexpectedSkillError,
} from 'src/domain/skills/application/skills.errors';
import { DeleteSkillCommand } from './delete-skill.command';

@Injectable()
export class DeleteSkillUseCase {
  private readonly logger = new Logger(DeleteSkillUseCase.name);

  constructor(
    private readonly repository: SkillRepository,
    private readonly authorization: SkillAuthorizationService,
  ) {}

  @Transactional()
  @HandleUnexpectedErrors(UnexpectedSkillError)
  async execute(command: DeleteSkillCommand): Promise<void> {
    this.logger.log({ skillId: command.skillId }, 'Deleting skill');
    const skill = await this.repository.findById(command.skillId);
    if (!skill) throw new SkillNotFoundError(command.skillId);
    await this.authorization.requireWrite(skill);
    await this.repository.delete(skill.id);
  }
}
