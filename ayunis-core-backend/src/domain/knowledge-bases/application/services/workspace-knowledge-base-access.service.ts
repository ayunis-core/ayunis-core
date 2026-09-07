import { Injectable } from '@nestjs/common';
import type { UUID } from 'crypto';
import { KnowledgeBaseRepository } from 'src/domain/knowledge-bases/application/ports/knowledge-base.repository';
import { KnowledgeBaseNotFoundError } from 'src/domain/knowledge-bases/application/knowledge-bases.errors';
import { WorkspaceKnowledgeBase } from 'src/domain/knowledge-bases/domain/workspace-knowledge-base.entity';

@Injectable()
export class WorkspaceKnowledgeBaseAccessService {
  constructor(private readonly repository: KnowledgeBaseRepository) {}

  async requireInWorkspace(
    workspaceId: UUID,
    knowledgeBaseId: UUID,
  ): Promise<WorkspaceKnowledgeBase> {
    const knowledgeBase = await this.repository.findById(knowledgeBaseId);
    if (
      !(knowledgeBase instanceof WorkspaceKnowledgeBase) ||
      knowledgeBase.workspaceId !== workspaceId
    ) {
      throw new KnowledgeBaseNotFoundError(knowledgeBaseId);
    }
    return knowledgeBase;
  }
}
