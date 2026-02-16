import { Injectable } from '@nestjs/common';
import { SharedEntityType } from '../../domain/value-objects/shared-entity-type.enum';
import { ShareAuthorizationStrategy } from '../ports/share-authorization-strategy.port';
import { AgentShareAuthorizationStrategy } from 'src/domain/agents/application/strategies/agent-share-authorization.strategy';
import { SkillShareAuthorizationStrategy } from 'src/domain/skills/application/strategies/skill-share-authorization.strategy';

/**
 * Factory for getting the appropriate authorization strategy for each entity type
 */
@Injectable()
export class ShareAuthorizationFactory {
  constructor(
    private readonly agentStrategy: AgentShareAuthorizationStrategy,
    private readonly skillStrategy: SkillShareAuthorizationStrategy,
  ) {}

  /**
   * Get the authorization strategy for a given entity type
   * @param entityType - The type of entity (agent, skill, etc.)
   * @returns The appropriate authorization strategy
   * @throws Error if entity type is not supported
   */
  getStrategy(entityType: SharedEntityType): ShareAuthorizationStrategy {
    switch (entityType) {
      case SharedEntityType.AGENT:
        return this.agentStrategy;

      case SharedEntityType.SKILL:
        return this.skillStrategy;

      default:
        throw new Error(
          `Unsupported entity type for share authorization: ${entityType}`,
        );
    }
  }
}
