import { Injectable, OnModuleInit } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { SharedEntityType } from '../../domain/value-objects/shared-entity-type.enum';
import { ShareAuthorizationStrategy } from '../ports/share-authorization-strategy.port';

/**
 * Injection token for registering share authorization strategies.
 * Each entity module provides its strategy using this token pattern:
 * `SHARE_AUTH_STRATEGY_<ENTITY_TYPE>` (e.g. `SHARE_AUTH_STRATEGY_agent`)
 */
export const SHARE_AUTH_STRATEGY_TOKEN = 'SHARE_AUTH_STRATEGY';

export function getShareAuthStrategyToken(
  entityType: SharedEntityType,
): string {
  return `${SHARE_AUTH_STRATEGY_TOKEN}_${entityType}`;
}

/**
 * Factory for getting the appropriate authorization strategy for each entity type.
 *
 * Strategies are resolved lazily via ModuleRef to avoid circular module imports.
 * Each entity module (Agents, Skills, etc.) registers its strategy as a named provider
 * using `getShareAuthStrategyToken(entityType)` and exports it.
 */
@Injectable()
export class ShareAuthorizationFactory implements OnModuleInit {
  private strategies = new Map<SharedEntityType, ShareAuthorizationStrategy>();

  constructor(private readonly moduleRef: ModuleRef) {}

  onModuleInit() {
    for (const entityType of Object.values(SharedEntityType)) {
      const token = getShareAuthStrategyToken(entityType);
      try {
        const strategy = this.moduleRef.get<ShareAuthorizationStrategy>(token, {
          strict: false,
        });
        this.strategies.set(entityType, strategy);
      } catch {
        // Strategy not registered for this entity type — will throw at getStrategy() time
      }
    }
  }

  /**
   * Get the authorization strategy for a given entity type
   * @param entityType - The type of entity (agent, skill, etc.)
   * @returns The appropriate authorization strategy
   * @throws Error if entity type is not supported
   */
  getStrategy(entityType: SharedEntityType): ShareAuthorizationStrategy {
    const strategy = this.strategies.get(entityType);
    if (!strategy) {
      throw new Error(
        `Unsupported entity type for share authorization: ${entityType}`,
      );
    }
    return strategy;
  }
}
