import { Injectable, Logger } from '@nestjs/common';
import { AgentRepository } from '../../ports/agent.repository';
import { FindManyAgentsQuery } from './find-many-agents.query';
import { Agent } from '../../../domain/agent.entity';

@Injectable()
export class FindManyAgentsUseCase {
  private readonly logger = new Logger(FindManyAgentsUseCase.name);

  constructor(private readonly agentRepository: AgentRepository) {}

  async execute(query: FindManyAgentsQuery): Promise<Agent[]> {
    this.logger.log('execute', query);
    return this.agentRepository.findMany(query.agentIds, query.userId);
  }
}
