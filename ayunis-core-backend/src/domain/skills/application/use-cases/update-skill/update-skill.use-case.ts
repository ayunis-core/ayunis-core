import { Injectable, Logger } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import { SkillRepository } from '../../ports/skill.repository';
import { UpdateSkillCommand } from './update-skill.command';
import { Skill } from '../../../domain/skill.entity';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import {
  DuplicateSkillNameError,
  SkillNotFoundError,
  UnexpectedSkillError,
} from '../../skills.errors';
import { ApplicationError } from 'src/common/errors/base.error';

@Injectable()
export class UpdateSkillUseCase {
  private readonly logger = new Logger(UpdateSkillUseCase.name);

  constructor(
    private readonly skillRepository: SkillRepository,
    private readonly contextService: ContextService,
  ) {}

  @Transactional()
  async execute(command: UpdateSkillCommand): Promise<Skill> {
    this.logger.log('Updating skill', { skillId: command.skillId });
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
      if (error instanceof ApplicationError) throw error;
      this.logger.error('Error updating skill', { error: error as Error });
      throw new UnexpectedSkillError(error);
    }
  }
}
