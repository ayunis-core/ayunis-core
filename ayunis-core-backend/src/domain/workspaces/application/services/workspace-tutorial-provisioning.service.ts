import { Injectable, Logger } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import type { UUID } from 'crypto';
import { OrgContextRunner } from 'src/common/context/services/org-context-runner.service';
import { AddUrlToKnowledgeBaseUseCase } from 'src/domain/knowledge-bases/application/use-cases/add-url-to-knowledge-base/add-url-to-knowledge-base.use-case';
import { AddUrlToKnowledgeBaseCommand } from 'src/domain/knowledge-bases/application/use-cases/add-url-to-knowledge-base/add-url-to-knowledge-base.command';
import { CreateKnowledgeBaseUseCase } from 'src/domain/knowledge-bases/application/use-cases/create-knowledge-base/create-knowledge-base.use-case';
import { CreateKnowledgeBaseCommand } from 'src/domain/knowledge-bases/application/use-cases/create-knowledge-base/create-knowledge-base.command';
import { AssignKnowledgeBaseToSkillUseCase } from 'src/domain/skills/application/use-cases/assign-knowledge-base-to-skill/assign-knowledge-base-to-skill.use-case';
import { CreateSkillUseCase } from 'src/domain/skills/application/use-cases/create-skill/create-skill.use-case';
import { CreateSkillCommand } from 'src/domain/skills/application/use-cases/create-skill/create-skill.command';
import { CreateWorkspaceUseCase } from 'src/domain/workspaces/application/use-cases/create-workspace/create-workspace.use-case';
import { CreateWorkspaceCommand } from 'src/domain/workspaces/application/use-cases/create-workspace/create-workspace.command';
import {
  WORKSPACE_TUTORIAL_HELP_ARTICLE_URL,
  WORKSPACE_TUTORIAL_NAME,
} from 'src/domain/workspaces/domain/workspaces.constants';

@Injectable()
export class WorkspaceTutorialProvisioningService {
  private readonly logger = new Logger(
    WorkspaceTutorialProvisioningService.name,
  );

  constructor(
    private readonly contextRunner: OrgContextRunner,
    private readonly createWorkspace: CreateWorkspaceUseCase,
    private readonly createSkill: CreateSkillUseCase,
    private readonly createKnowledgeBase: CreateKnowledgeBaseUseCase,
    private readonly assignKnowledgeBase: AssignKnowledgeBaseToSkillUseCase,
    private readonly addUrl: AddUrlToKnowledgeBaseUseCase,
  ) {}

  // The create use cases read the principal from the context, which here is
  // the creator's request or none at all.
  provisionFor(userId: UUID, orgId: UUID): Promise<void> {
    return this.contextRunner.runForUser(userId, orgId, async () => {
      const knowledgeBaseId = await this.createTemplate();
      // The template transaction must commit before a worker can read its KB.
      await this.attachHelpArticle(knowledgeBaseId);
    });
  }

  // One unit: a failure after the workspace save must not leave a permanent
  // half-tutorial, since the user-created event never fires again.
  @Transactional()
  private async createTemplate(): Promise<UUID> {
    const workspace = await this.createWorkspace.execute(
      new CreateWorkspaceCommand({
        name: WORKSPACE_TUTORIAL_NAME,
        description:
          'Bevor Sie Ihren eigenen Arbeitsbereich anlegen: probieren Sie hier kurz aus, wie einer funktioniert.',
        icon: 'folder',
        color: 'violet',
      }),
    );
    return this.createResources(workspace.id);
  }

  private async createResources(workspaceId: UUID): Promise<UUID> {
    const owner = { type: 'workspace' as const, workspaceId };
    const skill = await this.createSkill.execute(
      new CreateSkillCommand({
        owner,
        name: 'Arbeitsbereich erklären',
        shortDescription:
          'Wird aktiviert, wenn gefragt wird, was ein Arbeitsbereich ist, wie er sich von einem Chat unterscheidet oder wie man ihn benutzt.',
        instructions:
          'Erkläre in maximal drei Sätzen und ohne Fachbegriffe: Ein Arbeitsbereich bündelt Chats, eine eigene Wissensbasis und eigene Fähigkeiten zu einem Thema und lässt sich als Favorit oben in der Seitenleiste anpinnen.',
      }),
    );
    const knowledgeBase = await this.createKnowledgeBase.execute(
      new CreateKnowledgeBaseCommand({
        owner,
        name: 'Helpcenter: Arbeitsbereiche',
        description: `Der Helpcenter-Artikel zu Arbeitsbereichen. Nutze diese Wissenssammlung, wenn nach der Funktion, Einrichtung oder Bedienung von Arbeitsbereichen gefragt wird. ${WORKSPACE_TUTORIAL_HELP_ARTICLE_URL}`,
      }),
    );
    await this.assignKnowledgeBase.execute({
      skillId: skill.id,
      knowledgeBaseId: knowledgeBase.id,
    });
    return knowledgeBase.id;
  }

  private async attachHelpArticle(knowledgeBaseId: UUID): Promise<void> {
    try {
      await this.addUrl.execute(
        new AddUrlToKnowledgeBaseCommand({
          knowledgeBaseId,
          url: WORKSPACE_TUTORIAL_HELP_ARTICLE_URL,
          maxDepth: 0,
        }),
      );
    } catch (error) {
      this.logger.error(
        { knowledgeBaseId, err: error },
        'Failed to attach tutorial Help Center article',
      );
    }
  }
}
