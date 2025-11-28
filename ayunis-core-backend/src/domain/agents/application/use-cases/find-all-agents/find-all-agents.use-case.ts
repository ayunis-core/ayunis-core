import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { AgentRepository } from '../../ports/agent.repository';
import { FindAllAgentsQuery } from './find-all-agents.query';
import { Agent } from '../../../domain/agent.entity';
import { ContextService } from 'src/common/context/services/context.service';
import { FindSharesByScopeUseCase } from 'src/domain/shares/application/use-cases/find-shares-by-scope/find-shares-by-scope.use-case';
import { FindSharesByScopeQuery } from 'src/domain/shares/application/use-cases/find-shares-by-scope/find-shares-by-scope.query';
import { SharedEntityType } from 'src/domain/shares/domain/value-objects/shared-entity-type.enum';
import { AgentShare } from 'src/domain/shares/domain/share.entity';

/**
 * Result type that includes agent and whether it's shared
 */
export interface AgentWithShareStatus {
  agent: Agent;
  isShared: boolean;
}

/**
 * Use case for finding all agents accessible to the current user
 * Includes both owned agents and agents shared with the user's organization
 */
@Injectable()
export class FindAllAgentsUseCase {
  private readonly logger = new Logger(FindAllAgentsUseCase.name);

  constructor(
    private readonly agentRepository: AgentRepository,
    private readonly findSharesByScopeUseCase: FindSharesByScopeUseCase,
    private readonly contextService: ContextService,
  ) {}

  async execute(query: FindAllAgentsQuery): Promise<AgentWithShareStatus[]> {
    this.logger.log('execute', query);

    // Get userId from context
    const userId = this.contextService.get('userId');
    if (!userId) {
      throw new UnauthorizedException('User not authenticated');
    }

    // 1. Fetch owned agents
    const ownedAgents = await this.agentRepository.findAllByOwner(userId);
    const ownedAgentIds = ownedAgents.map((a) => a.id);

    this.logger.debug('Found owned agents', { count: ownedAgents.length });

    // 2. Fetch agent shares for the user's org
    const shares = await this.findSharesByScopeUseCase.execute(
      new FindSharesByScopeQuery(SharedEntityType.AGENT),
    );

    // 3. Extract shared agent IDs and deduplicate
    const sharedAgentIds = shares
      .map((s) => (s as AgentShare).agentId)
      .filter((id) => !ownedAgentIds.includes(id));

    this.logger.debug('Found shared agents after deduplication', {
      count: sharedAgentIds.length,
    });

    // 4. Fetch shared agents
    const sharedAgents =
      sharedAgentIds.length > 0
        ? await this.agentRepository.findByIds(sharedAgentIds)
        : [];

    // 5. Combine results with isShared flag
    const ownedResults: AgentWithShareStatus[] = ownedAgents.map((agent) => ({
      agent,
      isShared: false,
    }));

    const sharedResults: AgentWithShareStatus[] = sharedAgents.map((agent) => ({
      agent,
      isShared: true,
    }));

    return [...ownedResults, ...sharedResults];
  }
}
