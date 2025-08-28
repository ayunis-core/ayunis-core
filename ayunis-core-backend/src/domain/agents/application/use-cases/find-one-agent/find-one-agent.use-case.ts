import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { AgentRepository } from '../../ports/agent.repository';
import { FindOneAgentQuery } from './find-one-agent.query';
import { Agent } from 'src/domain/agents/domain/agent.entity';
import { ContextService } from 'src/common/context/services/context.service';
import { AgentNotFoundError, UnexpectedAgentError } from '../../agents.errors';
import { ApplicationError } from 'src/common/errors/base.error';

@Injectable()
export class FindOneAgentUseCase {
  private readonly logger = new Logger(FindOneAgentUseCase.name);

  constructor(
    private readonly agentRepository: AgentRepository,
    private readonly contextService: ContextService,
  ) {}

  async execute(query: FindOneAgentQuery): Promise<Agent> {
    this.logger.log('execute', { query });
    try {
      const userId = this.contextService.get('userId');
      if (!userId) {
        throw new UnauthorizedException('User not authenticated');
      }
      const agent = await this.agentRepository.findOne(query.id, userId);
      if (!agent) {
        throw new AgentNotFoundError(query.id);
      }
      return agent;
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }
      this.logger.error('Failed to find agent', {
        agentId: query.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new UnexpectedAgentError(
        (error as Error)?.message ?? 'Unknown error when finding agent',
      );
    }
  }
}
