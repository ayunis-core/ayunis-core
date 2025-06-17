import { Injectable, Logger } from '@nestjs/common';
import { AgentRepository } from '../../ports/agent.repository';
import { FindAgentQuery } from './find-agent.query';
import { Agent } from '../../../domain/agent.entity';
import { AgentNotFoundError } from '../../agents.errors';

@Injectable()
export class FindAgentUseCase {
  private readonly logger = new Logger(FindAgentUseCase.name);

  constructor(private readonly agentRepository: AgentRepository) {}

  async execute(query: FindAgentQuery): Promise<Agent> {
    this.logger.log('execute', query);
    const agent = await this.agentRepository.findOne(query.id, query.userId);
    if (!agent) {
      throw new AgentNotFoundError(query.id, {
        userId: query.userId,
      });
    }
    return agent;
  }
}
