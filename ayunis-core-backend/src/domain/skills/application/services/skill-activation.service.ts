import { Injectable, Logger } from '@nestjs/common';
import { SkillAccessService } from 'src/domain/skills/application/services/skill-access.service';
import { AddSourceToThreadUseCase } from 'src/domain/threads/application/use-cases/add-source-to-thread/add-source-to-thread.use-case';
import { AddSourceCommand } from 'src/domain/threads/application/use-cases/add-source-to-thread/add-source.command';
import { AddMcpIntegrationToThreadUseCase } from 'src/domain/threads/application/use-cases/add-mcp-integration-to-thread/add-mcp-integration-to-thread.use-case';
import { AddMcpIntegrationToThreadCommand } from 'src/domain/threads/application/use-cases/add-mcp-integration-to-thread/add-mcp-integration-to-thread.command';
import { AddKnowledgeBaseToThreadUseCase } from 'src/domain/threads/application/use-cases/add-knowledge-base-to-thread/add-knowledge-base-to-thread.use-case';
import { AddKnowledgeBaseToThreadCommand } from 'src/domain/threads/application/use-cases/add-knowledge-base-to-thread/add-knowledge-base-to-thread.command';
import { GetSourcesByIdsUseCase } from 'src/domain/sources/application/use-cases/get-sources-by-ids/get-sources-by-ids.use-case';
import { GetSourcesByIdsQuery } from 'src/domain/sources/application/use-cases/get-sources-by-ids/get-sources-by-ids.query';
import { SourceAlreadyAssignedError } from 'src/domain/threads/application/threads.errors';
import { KnowledgeBaseNotFoundError } from 'src/domain/knowledge-bases/application/knowledge-bases.errors';
import type { Thread } from 'src/domain/threads/domain/thread.entity';
import type { UUID } from 'crypto';

export interface SkillActivationResult {
  instructions: string;
  skillName: string;
}

@Injectable()
export class SkillActivationService {
  private readonly logger = new Logger(SkillActivationService.name);

  constructor(
    private readonly skillAccessService: SkillAccessService,
    private readonly addSourceToThreadUseCase: AddSourceToThreadUseCase,
    private readonly addMcpIntegrationToThreadUseCase: AddMcpIntegrationToThreadUseCase,
    private readonly addKnowledgeBaseToThreadUseCase: AddKnowledgeBaseToThreadUseCase,
    private readonly getSourcesByIdsUseCase: GetSourcesByIdsUseCase,
  ) {}

  /**
   * Activates a skill on a thread by copying its sources, MCP integrations,
   * and knowledge bases, then returns the skill's instructions for inclusion
   * in the user message.
   */
  async activateOnThread(
    skillId: UUID,
    thread: Thread,
  ): Promise<SkillActivationResult> {
    this.logger.log('Activating skill on thread', {
      skillId,
      threadId: thread.id,
    });

    const skill = await this.skillAccessService.findAccessibleSkill(skillId);

    // Copy skill's sources to the thread
    const sources = await this.getSourcesByIdsUseCase.execute(
      new GetSourcesByIdsQuery(skill.sourceIds),
    );
    for (const source of sources) {
      try {
        await this.addSourceToThreadUseCase.execute(
          new AddSourceCommand(thread, source, skill.id),
        );
      } catch (error) {
        if (error instanceof SourceAlreadyAssignedError) {
          this.logger.log('Source already assigned to thread, skipping', {
            sourceId: source.id,
            threadId: thread.id,
          });
          continue;
        }
        throw error;
      }
    }

    // Copy skill's MCP integrations to the thread
    for (const mcpIntegrationId of skill.mcpIntegrationIds) {
      await this.addMcpIntegrationToThreadUseCase.execute(
        new AddMcpIntegrationToThreadCommand(thread.id, mcpIntegrationId),
      );
    }

    // Copy skill's knowledge bases to the thread
    for (const knowledgeBaseId of skill.knowledgeBaseIds) {
      try {
        await this.addKnowledgeBaseToThreadUseCase.execute(
          new AddKnowledgeBaseToThreadCommand(
            thread.id,
            knowledgeBaseId,
            skill.id,
          ),
        );
      } catch (error) {
        if (error instanceof KnowledgeBaseNotFoundError) {
          this.logger.warn(
            'Knowledge base not found, skipping (stale reference)',
            {
              knowledgeBaseId,
              threadId: thread.id,
            },
          );
          continue;
        }
        throw error;
      }
    }

    return { instructions: skill.instructions, skillName: skill.name };
  }
}
