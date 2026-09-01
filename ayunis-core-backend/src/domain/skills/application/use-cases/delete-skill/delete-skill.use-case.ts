import { Injectable } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { SkillRepository } from 'src/domain/skills/application/ports/skill.repository';
import {
  SkillNotFoundError,
  UnexpectedSkillError,
} from 'src/domain/skills/application/skills.errors';
import { DeleteSkillCommand } from './delete-skill.command';

@Injectable()
export class DeleteSkillUseCase {
  constructor(
    @InjectPinoLogger(DeleteSkillUseCase.name)
    private readonly logger: PinoLogger,
    private readonly skillRepository: SkillRepository,
    private readonly contextService: ContextService,
  ) {}

  @Transactional()
  @HandleUnexpectedErrors(UnexpectedSkillError)
  async execute(command: DeleteSkillCommand): Promise<void> {
    const userId = this.contextService.get('userId');
    if (!userId) throw new UnauthorizedAccessError();
    this.logger.info(
      { skillId: command.skillId, workspaceId: command.workspaceId },
      'deleteSkill',
    );

    if (command.workspaceId) {
      const skills = await this.skillRepository.findByIds([command.skillId]);
      const skill = skills.find(({ id }) => id === command.skillId);
      if (!skill) throw new SkillNotFoundError(command.skillId);
      if (skill.workspaceId !== command.workspaceId) {
        throw new SkillNotFoundError(command.skillId);
      }
      await this.skillRepository.deleteByWorkspace(
        command.skillId,
        command.workspaceId,
      );
      return;
    }

    const skill = await this.skillRepository.findOne(command.skillId, userId);
    if (!skill) throw new SkillNotFoundError(command.skillId);
    await this.skillRepository.delete(command.skillId, userId);
  }
}
