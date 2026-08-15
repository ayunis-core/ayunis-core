import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { Transactional } from '@nestjs-cls/transactional';
import { SkillRepository } from '../../ports/skill.repository';
import { UpdateSkillCommand } from './update-skill.command';
import { Skill } from 'src/domain/skills/domain/skill.entity';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import {
  DuplicateSkillNameError,
  SkillNotFoundError,
  UnexpectedSkillError,
} from '../../skills.errors';
import { ApplicationError } from 'src/common/errors/base.error';
import { InvalidSkillNameError } from 'src/domain/skills/domain/skill.entity';

@Injectable()
export class UpdateSkillUseCase {
  constructor(
    @InjectPinoLogger(UpdateSkillUseCase.name)
    private readonly logger: PinoLogger,
    private readonly skillRepository: SkillRepository,
    private readonly contextService: ContextService,
  ) {}

  @Transactional()
  async execute(command: UpdateSkillCommand): Promise<Skill> {
    this.logger.info({ skillId: command.skillId }, 'Updating skill');
    try {
      const userId = this.contextService.get('userId');
      if (!userId) {
        throw new UnauthorizedAccessError();
      }

      const existingSkill = await this.skillRepository.findOne(
        command.skillId,
        userId,
      );
      if (!existingSkill) {
        throw new SkillNotFoundError(command.skillId);
      }

      // Check for duplicate name (only if name changed)
      if (command.name !== existingSkill.name) {
        const duplicate = await this.skillRepository.findByNameAndOwner(
          command.name,
          userId,
        );
        if (duplicate) {
          throw new DuplicateSkillNameError(command.name);
        }
      }

      const updatedSkill = new Skill({
        id: existingSkill.id,
        name: command.name,
        shortDescription: command.shortDescription,
        instructions: command.instructions,
        sourceIds: existingSkill.sourceIds,
        mcpIntegrationIds: existingSkill.mcpIntegrationIds,
        knowledgeBaseIds: existingSkill.knowledgeBaseIds,
        userId,
        createdAt: existingSkill.createdAt,
        updatedAt: new Date(),
      });

      return this.skillRepository.update(updatedSkill);
    } catch (error) {
      if (
        error instanceof ApplicationError ||
        error instanceof InvalidSkillNameError
      )
        throw error;
      this.logger.error({ err: error as Error }, 'Error updating skill');
      throw new UnexpectedSkillError(error);
    }
  }
}
