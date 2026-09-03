import { Injectable, Logger } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import { SkillRepository } from 'src/domain/skills/application/ports/skill.repository';
import { DeleteSkillCommand } from './delete-skill.command';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import {
  SkillNotFoundError,
  UnexpectedSkillError,
} from 'src/domain/skills/application/skills.errors';
import { ApplicationError } from 'src/common/errors/base.error';

@Injectable()
export class DeleteSkillUseCase {
  private readonly logger = new Logger(DeleteSkillUseCase.name);

  constructor(
    private readonly skillRepository: SkillRepository,
    private readonly contextService: ContextService,
  ) {}

  @Transactional()
  async execute(command: DeleteSkillCommand): Promise<void> {
    this.logger.log({ skillId: command.skillId }, 'Deleting skill');
    try {
      const userId = this.contextService.get('userId');
      if (!userId) {
        throw new UnauthorizedAccessError();
      }

      const skill = await this.skillRepository.findOne(command.skillId, userId);
      if (!skill) {
        throw new SkillNotFoundError(command.skillId);
      }

      await this.skillRepository.delete(command.skillId, userId);
    } catch (error) {
      if (error instanceof ApplicationError) throw error;
      this.logger.error({ err: error as Error }, 'Error deleting skill');
      throw new UnexpectedSkillError(error);
    }
  }
}
