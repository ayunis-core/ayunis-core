import { Injectable, Logger } from '@nestjs/common';
import { AgentRepository } from '../../ports/agent.repository';
import { GetAgentQuery } from './get-agent.query';
import { Agent } from '../../../domain/agent.entity';
import { AgentNotFoundError } from '../../agents.errors';

@Injectable()
export class GetAgentUseCase {
  private readonly logger = new Logger(GetAgentUseCase.name);

  constructor(private readonly agentRepository: AgentRepository) {}

  async execute(query: GetAgentQuery): Promise<Agent> {
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
