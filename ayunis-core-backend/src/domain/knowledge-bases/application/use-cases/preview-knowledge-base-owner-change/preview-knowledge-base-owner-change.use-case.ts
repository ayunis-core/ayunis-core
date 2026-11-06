import { Injectable, Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import {
  KnowledgeBaseNotFoundError,
  KnowledgeBaseOwnerChangeNotAllowedError,
  UnexpectedKnowledgeBaseError,
} from 'src/domain/knowledge-bases/application/knowledge-bases.errors';
import type { KnowledgeBaseTransferOwner } from 'src/domain/knowledge-bases/application/models/knowledge-base-owner';
import { KnowledgeBaseRepository } from 'src/domain/knowledge-bases/application/ports/knowledge-base.repository';
import { KnowledgeBaseOwnerChangeService } from 'src/domain/knowledge-bases/application/services/knowledge-base-owner-change.service';
import { KnowledgeBaseWriteAccessService } from 'src/domain/knowledge-bases/application/services/knowledge-base-write-access.service';
import { WorkspaceKnowledgeBase } from 'src/domain/knowledge-bases/domain/workspace-knowledge-base.entity';
import { UnlinkKnowledgeBaseFromOtherOwnersCommand } from 'src/domain/skills/application/use-cases/unlink-knowledge-base-from-other-owners/unlink-knowledge-base-from-other-owners.command';
import { UnlinkKnowledgeBaseFromOtherOwnersUseCase } from 'src/domain/skills/application/use-cases/unlink-knowledge-base-from-other-owners/unlink-knowledge-base-from-other-owners.use-case';

/** What moving a knowledge base would drop, so the UI can warn first. */
@Injectable()
export class PreviewKnowledgeBaseOwnerChangeUseCase {
  private readonly logger = new Logger(
    PreviewKnowledgeBaseOwnerChangeUseCase.name,
  );

  constructor(
    private readonly repository: KnowledgeBaseRepository,
    private readonly writeAccess: KnowledgeBaseWriteAccessService,
    private readonly ownerChange: KnowledgeBaseOwnerChangeService,
    private readonly unlinkSkills: UnlinkKnowledgeBaseFromOtherOwnersUseCase,
  ) {}

  @HandleUnexpectedErrors(UnexpectedKnowledgeBaseError)
  async execute(query: {
    knowledgeBaseId: UUID;
    owner: KnowledgeBaseTransferOwner;
  }): Promise<{ unlinkedSkillCount: number }> {
    this.logger.log(query, 'Previewing knowledge base owner change');
    const knowledgeBase = await this.repository.findById(query.knowledgeBaseId);
    if (!knowledgeBase) {
      throw new KnowledgeBaseNotFoundError(query.knowledgeBaseId);
    }
    await this.writeAccess.requireWrite(knowledgeBase);
    if (knowledgeBase instanceof WorkspaceKnowledgeBase) {
      throw new KnowledgeBaseOwnerChangeNotAllowedError(knowledgeBase.id);
    }
    const plan = await this.ownerChange.plan(knowledgeBase, query.owner);
    if (!plan.changed) return { unlinkedSkillCount: 0 };
    return this.unlinkSkills.execute(
      new UnlinkKnowledgeBaseFromOtherOwnersCommand(plan.target, true),
    );
  }
}
