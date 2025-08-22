import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { AgentRepository } from '../../ports/agent.repository';
import { GetAgentQuery } from './get-agent.query';
import { Agent } from '../../../domain/agent.entity';
import { AgentNotFoundError } from '../../agents.errors';
import { ContextService } from 'src/common/context/services/context.service';

@Injectable()
export class GetAgentUseCase {
  private readonly logger = new Logger(GetAgentUseCase.name);

  constructor(
    private readonly agentRepository: AgentRepository,
    private readonly contextService: ContextService,
  ) {}

  async execute(query: GetAgentQuery): Promise<Agent> {
    this.logger.log('execute', query);
    const userId = this.contextService.get('userId');
    if (!userId) {
      throw new UnauthorizedException('User not authenticated');
    }
    const agent = await this.agentRepository.findOne(query.id, userId);
    if (!agent) {
      throw new AgentNotFoundError(query.id, {
        userId,
      });
    }
    return agent;
  }
}
