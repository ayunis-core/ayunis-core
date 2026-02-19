import { Injectable, Logger } from '@nestjs/common';
import { AgentRepository } from '../../ports/agent.repository';
import { FindOneAgentQuery } from './find-one-agent.query';
import { ContextService } from 'src/common/context/services/context.service';
import { AgentNotFoundError, UnexpectedAgentError } from '../../agents.errors';
import { ApplicationError } from 'src/common/errors/base.error';
import { FindShareByEntityUseCase } from 'src/domain/shares/application/use-cases/find-share-by-entity/find-share-by-entity.use-case';
import { FindShareByEntityQuery } from 'src/domain/shares/application/use-cases/find-share-by-entity/find-share-by-entity.query';
import { SharedEntityType } from 'src/domain/shares/domain/value-objects/shared-entity-type.enum';
import { AgentWithShareStatus } from '../find-all-agents/find-all-agents.use-case';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';

@Injectable()
export class FindOneAgentUseCase {
  private readonly logger = new Logger(FindOneAgentUseCase.name);

  constructor(
    private readonly agentRepository: AgentRepository,
    private readonly findShareByEntityUseCase: FindShareByEntityUseCase,
    private readonly contextService: ContextService,
  ) {}

  async execute(query: FindOneAgentQuery): Promise<AgentWithShareStatus> {
    this.logger.log('execute', { query });
    try {
      const userId = this.contextService.get('userId');
      if (!userId) {
        throw new UnauthorizedAccessError();
      }

      // 1. Try to find owned agent first
      const ownedAgent = await this.agentRepository.findOne(query.id, userId);
      if (ownedAgent) {
        return { agent: ownedAgent, isShared: false };
      }

      // 2. Check if agent is shared with user's org
      const share = await this.findShareByEntityUseCase.execute(
        new FindShareByEntityQuery(SharedEntityType.AGENT, query.id),
      );

      if (share) {
        // 3. Fetch the shared agent by ID (no user filter)
        const sharedAgent = await this.agentRepository.findById(query.id);
        if (sharedAgent) {
          return { agent: sharedAgent, isShared: true };
        }
      }

      // Agent not found (neither owned nor shared)
      throw new AgentNotFoundError(query.id);
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }
      this.logger.error('Failed to find agent', {
        agentId: query.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new UnexpectedAgentError(
        (error as Error).message ?? 'Unknown error when finding agent',
      );
    }
  }
}
