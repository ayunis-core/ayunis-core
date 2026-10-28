import { Injectable, Logger } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { SkillRepository } from 'src/domain/skills/application/ports/skill.repository';
import { SkillAuthorizationService } from 'src/domain/skills/application/services/skill-authorization.service';
import {
  DuplicateSkillNameError,
  SkillInvalidInputError,
  SkillNotFoundError,
  UnexpectedSkillError,
} from 'src/domain/skills/application/skills.errors';
import { InvalidSkillNameError } from 'src/domain/skills/domain/abstract-skill.entity';
import type { Skill } from 'src/domain/skills/domain/skill';
import { WorkspaceSkill } from 'src/domain/skills/domain/workspace-skill.entity';
import { UpdateSkillCommand } from './update-skill.command';

@Injectable()
export class UpdateSkillUseCase {
  private readonly logger = new Logger(UpdateSkillUseCase.name);

  constructor(
    private readonly repository: SkillRepository,
    private readonly authorization: SkillAuthorizationService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedSkillError)
  @Transactional()
  async execute(command: UpdateSkillCommand): Promise<Skill> {
    this.logger.log({ skillId: command.skillId }, 'Updating skill');
    const existing = await this.repository.findById(command.skillId);
    if (!existing) throw new SkillNotFoundError(command.skillId);
    await this.authorization.requireWrite(existing);
    await this.assertUniqueName(existing, command.name);
    try {
      const updated = existing.withUpdates({
        name: command.name,
        shortDescription: command.shortDescription,
        instructions: command.instructions,
        updatedAt: new Date(),
      });
      return this.repository.update(updated, existing);
    } catch (error) {
      if (error instanceof InvalidSkillNameError) {
        throw new SkillInvalidInputError(error.message);
      }
      throw error;
    }
  }

  private async assertUniqueName(skill: Skill, name: string): Promise<void> {
    if (name === skill.name) return;
    const duplicate =
      skill instanceof WorkspaceSkill
        ? await this.repository.findByNameAndWorkspace(name, skill.workspaceId)
        : await this.repository.findByNameAndOwner(name, skill.userId);
    if (duplicate && duplicate.id !== skill.id) {
      throw new DuplicateSkillNameError(name);
    }
  }
}
