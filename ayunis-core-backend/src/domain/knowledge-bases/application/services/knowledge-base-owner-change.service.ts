import { Injectable } from '@nestjs/common';
import type { UUID } from 'crypto';
import {
  getRequiredUserContext,
  type UserContext,
} from 'src/common/context/required-context';
import { ContextService } from 'src/common/context/services/context.service';
import type { KnowledgeBaseTransferOwner } from 'src/domain/knowledge-bases/application/models/knowledge-base-owner';
import { KnowledgeBaseRepository } from 'src/domain/knowledge-bases/application/ports/knowledge-base.repository';
import { AbstractCollectiveKnowledgeBase } from 'src/domain/knowledge-bases/domain/collective-knowledge-base.entity';
import type { NonWorkspaceKnowledgeBase } from 'src/domain/knowledge-bases/domain/knowledge-base';
import { OrgKnowledgeBase } from 'src/domain/knowledge-bases/domain/org-knowledge-base.entity';
import { PersonalKnowledgeBase } from 'src/domain/knowledge-bases/domain/personal-knowledge-base.entity';
import { TeamKnowledgeBase } from 'src/domain/knowledge-bases/domain/team-knowledge-base.entity';

export interface KnowledgeBaseOwnerChangePlan {
  changed: boolean;
  target: NonWorkspaceKnowledgeBase;
}

/**
 * Plans moving a knowledge base to another owner. It keeps its id, content and
 * documents, and takes over the mover's activation when it becomes
 * collectively owned.
 */
@Injectable()
export class KnowledgeBaseOwnerChangeService {
  constructor(
    private readonly repository: KnowledgeBaseRepository,
    private readonly context: ContextService,
  ) {}

  async plan(
    knowledgeBase: NonWorkspaceKnowledgeBase,
    owner: KnowledgeBaseTransferOwner,
  ): Promise<KnowledgeBaseOwnerChangePlan> {
    const user = getRequiredUserContext(this.context);
    if (this.isCurrentOwner(knowledgeBase, owner, user)) {
      return { changed: false, target: knowledgeBase };
    }
    const isActive = await this.activeStateFor(knowledgeBase, user.userId);
    return {
      changed: true,
      target: this.reown(knowledgeBase, owner, user, isActive),
    };
  }

  private isCurrentOwner(
    knowledgeBase: NonWorkspaceKnowledgeBase,
    owner: KnowledgeBaseTransferOwner,
    user: UserContext,
  ): boolean {
    switch (owner.type) {
      case 'personal':
        return (
          knowledgeBase instanceof PersonalKnowledgeBase &&
          knowledgeBase.userId === user.userId
        );
      case 'team':
        return (
          knowledgeBase instanceof TeamKnowledgeBase &&
          knowledgeBase.teamId === owner.teamId
        );
      case 'org':
        return knowledgeBase instanceof OrgKnowledgeBase;
    }
  }

  private activeStateFor(
    knowledgeBase: NonWorkspaceKnowledgeBase,
    userId: UUID,
  ): Promise<boolean> {
    if (knowledgeBase instanceof AbstractCollectiveKnowledgeBase) {
      return Promise.resolve(knowledgeBase.isActive);
    }
    return this.repository.isActive(knowledgeBase.id, userId);
  }

  private reown(
    knowledgeBase: NonWorkspaceKnowledgeBase,
    owner: KnowledgeBaseTransferOwner,
    user: UserContext,
    isActive: boolean,
  ): NonWorkspaceKnowledgeBase {
    const params = {
      id: knowledgeBase.id,
      name: knowledgeBase.name,
      description: knowledgeBase.description,
      orgId: knowledgeBase.orgId,
      createdAt: knowledgeBase.createdAt,
      updatedAt: new Date(),
    };
    switch (owner.type) {
      case 'personal':
        return new PersonalKnowledgeBase({ ...params, userId: user.userId });
      case 'team':
        return new TeamKnowledgeBase({
          ...params,
          teamId: owner.teamId,
          isActive,
        });
      case 'org':
        return new OrgKnowledgeBase({ ...params, isActive });
    }
  }
}
