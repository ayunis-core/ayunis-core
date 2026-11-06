import { Injectable, Logger } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { SkillRepository } from 'src/domain/skills/application/ports/skill.repository';
import { UnexpectedSkillError } from 'src/domain/skills/application/skills.errors';
import { isSameOwner } from 'src/domain/skills/application/util/is-same-owner';
import { RemoveKnowledgeBaseAssignmentsByOriginSkillCommand } from 'src/domain/threads/application/use-cases/remove-knowledge-base-assignments-by-origin-skill/remove-knowledge-base-assignments-by-origin-skill.command';
import { RemoveKnowledgeBaseAssignmentsByOriginSkillUseCase } from 'src/domain/threads/application/use-cases/remove-knowledge-base-assignments-by-origin-skill/remove-knowledge-base-assignments-by-origin-skill.use-case';
import { UnlinkKnowledgeBaseFromOtherOwnersCommand } from './unlink-knowledge-base-from-other-owners.command';

/**
 * Enforces the same-owner rule after a knowledge base changes owner, including
 * in threads that got the knowledge base through an unlinked skill. Trusted:
 * the caller has authorized the owner change.
 */
@Injectable()
export class UnlinkKnowledgeBaseFromOtherOwnersUseCase {
  private readonly logger = new Logger(
    UnlinkKnowledgeBaseFromOtherOwnersUseCase.name,
  );

  constructor(
    private readonly repository: SkillRepository,
    private readonly removeThreadAssignments: RemoveKnowledgeBaseAssignmentsByOriginSkillUseCase,
  ) {}

  @Transactional()
  @HandleUnexpectedErrors(UnexpectedSkillError)
  async execute(
    command: UnlinkKnowledgeBaseFromOtherOwnersCommand,
  ): Promise<{ unlinkedSkillCount: number }> {
    const { knowledgeBase } = command;
    this.logger.log(
      { knowledgeBaseId: knowledgeBase.id, dryRun: command.dryRun },
      'Unlinking knowledge base from skills of other owners',
    );
    const skills = await this.repository.findAllByKnowledgeBaseId(
      knowledgeBase.id,
    );
    const unlinkedIds = skills
      .filter((skill) => !isSameOwner(skill, knowledgeBase))
      .map(({ id }) => id);
    if (!command.dryRun && unlinkedIds.length > 0) {
      await this.repository.removeKnowledgeBaseFromSkills(
        knowledgeBase.id,
        unlinkedIds,
      );
      for (const skillId of unlinkedIds) {
        await this.removeThreadAssignments.execute(
          new RemoveKnowledgeBaseAssignmentsByOriginSkillCommand(
            skillId,
            null,
            knowledgeBase.id,
          ),
        );
      }
    }
    return { unlinkedSkillCount: unlinkedIds.length };
  }
}
