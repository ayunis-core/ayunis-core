import { Injectable } from '@nestjs/common';
import { SharedEntityType } from '../../domain/value-objects/shared-entity-type.enum';
import { ShareAuthorizationStrategy } from '../ports/share-authorization-strategy.port';
import { AgentShareAuthorizationStrategy } from 'src/domain/agents/application/strategies/agent-share-authorization.strategy';

/**
 * Factory for getting the appropriate authorization strategy for each entity type
 */
@Injectable()
export class ShareAuthorizationFactory {
  constructor(
    private readonly agentStrategy: AgentShareAuthorizationStrategy,
    // Future: Add other strategies as new entity types are supported
    // private readonly promptStrategy: PromptShareAuthorizationStrategy,
  ) {}

  /**
   * Get the authorization strategy for a given entity type
   * @param entityType - The type of entity (agent, prompt, etc.)
   * @returns The appropriate authorization strategy
   * @throws Error if entity type is not supported
   */
  getStrategy(entityType: SharedEntityType): ShareAuthorizationStrategy {
    switch (entityType) {
      case SharedEntityType.AGENT:
        return this.agentStrategy;

      // Future: Add other entity types
      // case SharedEntityType.PROMPT:
      //   return this.promptStrategy;

      default:
        throw new Error(
          `Unsupported entity type for share authorization: ${entityType}`,
        );
    }
  }
}
