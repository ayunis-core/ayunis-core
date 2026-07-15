import { Injectable, Logger } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { SkillRepository } from '../../ports/skill.repository';
import { UpdateSkillCommand } from './update-skill.command';
import { Skill } from '../../../domain/skill.entity';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import {
  DuplicateSkillNameError,
  SkillInvalidInputError,
  SkillNotFoundError,
  UnexpectedSkillError,
} from '../../skills.errors';
import { InvalidSkillNameError } from '../../../domain/skill.entity';

@Injectable()
export class UpdateSkillUseCase {
  private readonly logger = new Logger(UpdateSkillUseCase.name);

  constructor(
    private readonly skillRepository: SkillRepository,
    private readonly contextService: ContextService,
  ) {}

  @Transactional()
  @HandleUnexpectedErrors(UnexpectedSkillError)
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

      return await this.skillRepository.update(updatedSkill);
    } catch (error) {
      // InvalidSkillNameError is a plain Error; translate it so the decorator
      // does not wrap it into a 500.
      if (error instanceof InvalidSkillNameError) {
        throw new SkillInvalidInputError(error.message);
      }
      throw error;
    }
  }
}
