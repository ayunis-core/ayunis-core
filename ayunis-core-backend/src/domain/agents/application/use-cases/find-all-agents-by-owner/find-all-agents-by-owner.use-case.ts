import { Injectable, Logger } from '@nestjs/common';
import { AgentRepository } from '../../ports/agent.repository';
import { FindAllAgentsByOwnerQuery } from './find-all-agents-by-owner.query';
import { Agent } from '../../../domain/agent.entity';

@Injectable()
export class FindAllAgentsByOwnerUseCase {
  private readonly logger = new Logger(FindAllAgentsByOwnerUseCase.name);

  constructor(private readonly agentRepository: AgentRepository) {}

  async execute(query: FindAllAgentsByOwnerQuery): Promise<Agent[]> {
    this.logger.log('execute', query);
    return this.agentRepository.findAllByOwner(query.userId);
  }
}
