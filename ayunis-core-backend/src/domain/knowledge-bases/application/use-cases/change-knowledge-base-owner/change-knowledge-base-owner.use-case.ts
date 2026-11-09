import { Injectable, Logger } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import type { UUID } from 'crypto';
import { getRequiredUserContext } from 'src/common/context/required-context';
import { ContextService } from 'src/common/context/services/context.service';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import {
  KnowledgeBaseNotFoundError,
  KnowledgeBaseOwnerChangeNotAllowedError,
  UnexpectedKnowledgeBaseError,
} from 'src/domain/knowledge-bases/application/knowledge-bases.errors';
import { KnowledgeBaseRepository } from 'src/domain/knowledge-bases/application/ports/knowledge-base.repository';
import { KnowledgeBaseOwnerChangeService } from 'src/domain/knowledge-bases/application/services/knowledge-base-owner-change.service';
import { KnowledgeBaseWriteAccessService } from 'src/domain/knowledge-bases/application/services/knowledge-base-write-access.service';
import { AbstractCollectiveKnowledgeBase } from 'src/domain/knowledge-bases/domain/collective-knowledge-base.entity';
import type {
  KnowledgeBase,
  NonWorkspaceKnowledgeBase,
} from 'src/domain/knowledge-bases/domain/knowledge-base';
import { OrgKnowledgeBase } from 'src/domain/knowledge-bases/domain/org-knowledge-base.entity';
import { TeamKnowledgeBase } from 'src/domain/knowledge-bases/domain/team-knowledge-base.entity';
import { WorkspaceKnowledgeBase } from 'src/domain/knowledge-bases/domain/workspace-knowledge-base.entity';
import type { RemainingShareScope } from 'src/domain/shares/application/events/share-deleted.event';
import { RemoveEntitySharesCommand } from 'src/domain/shares/application/use-cases/remove-entity-shares/remove-entity-shares.command';
import { RemoveEntitySharesUseCase } from 'src/domain/shares/application/use-cases/remove-entity-shares/remove-entity-shares.use-case';
import { ShareScopeType } from 'src/domain/shares/domain/value-objects/share-scope-type.enum';
import { SharedEntityType } from 'src/domain/shares/domain/value-objects/shared-entity-type.enum';
import { UnlinkKnowledgeBaseFromOtherOwnersCommand } from 'src/domain/skills/application/use-cases/unlink-knowledge-base-from-other-owners/unlink-knowledge-base-from-other-owners.command';
import { UnlinkKnowledgeBaseFromOtherOwnersUseCase } from 'src/domain/skills/application/use-cases/unlink-knowledge-base-from-other-owners/unlink-knowledge-base-from-other-owners.use-case';
import { ChangeKnowledgeBaseOwnerCommand } from './change-knowledge-base-owner.command';

/**
 * Moves a knowledge base between the caller, a team and the organization.
 * Requires the right to manage both the current and the new owner. Links from
 * skills of other owners are removed, shares are removed, and everyone outside
 * the new owner's audience is reconciled through the share listeners.
 */
@Injectable()
export class ChangeKnowledgeBaseOwnerUseCase {
  private readonly logger = new Logger(ChangeKnowledgeBaseOwnerUseCase.name);

  constructor(
    private readonly repository: KnowledgeBaseRepository,
    private readonly writeAccess: KnowledgeBaseWriteAccessService,
    private readonly ownerChange: KnowledgeBaseOwnerChangeService,
    private readonly unlinkSkills: UnlinkKnowledgeBaseFromOtherOwnersUseCase,
    private readonly removeShares: RemoveEntitySharesUseCase,
    private readonly context: ContextService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedKnowledgeBaseError)
  @Transactional()
  async execute(
    command: ChangeKnowledgeBaseOwnerCommand,
  ): Promise<KnowledgeBase> {
    this.logger.log(
      {
        knowledgeBaseId: command.knowledgeBaseId,
        ownerType: command.owner.type,
      },
      'Changing knowledge base owner',
    );
    const knowledgeBase = await this.findMovable(command.knowledgeBaseId);
    const plan = await this.ownerChange.plan(knowledgeBase, command.owner);
    if (!plan.changed) return knowledgeBase;
    await this.writeAccess.requireCreate(plan.target);

    const moved = await this.repository.save(plan.target);
    const { userId } = getRequiredUserContext(this.context);
    await this.transferStateToMover(knowledgeBase, moved, userId);
    await this.unlinkSkills.execute(
      new UnlinkKnowledgeBaseFromOtherOwnersCommand(moved),
    );
    await this.removeShares.execute(
      new RemoveEntitySharesCommand(
        SharedEntityType.KNOWLEDGE_BASE,
        moved.id,
        userId,
        this.audienceOf(moved),
      ),
    );
    return moved;
  }

  private async findMovable(id: UUID): Promise<NonWorkspaceKnowledgeBase> {
    // The lock keeps a concurrent rename or activation from undoing the move.
    const knowledgeBase = await this.repository.findById(id, { lock: true });
    if (!knowledgeBase) throw new KnowledgeBaseNotFoundError(id);
    await this.writeAccess.requireWrite(knowledgeBase);
    if (knowledgeBase instanceof WorkspaceKnowledgeBase) {
      throw new KnowledgeBaseOwnerChangeNotAllowedError(id);
    }
    return knowledgeBase;
  }

  /**
   * A moved knowledge base has no shares left, so the only per-user activation
   * that can still count is the mover's, and only when it became personal;
   * it then takes over the former global state.
   */
  private async transferStateToMover(
    previous: KnowledgeBase,
    moved: KnowledgeBase,
    userId: UUID,
  ): Promise<void> {
    await this.repository.deactivateAllUsers(moved.id);
    if (
      previous instanceof AbstractCollectiveKnowledgeBase &&
      previous.isActive &&
      !(moved instanceof AbstractCollectiveKnowledgeBase)
    ) {
      await this.repository.activate(moved.id, userId);
    }
  }

  private audienceOf(knowledgeBase: KnowledgeBase): RemainingShareScope[] {
    if (knowledgeBase instanceof TeamKnowledgeBase) {
      return [
        { scopeType: ShareScopeType.TEAM, scopeId: knowledgeBase.teamId },
      ];
    }
    if (knowledgeBase instanceof OrgKnowledgeBase) {
      return [{ scopeType: ShareScopeType.ORG, scopeId: knowledgeBase.orgId }];
    }
    return [];
  }
}
