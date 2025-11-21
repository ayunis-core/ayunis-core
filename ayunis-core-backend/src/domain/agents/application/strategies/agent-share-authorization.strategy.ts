import { Inject, Injectable, Logger } from '@nestjs/common';
import { UUID } from 'crypto';
import { ShareAuthorizationStrategy } from 'src/domain/shares/application/ports/share-authorization-strategy.port';
import { AgentRepository } from '../ports/agent.repository';

/**
 * Agent-specific implementation of share authorization
 * Validates that users can only manage shares for agents they own
 */
@Injectable()
export class AgentShareAuthorizationStrategy
  implements ShareAuthorizationStrategy
{
  private readonly logger = new Logger(AgentShareAuthorizationStrategy.name);

  constructor(
    @Inject(AgentRepository)
    private readonly agentRepository: AgentRepository,
  ) {}

  /**
   * Check if a user can view shares for an agent
   * User must own the agent to view its shares
   */
  async canViewShares(agentId: UUID, userId: UUID): Promise<boolean> {
    this.logger.log('canViewShares', { agentId, userId });

    const agent = await this.agentRepository.findOne(agentId, userId);
    // If findOne returns null, either agent doesn't exist or user doesn't own it
    return agent !== null;
  }

  /**
   * Check if a user can create a share for an agent
   * User must own the agent to create shares for it
   */
  async canCreateShare(agentId: UUID, userId: UUID): Promise<boolean> {
    this.logger.log('canCreateShare', { agentId, userId });

    const agent = await this.agentRepository.findOne(agentId, userId);
    return agent !== null;
  }

  /**
   * Check if a user can delete a share
   * For agent shares, this is handled by the shares module checking ownerId
   * This method returns true as the actual authorization happens at the share level
   */
  canDeleteShare(shareId: UUID, userId: UUID): Promise<boolean> {
    this.logger.log('canDeleteShare', { shareId, userId });

    // Share deletion authorization is handled by the shares module
    // by checking if userId matches share.ownerId
    return Promise.resolve(true);
  }
}
