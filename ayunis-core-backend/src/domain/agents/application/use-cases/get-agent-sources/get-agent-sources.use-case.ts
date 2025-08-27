import { Injectable, Logger } from '@nestjs/common';
import { GetAgentSourcesQuery } from './get-agent-sources.query';
import { AgentRepository } from '../../ports/agent.repository';
import { Source } from '../../../../sources/domain/source.entity';
import { AgentNotFoundError } from '../../agents.errors';
import { ContextService } from 'src/common/context/services/context.service';

@Injectable()
export class GetAgentSourcesUseCase {
  private readonly logger = new Logger(GetAgentSourcesUseCase.name);

  constructor(
    private readonly agentRepository: AgentRepository,
    private readonly contextService: ContextService,
  ) {}

  async execute(query: GetAgentSourcesQuery): Promise<Source[]> {
    this.logger.log('execute', { agentId: query.agentId });

    const userId = this.contextService.get('userId');
    if (!userId) {
      throw new Error('User not authenticated');
    }

    const agent = await this.agentRepository.findOne(query.agentId, userId);
    if (!agent) {
      throw new AgentNotFoundError(query.agentId);
    }

    const sources = agent.sourceAssignments.map((assignment) => assignment.source);

    this.logger.debug('Retrieved agent sources successfully', {
      agentId: query.agentId,
      sourceCount: sources.length,
    });

    return sources;
  }
}